import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import cytoscape, { type ElementDefinition } from "cytoscape"
import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react"
import { FiPlay, FiRefreshCw } from "react-icons/fi"
import {
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerRoot,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Checkbox } from "@/components/ui/checkbox"

type CytoscapeNode = {
  data: Record<string, any>
}

type CytoscapeEdge = {
  data: Record<string, any>
}

export type CytoscapeGraph = {
  nodes: CytoscapeNode[]
  edges: CytoscapeEdge[]
}

interface CytoscapeNetworkProps {
  data: CytoscapeGraph
  height?: string | number
  layoutName?: string
  showControls?: boolean
  autoRunLayout?: boolean
  fitOnInit?: boolean
}

const CytoscapeNetwork = ({
  data,
  height = "500px",
  layoutName = "cose",
  showControls = true,
  autoRunLayout = false,
  fitOnInit = true,
}: CytoscapeNetworkProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [selectedLayout, setSelectedLayout] = useState<string>(layoutName)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<{ id: string; label?: string } | null>(null)
  const [showLabels, setShowLabels] = useState(false)

  const availableLayouts = [
    "grid",
    "circle",
    "concentric",
    "breadthfirst",
    "cose",
    "concentric-attribute",
  ]

  // Stable elements memo to avoid re-creating when reference equal
  // Compute min/max for numeric mappings
  const nodeMaxRefRange = useMemo(() => {
    const values = (data.nodes || [])
      .map((n) => Number(n.data?.max_OS_ref))
      .filter((v) => Number.isFinite(v)) as number[]
    if (values.length === 0) return { min: 0, max: 1 }
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [data])

  const edgeWeightRange = useMemo(() => {
    const values = (data.edges || [])
      .map((e) => Number(e.data?.weight))
      .filter((v) => Number.isFinite(v)) as number[]
    if (values.length === 0) return { min: 0, max: 1 }
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [data])

  const edgeSimilarityRange = useMemo(() => {
    const values = (data.edges || [])
      .map((e) => Number(e.data?.wang_similarity))
      .filter((v) => Number.isFinite(v)) as number[]
    if (values.length === 0) return { min: 0, max: 1 }
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [data])

  function hexToRgb(hex: string) {
    const n = hex.replace('#', '')
    const bigint = parseInt(n, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return { r, g, b }
  }

  function rgbToHex(r: number, g: number, b: number) {
    const toHex = (v: number) => v.toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  function interpolate(a: number, b: number, t: number) {
    return Math.round(a + (b - a) * t)
  }

  // Three-stop gradient color for edges: #AFAFAF -> #DF65B0 -> #980043
  function edgeColorForSimilarity(value: number, min: number, max: number) {
    const c1 = hexToRgb('#AFAFAF')
    const c2 = hexToRgb('#DF65B0')
    const c3 = hexToRgb('#980043')
    if (max <= min) return '#AFAFAF'
    const mid = (min + max) / 2
    if (value <= mid) {
      const t = (value - min) / (mid - min || 1)
      const r = interpolate(c1.r, c2.r, t)
      const g = interpolate(c1.g, c2.g, t)
      const b = interpolate(c1.b, c2.b, t)
      return rgbToHex(r, g, b)
    }
    const t = (value - mid) / (max - mid || 1)
    const r = interpolate(c2.r, c3.r, t)
    const g = interpolate(c2.g, c3.g, t)
    const b = interpolate(c2.b, c3.b, t)
    return rgbToHex(r, g, b)
  }

  const elements = useMemo<ElementDefinition[]>(() => {
    const nodeElements: ElementDefinition[] = (data.nodes || []).map((n) => ({
      data: n.data,
    }))
    const { min: simMin, max: simMax } = edgeSimilarityRange
    const edgeElements: ElementDefinition[] = (data.edges || []).map((e) => {
      const sim = Number(e.data?.wang_similarity)
      const computedColor = Number.isFinite(sim)
        ? edgeColorForSimilarity(sim, simMin, simMax)
        : '#AFAFAF'
      return {
        data: { ...e.data, edgeColor: computedColor },
      }
    })
    return [...nodeElements, ...edgeElements]
  }, [data, edgeSimilarityRange])

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return

    // Destroy existing instance before creating a new one
    if (cyRef.current) {
      cyRef.current.destroy()
      cyRef.current = null
    }

    // Build dynamic style, including continuous mappings
    const nodeMin = nodeMaxRefRange.min
    const nodeMax = nodeMaxRefRange.max
    const edgeWMin = edgeWeightRange.min
    const edgeWMax = edgeWeightRange.max

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      // Do not run a layout by default to avoid heavy computation
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-opacity": showLabels ? 1 : 0,
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-max-width": "120px",
            "min-zoomed-font-size": 8,
            "border-width": 0,
            // discrete mapping by type via selectors below; default
            "background-color": "#cccccc",
            // size mapping
            width:
              nodeMin === nodeMax
                ? 40
                : `mapData(max_OS_ref, ${nodeMin}, ${nodeMax}, 25, 60)`,
            height:
              nodeMin === nodeMax
                ? 40
                : `mapData(max_OS_ref, ${nodeMin}, ${nodeMax}, 25, 60)`,
          },
        },
        // Highlighted node styling (e.g., nodes containing all selected proteins)
        {
          selector: "node[highlight = 1]",
          style: {
            "border-width": 4,
            "border-color": "#FF9800",
            "border-opacity": 1,
          },
        },
        // Node discrete colors by type
        { selector: "node[type = 'matched_prediction']", style: { "background-color": "#74C476" } },
        { selector: "node[type = 'matched_reference']", style: { "background-color": "#67A9CF" } },
        { selector: "node[type = 'prediction']", style: { "background-color": "#FCCF40" } },
        { selector: "node[type = 'reference']", style: { "background-color": "#D94801" } },
        {
          selector: "edge",
          style: {
            width:
              edgeWMin === edgeWMax
                ? 5
                : `mapData(weight, ${edgeWMin}, ${edgeWMax}, 5, 20)`,
            "line-color": "data(edgeColor)",
            "target-arrow-color": "data(edgeColor)",
            "target-arrow-shape": "none",
            "curve-style": "bezier",
          },
        },
      ],
      wheelSensitivity: 0.2,
    })

    const cy = cyRef.current
    // Click handler for nodes
    const onTapNode = (evt: cytoscape.EventObject) => {
      const node = evt.target
      const id = String(node.data("id"))
      const label = node.data("label") as string | undefined
      setSelectedNode({ id, label })
      setIsDrawerOpen(true)
    }
    cy.on("tap", "node", onTapNode)
    const resizeObserver = new ResizeObserver(() => {
      if (!cy) return
      cy.resize()
      if (fitOnInit) cy.fit(undefined, 20)
    })
    resizeObserver.observe(containerRef.current)

    // Initial fit
    if (fitOnInit) cy.fit(undefined, 20)

    return () => {
      resizeObserver.disconnect()
      cy?.off("tap", "node", onTapNode)
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [elements, layoutName, fitOnInit, nodeMaxRefRange, edgeWeightRange])

  // Toggle labels without re-initializing or re-running layout
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.batch(() => {
      // Explicitly toggle the label content so it can't reappear after layout
      if (showLabels) {
        cy.nodes().style("label", "data(label)")
      } else {
        cy.nodes().style("label", "")
      }
      cy.nodes().style("text-opacity", showLabels ? 1 : 0)
      cy.nodes().style("min-zoomed-font-size", showLabels ? 0 : 8)
    })
  }, [showLabels])

  // If only elements change (same instance), update graph efficiently
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.batch(() => {
      cy.elements().remove()
      cy.add(elements)
      if (autoRunLayout) {
        cy.layout({ name: selectedLayout }).run()
        if (fitOnInit) cy.fit(undefined, 20)
      }
    })
  }, [elements, selectedLayout, autoRunLayout, fitOnInit])

  const handleRunLayout = useCallback(() => {
    const cy = cyRef.current
    if (!cy) return
    if (selectedLayout === "concentric-attribute") {
      const ranks: Record<string, number> = {
        matched_prediction: 4,
        matched_reference: 3,
        prediction: 2,
        reference: 1,
      }
      cy.layout({
        name: "concentric",
        concentric: (node) => {
          const t = String(node.data("type") ?? "")
          return ranks[t] ?? 0
        },
        levelWidth: () => 1,
        animate: false,
        avoidOverlap: true,
        startAngle: 3.1415 / 2,
        sweep: 3.1415 * 2,
      }).run()
    } else {
      cy.layout({ name: selectedLayout as any }).run()
    }
  }, [selectedLayout])

  const handleResetView = useCallback(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.fit(undefined, 20)
  }, [])

  return (
    <Box position="relative" width="100%" height={typeof height === "number" ? `${height}px` : height}>
      {showControls && (
        <HStack
          gap={2}
          position="absolute"
          top={2}
          right={2}
          zIndex={1}
          bg="whiteAlpha.800"
          _dark={{ bg: "blackAlpha.600" }}
          px={2}
          py={1}
          rounded="md"
          boxShadow="md"
        >
          <HStack gap={1}>
            <Text fontSize="xs">Layout</Text>
            <select
              value={selectedLayout}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedLayout(e.target.value)}
              style={{
                fontSize: "12px",
                padding: "2px 6px",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "transparent",
              }}
            >
              {availableLayouts.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </HStack>
          <HStack gap={1}>
            <Checkbox
              checked={showLabels}
              onCheckedChange={({ checked }) => setShowLabels(!!checked)}
            >
              <Text fontSize="xs">Show labels</Text>
            </Checkbox>
          </HStack>
          <Button size="xs" onClick={handleRunLayout}>
            <HStack gap={1}>
              <FiPlay />
              <span>Run layout</span>
            </HStack>
          </Button>
          <Button size="xs" onClick={handleResetView} variant="outline">
            <HStack gap={1}>
              <FiRefreshCw />
              <span>Reset view</span>
            </HStack>
          </Button>
        </HStack>
      )}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", minHeight: typeof height === "number" ? `${height}px` : height }}
      />

      {/* Right-side drawer for node details */}
      <DrawerRoot open={isDrawerOpen} onOpenChange={(e) => setIsDrawerOpen(e.open)} placement="end">
        <DrawerContent maxW="sm">
          <DrawerHeader>
            <DrawerTitle>Node details</DrawerTitle>
            <DrawerCloseTrigger />
          </DrawerHeader>
          <DrawerBody>
            {selectedNode ? (
              <Stack gap={3} fontSize="sm">
                <Box>
                  <Text fontWeight="bold">ID</Text>
                  <Text>{selectedNode.id}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Proteins</Text>
                  <Stack gap={1}>
                    {(selectedNode.label?.split(" ").filter(Boolean) || []).map((p, i) => (
                      <Text key={`${p}-${i}`}>{p}</Text>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            ) : (
              <Text>No node selected</Text>
            )}
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>
    </Box>
  )
}

export default CytoscapeNetwork


