import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Input,
  Spinner,
  Text,
  VStack,
  HStack,
  Tabs,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { FiDownload, FiGlobe, FiChevronUp, FiChevronDown } from "react-icons/fi"

import useCustomToast from "@/hooks/useCustomToast"
import { OpenAPI } from "@/client"
import CytoscapeNetwork from "@/components/Networks/CytoscapeNetwork"
import SigmaNetwork from "@/components/Networks/SigmaNetwork"
import ReagraphNetwork from "@/components/Networks/ReagraphNetwork"
import GraphinNetwork from "@/components/Networks/GraphinNetwork"

// Types for the networks API
interface NetworkInfo {
  name: string
  file_count: number
}

interface CytoscapeNode {
  data: Record<string, any>
}

interface CytoscapeEdge {
  data: Record<string, any>
}

interface CytoscapeGraph {
  nodes: CytoscapeNode[]
  edges: CytoscapeEdge[]
}

const NetworksPage = () => {
  const [networks, setNetworks] = useState<NetworkInfo[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [gdfFiles, setGdfFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<CytoscapeGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [loadingGraph, setLoadingGraph] = useState(false)
  const [graphLoadStep, setGraphLoadStep] = useState<string | null>(null)
  const [panelsCollapsed, setPanelsCollapsed] = useState(false)
  // Component size filter
  const [minComponentSize, setMinComponentSize] = useState<string>("")
  const [maxComponentSize, setMaxComponentSize] = useState<string>("")
  const [filterEnabled, setFilterEnabled] = useState(false)
  const [originalGraphData, setOriginalGraphData] = useState<CytoscapeGraph | null>(null)
  const [selectedOrganism, setSelectedOrganism] = useState<string>("All")
  const [componentSizes, setComponentSizes] = useState<number[]>([])
  const { showErrorToast} = useCustomToast()
  const [renderer, setRenderer] = useState<"cytoscape" | "sigma" | "reagraph">(() => {
    try {
      const stored = localStorage.getItem("network.renderer")
      return (stored === "sigma" || stored === "cytoscape" || stored === "reagraph") ? (stored as any) : "cytoscape"
    } catch {
      return "cytoscape"
    }
  })

  useEffect(() => {
    try { localStorage.setItem("network.renderer", renderer) } catch {}
  }, [renderer])

  // React to changes from Settings dialog or other tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      try {
        if (!e.key || e.key === 'network.renderer') {
          const r = localStorage.getItem('network.renderer') as any
          setRenderer((r === 'sigma' || r === 'cytoscape' || r === 'reagraph') ? r : 'cytoscape')
        }
      } catch {}
    }
    const onCustom = () => onStorage(new StorageEvent('storage', { key: 'network.renderer' }))
    window.addEventListener('storage', onStorage)
    window.addEventListener('network-renderer-changed', onCustom as any)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('network-renderer-changed', onCustom as any)
    }
  }, [])

  // Fetch networks
  const fetchNetworks = async () => {
    setLoading(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const fullUrl = `${baseUrl}/api/v1/networks/`
      console.log("Fetching networks from:", fullUrl)
      const response = await fetch(fullUrl)
      console.log("Response status:", response.status, response.statusText)
      if (!response.ok) {
        console.error("Network response not ok:", response.status, response.statusText)
        throw new Error(`Failed to fetch networks: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      console.log("Networks data received:", data)
      setNetworks(data)
    } catch (error) {
      console.error("Network fetch error:", error)
      showErrorToast("Failed to fetch networks")
    } finally {
      setLoading(false)
    }
  }

  // Fetch GDF files for a network
  const fetchGdfFiles = async (networkName: string) => {
    setLoadingFiles(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const response = await fetch(`${baseUrl}/api/v1/networks/${networkName}/files`)
      if (!response.ok) throw new Error("Failed to fetch GDF files")
      const data = await response.json()
      setGdfFiles(data)
      setSelectedNetwork(networkName)
    } catch (error) {
      showErrorToast("Failed to fetch GDF files")
    } finally {
      setLoadingFiles(false)
    }
  }

  // Fetch and parse GDF file
  const fetchGdfFile = async (networkName: string, filename: string) => {
    setLoadingGraph(true)
    setGraphLoadStep("Requesting file from server…")
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const url = `${baseUrl}/api/v1/networks/${networkName}/gdf/${filename}`
      console.log("Fetching GDF file from:", url)
      const response = await fetch(url)
      console.log("GDF response status:", response.status, response.statusText)
      if (!response.ok) {
        const errorText = await response.text()
        console.error("GDF fetch error:", errorText)
        throw new Error(`Failed to fetch GDF file: ${response.status} ${response.statusText}`)
      }
      setGraphLoadStep("Receiving graph data…")
      const data = await response.json()
      console.log("Received graph data:", data)
      console.log("Nodes count:", data.nodes?.length)
      console.log("Edges count:", data.edges?.length)
      if (data.nodes && data.nodes.length > 0) {
        console.log("Sample node:", data.nodes[0])
      }
      if (data.edges && data.edges.length > 0) {
        console.log("Sample edge:", data.edges[0])
      }
      setGraphLoadStep("Rendering network…")
      
      // Store original data for re-filtering
      setOriginalGraphData(data)
      
      // Compute component sizes for distribution graph
      const nodeIds = new Set<string>()
      data.nodes.forEach((n: any) => {
        const id = n?.data?.id
        if (id) nodeIds.add(String(id))
      })
      const adjacency = new Map<string, Set<string>>()
      nodeIds.forEach(id => adjacency.set(id, new Set()))
      data.edges.forEach((e: any) => {
        const src = e?.data?.source
        const tgt = e?.data?.target
        if (src && tgt) {
          const source = String(src)
          const target = String(tgt)
          adjacency.get(source)?.add(target)
          adjacency.get(target)?.add(source)
        }
      })
      
      const visited = new Set<string>()
      const sizes: number[] = []
      nodeIds.forEach(startId => {
        if (!startId || visited.has(startId)) return
        const queue = [startId]
        let componentSize = 0
        while (queue.length > 0) {
          const id = queue.shift()!
          if (visited.has(id)) continue
          visited.add(id)
          componentSize++
          const neighbors = adjacency.get(id) || new Set()
          neighbors.forEach(neighbor => {
            if (!visited.has(neighbor)) queue.push(neighbor)
          })
        }
        sizes.push(componentSize)
      })
      setComponentSizes(sizes.sort((a, b) => b - a))
      
      // Apply component size filter if enabled
      let filteredData = data
      if (minComponentSize || maxComponentSize) {
        setGraphLoadStep("Filtering components by size…")
        const minSize = minComponentSize ? parseInt(minComponentSize, 10) : 0
        const maxSize = maxComponentSize ? parseInt(maxComponentSize, 10) : Infinity
        
        // Compute connected components
        const nodeIds = new Set<string>()
        data.nodes.forEach((n: any) => {
          const id = n?.data?.id
          if (id) nodeIds.add(String(id))
        })
        const adjacency = new Map<string, Set<string>>()
        
        // Build adjacency list
        nodeIds.forEach(id => adjacency.set(id, new Set()))
        data.edges.forEach((e: any) => {
          const src = e?.data?.source
          const tgt = e?.data?.target
          if (src && tgt) {
            const source = String(src)
            const target = String(tgt)
            adjacency.get(source)?.add(target)
            adjacency.get(target)?.add(source)
          }
        })
        
        // Find components using BFS
        const visited = new Set<string>()
        const components: Set<string>[] = []
        
        nodeIds.forEach(startId => {
          if (!startId || visited.has(startId)) return
          
          const component = new Set<string>()
          const queue = [startId]
          
          while (queue.length > 0) {
            const id = queue.shift()!
            if (visited.has(id)) continue
            
            visited.add(id)
            component.add(id)
            
            const neighbors = adjacency.get(id) || new Set()
            neighbors.forEach(neighbor => {
              if (!visited.has(neighbor)) {
                queue.push(neighbor)
              }
            })
          }
          
          components.push(component)
        })
        
        // Filter components by size
        const validNodeIds = new Set<string>()
        components.forEach(component => {
          if (component.size >= minSize && component.size <= maxSize) {
            component.forEach(id => validNodeIds.add(id))
          }
        })
        
        // Filter nodes and edges
        filteredData = {
          nodes: data.nodes.filter((n: any) => {
            const id = n?.data?.id
            return id && validNodeIds.has(String(id))
          }),
          edges: data.edges.filter((e: any) => {
            const src = e?.data?.source
            const tgt = e?.data?.target
            if (!src || !tgt) return false
            return validNodeIds.has(String(src)) && validNodeIds.has(String(tgt))
          })
        }
        
        console.log(`Filtered from ${data.nodes.length} to ${filteredData.nodes.length} nodes`)
        console.log(`Filtered from ${data.edges.length} to ${filteredData.edges.length} edges`)
        
        // Show warning if filter resulted in 0 nodes
        if (filteredData.nodes.length === 0) {
          showErrorToast(
            `Filter resulted in 0 nodes. No components match the size range (${minSize}-${maxSize === Infinity ? '∞' : maxSize} nodes). Try adjusting the filter.`
          )
          setLoadingGraph(false)
          setGraphLoadStep(null)
          return
        }
        
        setFilterEnabled(true)
      }
      
      setGraphData(filteredData)
      setSelectedFile(filename)
      // Collapse the top panels to focus on the network
      setPanelsCollapsed(true)
    } catch (error) {
      console.error("GDF fetch error:", error)
      showErrorToast(`Failed to fetch GDF file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoadingGraph(false)
      setGraphLoadStep(null)
    }
  }

  // Apply filter to existing loaded network
  const applyFilterToExisting = () => {
    if (!originalGraphData) {
      showErrorToast("No network loaded to filter")
      return
    }

    const minSize = minComponentSize ? parseInt(minComponentSize, 10) : 0
    const maxSize = maxComponentSize ? parseInt(maxComponentSize, 10) : Infinity

    // Use the same filtering logic
    const data = originalGraphData
    const nodeIds = new Set<string>()
    data.nodes.forEach((n: any) => {
      const id = n?.data?.id
      if (id) nodeIds.add(String(id))
    })
    const adjacency = new Map<string, Set<string>>()

    // Build adjacency list
    nodeIds.forEach(id => adjacency.set(id, new Set()))
    data.edges.forEach((e: any) => {
      const src = e?.data?.source
      const tgt = e?.data?.target
      if (src && tgt) {
        const source = String(src)
        const target = String(tgt)
        adjacency.get(source)?.add(target)
        adjacency.get(target)?.add(source)
      }
    })

    // Find components using BFS
    const visited = new Set<string>()
    const components: Set<string>[] = []

    nodeIds.forEach(startId => {
      if (!startId || visited.has(startId)) return

      const component = new Set<string>()
      const queue = [startId]

      while (queue.length > 0) {
        const id = queue.shift()!
        if (visited.has(id)) continue

        visited.add(id)
        component.add(id)

        const neighbors = adjacency.get(id) || new Set()
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            queue.push(neighbor)
          }
        })
      }

      components.push(component)
    })

    // Filter components by size
    const validNodeIds = new Set<string>()
    components.forEach(component => {
      if (component.size >= minSize && component.size <= maxSize) {
        component.forEach(id => validNodeIds.add(id))
      }
    })

    // Filter nodes and edges
    const filteredData = {
      nodes: data.nodes.filter((n: any) => {
        const id = n?.data?.id
        return id && validNodeIds.has(String(id))
      }),
      edges: data.edges.filter((e: any) => {
        const src = e?.data?.source
        const tgt = e?.data?.target
        if (!src || !tgt) return false
        return validNodeIds.has(String(src)) && validNodeIds.has(String(tgt))
      })
    }

    console.log(`Re-filtered from ${data.nodes.length} to ${filteredData.nodes.length} nodes`)

    // Show warning if filter resulted in 0 nodes
    if (filteredData.nodes.length === 0) {
      showErrorToast(
        `Filter resulted in 0 nodes. No components match the size range (${minSize}-${maxSize === Infinity ? '∞' : maxSize} nodes). Try adjusting the filter.`
      )
      return
    }

    setGraphData(filteredData)
    setFilterEnabled(true)
  }

  // Load networks on component mount
  useEffect(() => {
    fetchNetworks()
  }, [])

  return (
    <Container maxW="full">
      <Box pt={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">
            <FiGlobe style={{ display: "inline", marginRight: "8px" }} />
            Networks & GDF Files
          </Heading>
          <HStack gap={2}>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setPanelsCollapsed(true)}
              title="Hide the selection panels above"
              disabled={panelsCollapsed}
            >
              <HStack gap={1}>
                <FiChevronUp />
                <span>Hide selection</span>
              </HStack>
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setPanelsCollapsed(false)
                try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
              }}
              title="Show the selection panels to pick a different network/file"
              disabled={!panelsCollapsed}
            >
              <HStack gap={1}>
                <FiChevronDown />
                <span>Show selection</span>
              </HStack>
            </Button>
          </HStack>
        </Flex>

        {(!panelsCollapsed) && (
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr 1fr" }} gap={6}>
          {/* Networks Panel */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Available Networks</Heading>
            </Card.Header>
            <Card.Body maxH="300px" overflowY="auto">
              {loading ? (
                <Flex justify="center" py={8}>
                  <Spinner />
                </Flex>
              ) : (
                <Tabs.Root
                  value={selectedOrganism}
                  onValueChange={(e) => setSelectedOrganism(e.value)}
                  variant="enclosed"
                  size="sm"
                >
                  <Tabs.List>
                    <Tabs.Trigger value="All">All</Tabs.Trigger>
                    {Array.from(new Set(networks.map(n => {
                      // Extract organism from network name (e.g., "Yeast" from "Yeast/BioGRID")
                      const parts = n.name.split('/')
                      return parts[0] || n.name
                    }))).sort().map(organism => (
                      <Tabs.Trigger key={organism} value={organism}>
                        {organism}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>
                  <Tabs.Content value="All">
                    <VStack align="stretch" gap={2} mt={2}>
                      {networks.map((network) => (
                        <Button
                          key={network.name}
                          variant={selectedNetwork === network.name ? "solid" : "outline"}
                          onClick={() => fetchGdfFiles(network.name)}
                          justifyContent="space-between"
                          size="sm"
                        >
                          <Text>{network.name}</Text>
                          <Text fontSize="xs" opacity={0.7}>
                            {network.file_count} GDF files
                          </Text>
                        </Button>
                      ))}
                    </VStack>
                  </Tabs.Content>
                  {Array.from(new Set(networks.map(n => {
                    const parts = n.name.split('/')
                    return parts[0] || n.name
                  }))).sort().map(organism => (
                    <Tabs.Content key={organism} value={organism}>
                      <VStack align="stretch" gap={2} mt={2}>
                        {networks
                          .filter(n => n.name.startsWith(organism + '/') || n.name === organism)
                          .map((network) => (
                            <Button
                              key={network.name}
                              variant={selectedNetwork === network.name ? "solid" : "outline"}
                              onClick={() => fetchGdfFiles(network.name)}
                              justifyContent="space-between"
                              size="sm"
                            >
                              <Text>{network.name}</Text>
                              <Text fontSize="xs" opacity={0.7}>
                                {network.file_count} GDF files
                              </Text>
                            </Button>
                          ))}
                      </VStack>
                    </Tabs.Content>
                  ))}
                </Tabs.Root>
              )}
            </Card.Body>
          </Card.Root>

          {/* Component Size Filter - Step 2 */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Filter by Size (Optional)</Heading>
            </Card.Header>
            <Card.Body maxH="300px" overflowY="auto">
              <VStack align="stretch" gap={3}>
                <Text fontSize="sm" opacity={0.8}>
                  Filter components by node count when loading a GDF file.
                </Text>
                <VStack align="stretch" gap={2}>
                  <HStack gap={2}>
                    <Text fontSize="sm" fontWeight="500" minW="80px">Min nodes:</Text>
                    <Input
                      placeholder="e.g., 5"
                      value={minComponentSize}
                      onChange={(e) => setMinComponentSize(e.target.value)}
                      size="sm"
                      type="number"
                      min="1"
                    />
                  </HStack>
                  <HStack gap={2}>
                    <Text fontSize="sm" fontWeight="500" minW="80px">Max nodes:</Text>
                    <Input
                      placeholder="e.g., 100"
                      value={maxComponentSize}
                      onChange={(e) => setMaxComponentSize(e.target.value)}
                      size="sm"
                      type="number"
                      min="1"
                    />
                  </HStack>
                </VStack>
                <VStack align="stretch" gap={2}>
                  <Button
                    size="sm"
                    variant="solid"
                    colorScheme="blue"
                    onClick={applyFilterToExisting}
                    disabled={!originalGraphData || (!minComponentSize && !maxComponentSize)}
                    width="full"
                  >
                    Apply Filter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMinComponentSize("")
                      setMaxComponentSize("")
                      setFilterEnabled(false)
                      // Restore original data if available
                      if (originalGraphData) {
                        setGraphData(originalGraphData)
                      }
                    }}
                    disabled={!filterEnabled && !minComponentSize && !maxComponentSize}
                    width="full"
                  >
                    Clear Filter
                  </Button>
                </VStack>
                {(minComponentSize || maxComponentSize) && (
                  <Text fontSize="xs" color="blue.600" _dark={{ color: "blue.400" }}>
                    ✓ Filter ready
                  </Text>
                )}
                
                {/* Component Size Distribution */}
                {componentSizes.length > 0 && (
                  <Box>
                    <Text fontSize="xs" mb={2} opacity={0.8}>
                      Component size distribution ({componentSizes.length} components)
                    </Text>
                    <VStack align="stretch" gap={1}>
                      {(() => {
                        // Group sizes into buckets for visualization
                        const maxSize = Math.max(...componentSizes)
                        const buckets = [
                          { label: '1-5', min: 1, max: 5 },
                          { label: '6-10', min: 6, max: 10 },
                          { label: '11-20', min: 11, max: 20 },
                          { label: '21-50', min: 21, max: 50 },
                          { label: '51-100', min: 51, max: 100 },
                          { label: '100+', min: 101, max: Infinity },
                        ]
                        
                        const counts = buckets.map(bucket => ({
                          ...bucket,
                          count: componentSizes.filter(s => s >= bucket.min && s <= bucket.max).length
                        })).filter(b => b.count > 0)
                        
                        const maxCount = Math.max(...counts.map(b => b.count), 1)
                        
                        return counts.map(bucket => {
                          const pct = Math.max(4, Math.round((bucket.count / maxCount) * 100))
                          return (
                            <Box key={bucket.label}>
                              <HStack justify="space-between" fontSize="xs">
                                <Text>{bucket.label} nodes</Text>
                                <Text>{bucket.count}</Text>
                              </HStack>
                              <Box bg="blackAlpha.200" _dark={{ bg: 'whiteAlpha.200' }} h="4px" rounded="sm">
                                <Box bg="blue.500" h="100%" width={`${pct}%`} rounded="sm" />
                              </Box>
                            </Box>
                          )
                        })
                      })()}
                    </VStack>
                    <Text fontSize="xs" mt={2} opacity={0.6}>
                      Largest: {Math.max(...componentSizes)} nodes
                    </Text>
                  </Box>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* GDF Files Panel */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">
                GDF Files
                {selectedNetwork && ` - ${selectedNetwork}`}
              </Heading>
            </Card.Header>
            <Card.Body maxH="300px" overflowY="auto">
              {loadingFiles ? (
                <Flex justify="center" py={8}>
                  <Spinner />
                </Flex>
              ) : selectedNetwork ? (
                <VStack align="stretch" gap={2}>
                  {gdfFiles.map((filename) => (
                    <Button
                      key={filename}
                      variant={selectedFile === filename ? "solid" : "outline"}
                      onClick={() => fetchGdfFile(selectedNetwork, filename)}
                      justifyContent="space-between"
                      size="sm"
                    >
                      <Text fontSize="sm" truncate>
                        {filename}
                      </Text>
                      <FiDownload />
                    </Button>
                  ))}
                </VStack>
              ) : (
                <Text color="gray.500" textAlign="center" py={8}>
                  Select a network to view GDF files
                </Text>
              )}
            </Card.Body>
          </Card.Root>
          </Grid>
        )}

        {/* Network Visualization */}
        {graphData && (
          <Card.Root mt={6}>
            <Card.Header>
              <Heading size="md">
                Network Visualization
                {selectedFile && ` - ${selectedFile}`}
              </Heading>
            </Card.Header>
            <Card.Body p={0}>
              {loadingGraph ? (
                <Flex direction="column" align="center" py={8} gap={2}>
                  <Spinner />
                  <Text fontSize="sm">{graphLoadStep || "Loading network…"}</Text>
                  {(selectedNetwork || selectedFile) && (
                    <Text fontSize="xs" opacity={0.8}>
                      {selectedNetwork || "-"}
                      {selectedFile ? ` / ${selectedFile}` : ""}
                    </Text>
                  )}
                </Flex>
              ) : (
                (
                  renderer === "cytoscape" ? (
                    <CytoscapeNetwork
                      data={graphData}
                      height="600px"
                      wheelSensitivity={2.5}
                      minZoom={0.1}
                      maxZoom={3}
                      autoRunLayout={false}
                      networkName={selectedNetwork || undefined}
                      filename={selectedFile || undefined}
                    />
                  ) : renderer === "sigma" ? (
                    <SigmaNetwork
                      data={graphData}
                      height="600px"
                    />
                  ) : renderer === "reagraph" ? (
                    <ReagraphNetwork
                      data={graphData}
                      height="600px"
                      networkName={selectedNetwork || undefined}
                      filename={selectedFile || undefined}
                    />
                  ) : (
                    <GraphinNetwork
                      data={graphData}
                      height="600px"
                      networkName={selectedNetwork || undefined}
                      filename={selectedFile || undefined}
                    />
                  )
                )
              )}
            </Card.Body>
          </Card.Root>
        )}
      </Box>
    </Container>
  )
}

export const Route = createFileRoute("/_layout/networks")({
  component: NetworksPage,
})

export default NetworksPage
