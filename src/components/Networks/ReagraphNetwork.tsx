import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Box, Button, HStack, Stack, Text, Tooltip, Badge, Spinner } from "@chakra-ui/react"
import { FiPlay, FiRefreshCw, FiHash, FiPercent, FiSettings, FiTarget } from "react-icons/fi"
import { OpenAPI } from "@/client"
// Reagraph entrypoint
import { GraphCanvas } from "reagraph"

// Keep the same external types/props shape as Cytoscape renderer for drop-in use
type CytoscapeNode = { data: Record<string, any> }
type CytoscapeEdge = { data: Record<string, any> }
export type CytoscapeGraph = { nodes: CytoscapeNode[]; edges: CytoscapeEdge[] }

interface ReagraphNetworkProps {
  data: CytoscapeGraph
  height?: string | number
  layoutName?: string
  showControls?: boolean
  autoRunLayout?: boolean
  fitOnInit?: boolean
  wheelSensitivity?: number
  minZoom?: number
  maxZoom?: number
  networkName?: string
  filename?: string
  disableComponentTapHighlight?: boolean
  initialFavoriteExists?: boolean
  fixedComponentId?: number
}

const ReagraphNetwork = ({
  data,
  height = "600px",
  // Reagraph has its own force/circular layouts; keep a default
  layoutName = "force",
  showControls = true,
  autoRunLayout = true,
  fitOnInit = true,
  networkName,
  filename,
  initialFavoriteExists,
  fixedComponentId,
}: ReagraphNetworkProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Basic UI state we mirror from Cytoscape for a consistent experience
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(false)
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false)
  const [isLayoutRunning] = useState(false)

  type NameMode = "systematic" | "gene"
  const [nameMode, setNameMode] = useState<NameMode>(() => {
    try {
      const raw = localStorage.getItem("network.style")
      const parsed = raw ? JSON.parse(raw) : undefined
      const v = parsed?.nameMode
      return v === "gene" ? "gene" : "systematic"
    } catch {
      return "systematic"
    }
  })

  const [showLabels, setShowLabels] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("network.style")
      const parsed = raw ? JSON.parse(raw) : undefined
      return !!parsed?.showLabels
    } catch {
      return false
    }
  })
  const [nodeScale, setNodeScale] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("network.style")
      const v = raw ? JSON.parse(raw)?.nodeScale : undefined
      const n = typeof v === "number" && Number.isFinite(v) ? v : 1
      return Math.min(2, Math.max(0.1, n))
    } catch {
      return 1
    }
  })
  const [edgeScale, setEdgeScale] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("network.style")
      const v = raw ? JSON.parse(raw)?.edgeScale : undefined
      const n = typeof v === "number" && Number.isFinite(v) ? v : 1
      return Math.min(2, Math.max(0.1, n))
    } catch {
      return 1
    }
  })
  const [selectedNode, setSelectedNode] = useState<{ id: string; label?: string } | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [nodeInfoLoading, setNodeInfoLoading] = useState(false)
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<
    | null
    | {
        componentId?: number
        componentSize?: number
        proteinCounts?: Array<{
          protein: string
          count: number
          type_counts?: Record<string, number>
          type_ratios?: Record<string, number>
          ratio?: number
          other_components?: number
          other_components_network?: number
        }>
      }
  >(null)

  const [savingFavorite, setSavingFavorite] = useState(false)
  const [savedFavoriteOnce, setSavedFavoriteOnce] = useState(() => !!initialFavoriteExists)
  const effectiveComponentId = useMemo<number | null>(() => {
    if (typeof fixedComponentId === "number") return fixedComponentId
    if (typeof selectedNodeInfo?.componentId === "number") return selectedNodeInfo.componentId
    return null
  }, [fixedComponentId, selectedNodeInfo?.componentId])

  useEffect(() => {
    if (initialFavoriteExists) setSavedFavoriteOnce(true)
  }, [initialFavoriteExists])

  // Persist style settings and listen for external updates
  useEffect(() => {
    try {
      const raw = localStorage.getItem("network.style")
      const prev = raw ? JSON.parse(raw) : {}
      const payload = JSON.stringify({
        ...prev,
        showLabels,
        nodeScale,
        edgeScale,
        nameMode,
      })
      localStorage.setItem("network.style", payload)
      window.dispatchEvent(new Event("network-style-changed"))
    } catch {}
  }, [showLabels, nodeScale, edgeScale, nameMode])

  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem("network.style")
        const parsed = raw ? JSON.parse(raw) : {}
        const v = parsed?.nameMode
        setNameMode(v === "gene" ? "gene" : "systematic")
      } catch {}
    }
    window.addEventListener("network-style-changed", handler as any)
    window.addEventListener("storage", handler as any)
    return () => {
      window.removeEventListener("network-style-changed", handler as any)
      window.removeEventListener("storage", handler as any)
    }
  }, [])

  // Colors matching our Cytoscape renderer
  const nodeTypeColors = useMemo(
    () =>
      ({
        matched_prediction: "#74C476",
        matched_reference: "#67A9CF",
        prediction: "#FCCF40",
        reference: "#D94801",
        unknown: "#cccccc",
      } as Record<string, string>),
    []
  )

  const edgeSimilarityRange = useMemo(() => {
    const values = (data.edges || [])
      .map((e) => Number(e.data?.wang_similarity))
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

  const nodeMaxRefRange = useMemo(() => {
    const values = (data.nodes || [])
      .map((n) => Number(n.data?.max_OS_ref))
      .filter((v) => Number.isFinite(v)) as number[]
    if (values.length === 0) return { min: 0, max: 1 }
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [data])

  function hexToRgb(hex: string) {
    const n = hex.replace("#", "")
    const bigint = parseInt(n, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return { r, g, b }
  }
  function rgbToHex(r: number, g: number, b: number) {
    const toHex = (v: number) => v.toString(16).padStart(2, "0")
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }
  function interpolate(a: number, b: number, t: number) {
    return Math.round(a + (b - a) * t)
  }
  function edgeColorForSimilarity(value: number, min: number, max: number) {
    const c1 = hexToRgb("#AFAFAF")
    const c2 = hexToRgb("#DF65B0")
    const c3 = hexToRgb("#980043")
    if (max <= min) return "#AFAFAF"
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

  // Compute nodes/edges for Reagraph; keep labels consistent with nameMode and showLabels
  const graphNodes = useMemo(() => {
    const nodes = (data.nodes || [])
    const min = nodeMaxRefRange.min
    const max = nodeMaxRefRange.max
    const minSize = 25 * nodeScale
    const maxSize = 60 * nodeScale
    const sizeFor = (v: number) => {
      if (!(Number.isFinite(v))) return 40 * nodeScale
      if (min >= max) return 40 * nodeScale
      const t = (v - min) / (max - min)
      return minSize + t * (maxSize - minSize)
    }
    return nodes.map((n, idx) => {
      const id = String(n.data?.id ?? n.data?.name ?? idx)
      const sys = String(n.data?.label_sys ?? n.data?.sys_name ?? n.data?.name ?? id)
      const gene = String(n.data?.label_gene ?? n.data?.gene_name ?? sys)
      const label = nameMode === "gene" ? (gene || sys) : (sys || gene)
      const type = String(n.data?.type ?? n.data?.node_type ?? "unknown")
      const fill = nodeTypeColors[type] || nodeTypeColors.unknown
      const size = sizeFor(Number(n.data?.max_OS_ref))
      return {
        id,
        label: showLabels ? label : "",
        fill,
        size,
        // pass-through original for reference when needed
        data: { ...n.data, label },
      } as any
    })
  }, [data, nameMode, showLabels, nodeMaxRefRange, nodeScale, nodeTypeColors])

  const graphEdges = useMemo(() => {
    const edges = (data.edges || [])
    const wMin = edgeWeightRange.min
    const wMax = edgeWeightRange.max
    const minW = 5 * edgeScale
    const maxW = 20 * edgeScale
    const wFor = (v: number) => {
      if (!(Number.isFinite(v))) return 5 * edgeScale
      if (wMin >= wMax) return 5 * edgeScale
      const t = (v - wMin) / (wMax - wMin)
      return minW + t * (maxW - minW)
    }
    const sMin = edgeSimilarityRange.min
    const sMax = edgeSimilarityRange.max
    return edges.map((e, idx) => {
      const id = String(e.data?.id ?? `${e.data?.source}-${e.data?.target}-${idx}`)
      const source = String(e.data?.source)
      const target = String(e.data?.target)
      const weight = Number(e.data?.weight)
      const sim = Number(e.data?.wang_similarity)
      const color = edgeColorForSimilarity(Number.isFinite(sim) ? sim : sMin, sMin, sMax)
      return {
        id,
        source,
        target,
        size: wFor(weight),
        label: "",
        color,
        data: { ...e.data },
      } as any
    })
  }, [data, edgeScale, edgeWeightRange, edgeSimilarityRange])

  const networkStats = useMemo(() => {
    const nodeCount = graphNodes.length
    const edgeCount = graphEdges.length
    const typeCountsMap = new Map<string, number>()
    graphNodes.forEach((n: any) => {
      const t = String(n?.data?.type ?? n?.data?.node_type ?? "unknown")
      typeCountsMap.set(t, (typeCountsMap.get(t) || 0) + 1)
    })
    const typeCounts = Array.from(typeCountsMap.entries()).map(([type, count]) => ({ type, count }))
    return {
      nodeCount,
      edgeCount,
      weightRange: edgeWeightRange,
      similarityRange: edgeSimilarityRange,
      typeCounts,
    }
  }, [graphNodes, graphEdges, edgeWeightRange, edgeSimilarityRange])

  const onNodeClick = useCallback((nodeId: string) => {
    try {
      const node = graphNodes.find((n: any) => n.id === nodeId)
      const label = String(node?.data?.label ?? node?.label ?? nodeId)
      setSelectedNode({ id: nodeId, label })
      setIsDrawerOpen(true)
      // fetch backend info
      if (nodeId) fetchNodeComponentInfo(nodeId)
    } catch {
      // ignore
    }
  }, [graphNodes])

  const onCanvasClick = useCallback(() => {
    setSelectedNode(null)
    setIsDrawerOpen(false)
  }, [])

  const fetchNodeComponentInfo = useCallback(
    async (nodeId: string) => {
      setNodeInfoLoading(true)
      setSelectedNodeInfo(null)
      try {
        const baseUrl = OpenAPI.BASE || "http://localhost"
        const nodesWithLabel = (data.nodes || []).map((n) => {
          const sys = String(n.data?.label_sys ?? n.data?.sys_name ?? n.data?.name ?? n.data?.id ?? "")
          const gene = String(n.data?.label_gene ?? n.data?.gene_name ?? sys)
          const label = nameMode === "gene" ? (gene || sys) : (sys || gene)
          return { data: { ...n.data, label } }
        })
        const payload: any = {
          node_id: nodeId,
          name_mode: nameMode,
          graph: {
            nodes: nodesWithLabel,
            edges: (data.edges || []).map((e) => ({ data: e.data })),
          },
        }
        if (networkName) payload.network = networkName
        if (filename) payload.filename = filename

        const resp = await fetch(`${baseUrl}/api/v1/networks/components/by-node`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!resp.ok) throw new Error("Backend lookup failed")
        const result = await resp.json()
        const componentId: number | undefined = result.component_id ?? result.componentId
        const componentSize: number | undefined = result.size ?? result.component_size
        const proteinCountsRaw: Array<{
          protein: string
          count: number
          type_counts?: Record<string, number>
          type_ratios?: Record<string, number>
          ratio?: number
          other_components?: number
          other_components_network?: number
        }> = (result.protein_counts ?? result.proteinCounts ?? []) as any
        const proteinCounts = [...proteinCountsRaw].sort(
          (a, b) => (b.count - a.count) || a.protein.localeCompare(b.protein)
        )
        setSelectedNodeInfo({ componentId, componentSize, proteinCounts })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
        setSelectedNodeInfo(null)
      } finally {
        setNodeInfoLoading(false)
      }
    },
    [data, networkName, filename, nameMode]
  )

  const handleResetView = useCallback(() => {
    // GraphCanvas re-centers on prop change; toggling a key is a pragmatic reset
    try {
      setRegraphKey((k) => k + 1)
    } catch {}
  }, [])

  // Reagraph internal key to trigger refit
  const [regraphKey, setRegraphKey] = useState(0)

  return (
    <Box position="relative" height={height} ref={containerRef}>
      {/* Controls */}
      {showControls && (
        <Box
          position="absolute"
          top={2}
          left={2}
          zIndex={2}
          bg="whiteAlpha.900"
          _dark={{ bg: "blackAlpha.700" }}
          px={2}
          py={2}
          rounded="md"
          boxShadow="md"
        >
          <HStack gap={2} wrap="wrap">
              <Button size="xs" onClick={() => setRegraphKey((k) => k + 1)} disabled={isLayoutRunning}>
                <HStack gap={1}>
                  {isLayoutRunning ? <FiRefreshCw /> : <FiPlay />}
                  <Text fontSize="xs">Layout</Text>
                </HStack>
              </Button>
              <Button size="xs" onClick={handleResetView}>
                <HStack gap={1}>
                  <FiTarget />
                  <Text fontSize="xs">Fit</Text>
                </HStack>
              </Button>
              <Button size="xs" variant="outline" onClick={() => setIsStylePanelOpen((v) => !v)}>
                <HStack gap={1}>
                  <FiSettings />
                  <Text fontSize="xs">Style</Text>
                </HStack>
              </Button>
              <Button size="xs" variant="outline" onClick={() => setIsInfoPanelOpen((v) => !v)}>
                <HStack gap={1}>
                  <FiHash />
                  <Text fontSize="xs">Info</Text>
                </HStack>
              </Button>
          </HStack>
        </Box>
      )}

      {isStylePanelOpen && (
        <Box
          position="absolute"
          top={10}
          right={2}
          zIndex={2}
          bg="whiteAlpha.900"
          _dark={{ bg: "blackAlpha.700" }}
          px={3}
          py={2}
          rounded="md"
          boxShadow="lg"
          minW="260px"
        >
          <Stack gap={3}>
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="semibold">Style</Text>
              <Button size="xs" variant="ghost" onClick={() => setIsStylePanelOpen(false)}>Close</Button>
            </HStack>
            <HStack justify="space-between" align="center">
              <Text fontSize="xs" opacity={0.8}>Name mode</Text>
              <select
                value={nameMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNameMode(e.target.value === 'gene' ? 'gene' : 'systematic')}
                style={{ fontSize: '12px', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent' }}
              >
                <option value="systematic">Systematic</option>
                <option value="gene">Gene</option>
              </select>
            </HStack>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(!!e.target.checked)} />
              <Text fontSize="sm">Show labels</Text>
            </label>

            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs">Node size</Text>
                <Text fontSize="xs">{Math.round(nodeScale * 100)}%</Text>
              </HStack>
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={Math.round(nodeScale * 100)}
                onChange={(e) => setNodeScale(Number(e.target.value) / 100)}
                style={{ width: "100%" }}
              />
            </Box>

            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs">Edge width</Text>
                <Text fontSize="xs">{Math.round(edgeScale * 100)}%</Text>
              </HStack>
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={Math.round(edgeScale * 100)}
                onChange={(e) => setEdgeScale(Number(e.target.value) / 100)}
                style={{ width: "100%" }}
              />
            </Box>
          </Stack>
        </Box>
      )}

      {isInfoPanelOpen && (
        <Box
          position="absolute"
          top={10}
          right={2}
          zIndex={2}
          bg="whiteAlpha.900"
          _dark={{ bg: "blackAlpha.700" }}
          px={3}
          py={2}
          rounded="md"
          boxShadow="lg"
          minW="260px"
        >
          <Stack gap={3}>
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="semibold">Info</Text>
              <Button size="xs" variant="ghost" onClick={() => setIsInfoPanelOpen(false)}>Close</Button>
            </HStack>
            <Stack gap={1} fontSize="sm">
              <HStack justify="space-between">
                <Text>Nodes</Text>
                <Text>{networkStats.nodeCount}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Edges</Text>
                <Text>{networkStats.edgeCount}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Weight range</Text>
                <Text>
                  {Number.isFinite(networkStats.weightRange.min) ? networkStats.weightRange.min.toFixed(2) : '-'} – {Number.isFinite(networkStats.weightRange.max) ? networkStats.weightRange.max.toFixed(2) : '-'}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Similarity range</Text>
                <Text>
                  {Number.isFinite(networkStats.similarityRange.min) ? networkStats.similarityRange.min.toFixed(2) : '-'} – {Number.isFinite(networkStats.similarityRange.max) ? networkStats.similarityRange.max.toFixed(2) : '-'}
                </Text>
              </HStack>
            </Stack>
            {networkStats.typeCounts.length > 0 && (
              <Box>
                <Text fontSize="xs" mb={2} opacity={0.8}>Nodes by type</Text>
                <Stack gap={2} fontSize="sm">
                  {(() => {
                    const maxCount = Math.max(
                      ...networkStats.typeCounts.map((t) => t.count),
                      1
                    )
                    return networkStats.typeCounts.map(({ type, count }) => {
                      const pct = Math.max(4, Math.round((count / maxCount) * 100))
                      const color = nodeTypeColors[type] || nodeTypeColors.unknown
                      return (
                        <Box key={type}>
                          <HStack justify="space-between" mb={1}>
                            <Text>{type}</Text>
                            <Text>{count}</Text>
                          </HStack>
                          <Box bg="blackAlpha.200" _dark={{ bg: 'whiteAlpha.200' }} h="6px" rounded="sm">
                            <Box bg={color} h="100%" width={`${pct}%`} rounded="sm" />
                          </Box>
                        </Box>
                      )
                    })
                  })()}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* Drawer-like simple panel for node info */}
      {isDrawerOpen && (
        <Box
          position="absolute"
          right={2}
          bottom={2}
          zIndex={2}
          bg="whiteAlpha.900"
          _dark={{ bg: "blackAlpha.700" }}
          px={3}
          py={3}
          rounded="md"
          boxShadow="lg"
          minW="320px"
          maxW="420px"
          maxH="60%"
          overflowY="auto"
        >
          <Stack gap={3}>
            <HStack justify="space-between" align="center">
              <Text fontWeight="semibold">Node</Text>
              <Button size="xs" variant="ghost" onClick={() => setIsDrawerOpen(false)}>Close</Button>
            </HStack>
            <HStack gap={2}>
              <Badge colorPalette="teal">ID</Badge>
              <Text fontSize="sm">{selectedNode?.id}</Text>
            </HStack>
            {selectedNode?.label && (
              <HStack gap={2}>
                <Badge colorPalette="purple">Label</Badge>
                <Text fontSize="sm">{selectedNode.label}</Text>
              </HStack>
            )}

            <HStack gap={2}>
              <Badge colorPalette="blue">Component</Badge>
              {nodeInfoLoading ? (
                <Spinner size="xs" />
              ) : selectedNodeInfo?.componentId ? (
                <HStack gap={2}>
                  <Text fontSize="sm">#{selectedNodeInfo.componentId}</Text>
                  {typeof selectedNodeInfo.componentSize === 'number' && (
                    <Badge colorPalette="gray">{selectedNodeInfo.componentSize} nodes</Badge>
                  )}
                </HStack>
              ) : (
                <Text fontSize="sm" opacity={0.8}>No data</Text>
              )}
            </HStack>

            {selectedNodeInfo?.proteinCounts && selectedNodeInfo.proteinCounts.length > 0 && (
              <Box>
                <Text fontSize="xs" opacity={0.8} mb={1}>Protein counts (component)</Text>
                <Stack gap={1}>
                  {selectedNodeInfo.proteinCounts.map((p) => (
                    <HStack key={p.protein} justify="space-between">
                      <Text fontSize="xs">{p.protein}</Text>
                      <Badge>{p.count}</Badge>
                    </HStack>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* Graph Canvas */}
      <GraphCanvas
        key={regraphKey}
        nodes={graphNodes as any}
        edges={graphEdges as any}
        layoutType={layoutName === 'circle' ? 'circular' : 'forceDirected2d' as any}
        labelType={"all" as any}
        onNodeClick={(n: any) => onNodeClick(n?.id ?? n)}
        onCanvasClick={() => onCanvasClick()}
        // style={{ width: "100%", height: "100%" }}
      />
    </Box>
  )
}

export default memo(ReagraphNetwork)
