import { useEffect, useRef, useState, memo, useMemo } from "react"
import { Box, Stack, Text, Button, HStack } from "@chakra-ui/react"
import cytoscape, { type Core, type ElementDefinition } from "cytoscape"
import dagre from "cytoscape-dagre"
import type { GOTermWithProteins } from "@/utils/goTermsUtils"
import { useGOHierarchy } from "@/hooks/useGOHierarchy"

// Register dagre layout
cytoscape.use(dagre)

interface GOTermDAGProps {
  terms: GOTermWithProteins[]
  domain: string
  allProteins: string[]
  onTermClick?: (termId: string) => void
}

/**
 * GO Term DAG Visualization
 * 
 * Renders a directed acyclic graph (DAG) showing the hierarchical relationships
 * between GO terms. Fetches complete GO hierarchy from QuickGO API and displays
 * the full parent-child relationships.
 */
const GOTermDAG = memo(function GOTermDAG({
  terms,
  domain,
  allProteins,
  onTermClick,
}: GOTermDAGProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [isLayouting, setIsLayouting] = useState(false)
  const [nodeCount, setNodeCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)

  // Extract GO IDs from terms
  const goIds = useMemo(() => terms.map(t => t.id), [terms])

  // Fetch GO hierarchy from QuickGO API
  const { data: hierarchyData, isLoading: isLoadingHierarchy, error: hierarchyError } = useGOHierarchy(
    goIds,
    true, // Include ancestors
    goIds.length > 0
  )

  // Debug logging
  useEffect(() => {
    console.log("GOTermDAG - GO IDs:", goIds)
    console.log("GOTermDAG - Hierarchy data:", hierarchyData)
    console.log("GOTermDAG - Loading:", isLoadingHierarchy)
    console.log("GOTermDAG - Error:", hierarchyError)
    
    if (hierarchyData?.terms) {
      console.log("GOTermDAG - Terms in hierarchy:", Object.keys(hierarchyData.terms))
      Object.entries(hierarchyData.terms).forEach(([id, term]) => {
        console.log(`  ${id}: parents=${term.parents.length}, children=${term.children.length}`)
      })
    }
  }, [goIds, hierarchyData, isLoadingHierarchy, hierarchyError])

  // Build cytoscape elements from GO terms with hierarchy
  const buildElements = useMemo((): ElementDefinition[] => {
    const elements: ElementDefinition[] = []
    const termMap = new Map(terms.map(t => [t.id, t]))
    const addedNodes = new Set<string>()
    const addedEdges = new Set<string>()

    // If we have hierarchy data, use it; otherwise fall back to term.parents
    const hierarchyTerms = hierarchyData?.terms || {}

    // Add all protein-annotated terms as nodes
    for (const term of terms) {
      if (!addedNodes.has(term.id)) {
        const isShared = term.proteins.length === allProteins.length
        const proteinCount = term.proteins.length
        
        // Create label with protein names
        const proteinList = term.proteins.join(", ")
        const label = `${term.name}\n(${term.id})\n[${proteinList}]`
        
        elements.push({
          data: {
            id: term.id,
            label,
            proteinCount,
            isShared,
            proteins: term.proteins,
            evidence: term.evidence,
            pValue: term.p_value,
            isAnnotated: true, // This term is from protein annotations
          },
        })
        addedNodes.add(term.id)
      }
    }

    // Add ancestor nodes from hierarchy (if not already added)
    if (hierarchyData) {
      for (const [termId, hierarchyTerm] of Object.entries(hierarchyTerms)) {
        if (!addedNodes.has(termId)) {
          // This is an ancestor term not directly annotated to proteins
          elements.push({
            data: {
              id: termId,
              label: `${hierarchyTerm.name}\n(${termId})`,
              proteinCount: 0,
              isShared: false,
              proteins: [],
              isAnnotated: false, // This is an ancestor term
              isAncestor: true,
            },
          })
          addedNodes.add(termId)
        }
      }
    }

    // Add edges using hierarchy data with relationship types
    if (hierarchyData) {
      for (const [termId, hierarchyTerm] of Object.entries(hierarchyTerms)) {
        // Use parents to create edges (child -> parent direction)
        const relations = hierarchyTerm.parents || []
        
        // Add edges with relationship information
        for (const rel of relations) {
          // Handle both old format (string) and new format (GORelation object)
          const parentId = typeof rel === 'string' ? rel : rel.id
          const relation = typeof rel === 'string' ? 'is_a' : (rel.relation || 'is_a')
          
          if (addedNodes.has(parentId)) {
            // Create a unique edge ID that includes both direction and relation
            // This prevents duplicate edges between the same nodes
            const edgeId = `${termId}-${parentId}-${relation}`
            const reverseEdgeId = `${parentId}-${termId}-${relation}`
            
            // Only add if neither direction exists
            if (!addedEdges.has(edgeId) && !addedEdges.has(reverseEdgeId)) {
              elements.push({
                data: {
                  id: edgeId,
                  source: termId,
                  target: parentId,
                  relation: relation,
                  label: relation.replace(/_/g, ' '),
                },
              })
              addedEdges.add(edgeId)
            }
          }
        }
      }
    } else {
      // Fallback: use parents from term annotations
      for (const term of terms) {
        for (const parentId of term.parents) {
          if (termMap.has(parentId)) {
            const edgeId = `${term.id}-${parentId}`
            if (!addedEdges.has(edgeId)) {
              elements.push({
                data: {
                  id: edgeId,
                  source: term.id,
                  target: parentId,
                  relation: 'is_a',
                  label: 'is a',
                },
              })
              addedEdges.add(edgeId)
            }
          }
        }
      }
    }

    return elements
  }, [terms, hierarchyData])

  // Initialize and render cytoscape
  useEffect(() => {
    if (!containerRef.current || terms.length === 0) return

    setNodeCount(buildElements.filter(e => !e.data.source).length)
    setEdgeCount(buildElements.filter(e => e.data.source).length)

    // Initialize cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele: any) => {
              const isAnnotated = ele.data("isAnnotated")
              const isShared = ele.data("isShared")
              
              if (!isAnnotated) {
                // Ancestor terms (not directly annotated)
                return "#e2e8f0" // gray.200
              }
              
              return isShared ? "#4299e1" : "#90cdf4"
            },
            "border-width": 2,
            "border-color": (ele: any) => {
              const isAnnotated = ele.data("isAnnotated")
              return isAnnotated ? "#2c5282" : "#a0aec0" // gray.500 for ancestors
            },
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-max-width": "180px",
            "font-size": "9px",
            color: "#1a202c",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.9,
            "text-background-padding": "4px",
            "line-height": 1.2,
            width: (ele: any) => {
              const isAnnotated = ele.data("isAnnotated")
              const proteinCount = ele.data("proteinCount") || 0
              
              if (!isAnnotated) {
                return 60 // Fixed size for ancestor terms
              }
              
              // Larger nodes to accommodate protein names
              return Math.max(80, Math.min(150, 80 + proteinCount * 10))
            },
            height: (ele: any) => {
              const isAnnotated = ele.data("isAnnotated")
              const proteinCount = ele.data("proteinCount") || 0
              
              if (!isAnnotated) {
                return 60 // Fixed size for ancestor terms
              }
              
              // Larger nodes to accommodate protein names
              return Math.max(80, Math.min(150, 80 + proteinCount * 10))
            },
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 4,
            "border-color": "#2d3748",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": (ele: any) => {
              const relation = ele.data("relation")
              switch (relation) {
                case "is_a":
                  return "#cbd5e0" // gray
                case "part_of":
                  return "#90cdf4" // blue
                case "regulates":
                  return "#fbb6ce" // pink
                case "positively_regulates":
                  return "#9ae6b4" // green
                case "negatively_regulates":
                  return "#fc8181" // red
                default:
                  return "#e2e8f0" // light gray
              }
            },
            "target-arrow-color": (ele: any) => {
              const relation = ele.data("relation")
              switch (relation) {
                case "is_a":
                  return "#cbd5e0"
                case "part_of":
                  return "#90cdf4"
                case "regulates":
                  return "#fbb6ce"
                case "positively_regulates":
                  return "#9ae6b4"
                case "negatively_regulates":
                  return "#fc8181"
                default:
                  return "#e2e8f0"
              }
            },
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 1.5,
            label: "data(label)",
            "font-size": "8px",
            "text-rotation": "autorotate",
            "text-margin-y": -8,
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.8,
            "text-background-padding": "2px",
            color: "#2d3748",
          },
        },
        {
          selector: "edge:selected",
          style: {
            "line-color": "#4299e1",
            "target-arrow-color": "#4299e1",
            width: 3,
          },
        },
      ],
      layout: { name: "preset" },
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.2,
    })

    cyRef.current = cy

    // Handle node clicks
    cy.on("tap", "node", (evt) => {
      const node = evt.target
      const termId = node.data("id")
      if (onTermClick) {
        onTermClick(termId)
      }
    })

    // Run layout
    setIsLayouting(true)
    const layout = cy.layout({
      name: "dagre",
      rankDir: "BT", // Bottom to top (children at bottom, parents at top)
      nodeSep: 80, // Increased spacing for larger nodes
      rankSep: 120, // Increased vertical spacing
      padding: 40,
      animate: true,
      animationDuration: 500,
      fit: true,
    } as any)

    layout.on("layoutstop", () => {
      setIsLayouting(false)
    })

    layout.run()

    // Cleanup
    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [buildElements, allProteins, onTermClick])

  // Handle fit button
  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50)
    }
  }

  // Handle re-layout button
  const handleRelayout = () => {
    if (cyRef.current) {
      setIsLayouting(true)
      const layout = cyRef.current.layout({
        name: "dagre",
        rankDir: "BT",
        nodeSep: 80, // Increased spacing for larger nodes
        rankSep: 120, // Increased vertical spacing
        padding: 40,
        animate: true,
        animationDuration: 500,
        fit: true,
      } as any)

      layout.on("layoutstop", () => {
        setIsLayouting(false)
      })

      layout.run()
    }
  }

  if (terms.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Text fontSize="sm" opacity={0.7}>
          No GO terms to visualize
        </Text>
      </Box>
    )
  }

  if (isLoadingHierarchy) {
    return (
      <Box p={4} textAlign="center">
        <Text fontSize="sm" opacity={0.7}>
          Loading GO hierarchy from QuickGO...
        </Text>
      </Box>
    )
  }

  if (hierarchyError) {
    return (
      <Box p={4} textAlign="center">
        <Text fontSize="sm" color="orange.500">
          ⚠️ Could not fetch GO hierarchy. Showing basic relationships.
        </Text>
        <Text fontSize="xs" opacity={0.6} mt={2}>
          {String(hierarchyError)}
        </Text>
      </Box>
    )
  }

  return (
    <Stack gap={2}>
      {/* Controls */}
      <HStack justify="space-between" px={2}>
        <HStack gap={2} fontSize="xs" opacity={0.7}>
          <Text>
            {nodeCount} term{nodeCount !== 1 ? "s" : ""}
          </Text>
          <Text>•</Text>
          <Text>
            {edgeCount} relationship{edgeCount !== 1 ? "s" : ""}
          </Text>
        </HStack>
        <HStack gap={2}>
          <Button
            size="xs"
            variant="outline"
            onClick={handleFit}
            disabled={isLayouting}
          >
            Fit View
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={handleRelayout}
            loading={isLayouting}
          >
            {isLayouting ? "Layouting..." : "Re-layout"}
          </Button>
        </HStack>
      </HStack>

      {/* Legend */}
      <Stack gap={2} px={2} fontSize="xs" opacity={0.8}>
        <Text fontWeight="semibold">Nodes:</Text>
        <HStack gap={4} flexWrap="wrap">
          <HStack gap={1}>
            <Box
              w="12px"
              h="12px"
              bg="#4299e1"
              borderRadius="full"
              borderWidth="1px"
              borderColor="#2c5282"
            />
            <Text>Shared by all</Text>
          </HStack>
          <HStack gap={1}>
            <Box
              w="12px"
              h="12px"
              bg="#90cdf4"
              borderRadius="full"
              borderWidth="1px"
              borderColor="#2c5282"
            />
            <Text>Partial overlap</Text>
          </HStack>
          <HStack gap={1}>
            <Box
              w="12px"
              h="12px"
              bg="#e2e8f0"
              borderRadius="full"
              borderWidth="1px"
              borderColor="#a0aec0"
            />
            <Text>Ancestor term</Text>
          </HStack>
        </HStack>
        
        <Text fontWeight="semibold" mt={2}>Relationships:</Text>
        <HStack gap={4} flexWrap="wrap">
          <HStack gap={1}>
            <Box w="20px" h="2px" bg="#cbd5e0" />
            <Text>is a</Text>
          </HStack>
          <HStack gap={1}>
            <Box w="20px" h="2px" bg="#90cdf4" />
            <Text>part of</Text>
          </HStack>
          <HStack gap={1}>
            <Box w="20px" h="2px" bg="#fbb6ce" />
            <Text>regulates</Text>
          </HStack>
          <HStack gap={1}>
            <Box w="20px" h="2px" bg="#9ae6b4" />
            <Text>positively regulates</Text>
          </HStack>
          <HStack gap={1}>
            <Box w="20px" h="2px" bg="#fc8181" />
            <Text>negatively regulates</Text>
          </HStack>
        </HStack>
      </Stack>

      {/* Cytoscape container */}
      <Box
        ref={containerRef}
        w="full"
        h="600px"
        borderWidth="1px"
        borderRadius="md"
        borderColor="gray.200"
        bg="white"
        _dark={{ borderColor: "gray.700", bg: "gray.900" }}
        position="relative"
      />

      {/* Instructions */}
      <Text fontSize="xs" opacity={0.6} px={2}>
        Click nodes to view details • Scroll to zoom • Drag to pan • Arrows point from child to parent terms
      </Text>
    </Stack>
  )
})

export default GOTermDAG
