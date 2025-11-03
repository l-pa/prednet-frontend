import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Box, Button, HStack, Stack, Text, Badge, Spinner } from "@chakra-ui/react"
import { FiPlay, FiRefreshCw, FiHash, FiSettings, FiTarget } from "react-icons/fi"
import * as GraphinNS from "@antv/graphin"
import { OpenAPI } from "@/client"

type CytoscapeNode = { data: Record<string, any> }
type CytoscapeEdge = { data: Record<string, any> }
export type CytoscapeGraph = { nodes: CytoscapeNode[]; edges: CytoscapeEdge[] }

interface GraphinNetworkProps {
  data: CytoscapeGraph
  height?: string | number
  layoutName?: "force" | "grid" | "circle"
  showControls?: boolean
  autoRunLayout?: boolean
  fitOnInit?: boolean
  networkName?: string
  filename?: string
}

const GraphinNetwork = ({
  data,
  height = "600px",
  layoutName = "force",
  showControls = true,
  autoRunLayout = true,
  fitOnInit = true,
  networkName,
  filename,
}: GraphinNetworkProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(false)
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false)
  const [isLayoutRunning] = useState(false)
  const [rekey, setRekey] = useState(0)

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
      return !!JSON.parse(localStorage.getItem("network.style") || "{}")?.showLabels
    } catch { return false }
  })
  const [nodeScale, setNodeScale] = useState<number>(() => {
    try { const v = Number(JSON.parse(localStorage.getItem("network.style") || "{}")?.nodeScale); return Number.isFinite(v) ? Math.min(2, Math.max(0.1, v)) : 1 } catch { return 1 }
  })
  const [edgeScale, setEdgeScale] = useState<number>(() => {
    try { const v = Number(JSON.parse(localStorage.getItem("network.style") || "{}")?.edgeScale); return Number.isFinite(v) ? Math.min(2, Math.max(0.1, v)) : 1 } catch { return 1 }
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("network.style")
      const prev = raw ? JSON.parse(raw) : {}
      localStorage.setItem("network.style", JSON.stringify({ ...prev, nameMode, showLabels, nodeScale, edgeScale }))
      window.dispatchEvent(new Event("network-style-changed"))
    } catch {}
  }, [nameMode, showLabels, nodeScale, edgeScale])

  useEffect(() => {
    const handler = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem("network.style") || "{}")
        setNameMode(parsed?.nameMode === "gene" ? "gene" : "systematic")
      } catch {}
    }
    window.addEventListener("network-style-changed", handler as any)
    window.addEventListener("storage", handler as any)
    return () => {
      window.removeEventListener("network-style-changed", handler as any)
      window.removeEventListener("storage", handler as any)
    }
  }, [])

  const nodeTypeColors = useMemo(() => ({
    matched_prediction: "#74C476",
    matched_reference: "#67A9CF",
    prediction: "#FCCF40",
    reference: "#D94801",
    unknown: "#cccccc",
  } as Record<string, string>), [])

  const edgeSimilarityRange = useMemo(() => {
    const values = (data.edges || []).map(e => Number(e.data?.wang_similarity)).filter(Number.isFinite) as number[]
    if (values.length === 0) return { min: 0, max: 1 }
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [data])
  const edgeWeightRange = useMemo(() => {
    const values = (data.edges || []).map(e => Number(e.data?.weight)).filter(Number.isFinite) as number[]
    if (values.length === 0) return { min: 0, max: 1 }
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [data])
  const nodeMaxRefRange = useMemo(() => {
    const values = (data.nodes || []).map(n => Number(n.data?.max_OS_ref)).filter(Number.isFinite) as number[]
    if (values.length === 0) return { min: 0, max: 1 }
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [data])

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const simColor = (v: number, min: number, max: number) => {
    const c1 = [0xaf, 0xaf, 0xaf]
    const c2 = [0xdf, 0x65, 0xb0]
    const c3 = [0x98, 0x00, 0x43]
    if (max <= min) return "#AFAFAF"
    const mid = (min + max) / 2
    const mix = (cA: number[], cB: number[], t: number) => `#${[0,1,2].map(i => Math.round(lerp(cA[i], cB[i], t)).toString(16).padStart(2,'0')).join('')}`
    if (v <= mid) return mix(c1, c2, (v - min) / (mid - min || 1))
    return mix(c2, c3, (v - mid) / (max - mid || 1))
  }

  const graphData = useMemo(() => {
    const min = nodeMaxRefRange.min, max = nodeMaxRefRange.max
    const sizeFor = (val: number) => {
      if (!(Number.isFinite(val))) return 40 * nodeScale
      if (min >= max) return 40 * nodeScale
      const t = (val - min) / (max - min)
      return 25 * nodeScale + t * (60 * nodeScale - 25 * nodeScale)
    }
    const wMin = edgeWeightRange.min, wMax = edgeWeightRange.max
    const widthFor = (val: number) => {
      if (!(Number.isFinite(val))) return 5 * edgeScale
      if (wMin >= wMax) return 5 * edgeScale
      const t = (val - wMin) / (wMax - wMin)
      return 5 * edgeScale + t * (20 * edgeScale - 5 * edgeScale)
    }
    const sMin = edgeSimilarityRange.min, sMax = edgeSimilarityRange.max

    const nodes = (data.nodes || []).map((n, i) => {
      const id = String(n.data?.id ?? n.data?.name ?? i)
      const sys = String(n.data?.label_sys ?? n.data?.sys_name ?? n.data?.name ?? id)
      const gene = String(n.data?.label_gene ?? n.data?.gene_name ?? sys)
      const label = nameMode === 'gene' ? (gene || sys) : (sys || gene)
      const type = String(n.data?.type ?? n.data?.node_type ?? 'unknown')
      const fill = nodeTypeColors[type] || nodeTypeColors.unknown
      const size = sizeFor(Number(n.data?.max_OS_ref))
      return {
        id,
        data: { ...n.data, label },
        style: {
          keyshape: { size, fill },
          label: { value: showLabels ? label : '', fill: '#222', fontSize: 12 },
        },
      }
    })

    const edges = (data.edges || []).map((e, i) => {
      const id = String(e.data?.id ?? `${e.data?.source}-${e.data?.target}-${i}`)
      const source = String(e.data?.source)
      const target = String(e.data?.target)
      const weight = Number(e.data?.weight)
      const sim = Number(e.data?.wang_similarity)
      const stroke = simColor(Number.isFinite(sim) ? sim : sMin, sMin, sMax)
      return {
        id,
        source,
        target,
        style: {
          keyshape: { lineWidth: widthFor(weight), stroke },
        },
      }
    })

    return { nodes, edges }
  }, [data, nameMode, showLabels, nodeScale, edgeScale, nodeMaxRefRange, edgeWeightRange, edgeSimilarityRange, nodeTypeColors])

  const onReady = useCallback((graph: any) => {
    // Fit on init
    if (fitOnInit) {
      try { graph.fitView(20) } catch {}
    }
    graph.on('node:click', (evt: any) => {
      try {
        const id = String((evt?.item?.getID && evt.item.getID()) || (evt?.item?.getModel && (evt.item.getModel() as any)?.id) || "")
        if (!id) return
        const node = graphData.nodes.find((n: any) => n.id === id)
        const label = String(node?.data?.label ?? (node as any)?.style?.label?.value ?? id)
        setSelectedNode({ id, label })
        setIsDrawerOpen(true)
        fetchNodeComponentInfo(id)
      } catch {}
    })
    graph.on('canvas:click', () => {
      setSelectedNode(null)
      setIsDrawerOpen(false)
    })
  }, [fitOnInit, graphData, fetchNodeComponentInfo])

  const fetchNodeComponentInfo = useCallback(async (nodeId: string) => {
    setNodeInfoLoading(true)
    setSelectedNodeInfo(null)
    try {
      const baseUrl = OpenAPI.BASE || 'http://localhost'
      const nodesWithLabel = (data.nodes || []).map((n) => {
        const sys = String(n.data?.label_sys ?? n.data?.sys_name ?? n.data?.name ?? n.data?.id ?? '')
        const gene = String(n.data?.label_gene ?? n.data?.gene_name ?? sys)
        const label = nameMode === 'gene' ? (gene || sys) : (sys || gene)
        return { data: { ...n.data, label } }
      })
      const payload: any = {
        node_id: nodeId,
        name_mode: nameMode,
        graph: { nodes: nodesWithLabel, edges: (data.edges || []).map(e => ({ data: e.data })) },
      }
      if (networkName) payload.network = networkName
      if (filename) payload.filename = filename

      const resp = await fetch(`${baseUrl}/api/v1/networks/components/by-node`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!resp.ok) throw new Error('Backend lookup failed')
      const result = await resp.json()
      const componentId: number | undefined = result.component_id ?? result.componentId
      const componentSize: number | undefined = result.size ?? result.component_size
      const proteinCountsRaw = (result.protein_counts ?? result.proteinCounts ?? []) as Array<any>
      const proteinCounts = [...proteinCountsRaw].sort((a, b) => (b.count - a.count) || a.protein.localeCompare(b.protein))
      setSelectedNodeInfo({ componentId, componentSize, proteinCounts })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      setSelectedNodeInfo(null)
    } finally {
      setNodeInfoLoading(false)
    }
  }, [data, networkName, filename, nameMode])

  const handleResetView = useCallback(() => setRekey(k => k + 1), [])

  const layout = useMemo(() => {
    if (layoutName === 'circle') return { type: 'circular' }
    if (layoutName === 'grid') return { type: 'grid' }
    return { type: 'graphin-force' }
  }, [layoutName])

  return (
    <Box position="relative" height={height} ref={containerRef}>
      {showControls && (
        <Box position="absolute" top={2} left={2} zIndex={2} bg="whiteAlpha.900" _dark={{ bg: 'blackAlpha.700' }} px={2} py={2} rounded="md" boxShadow="md">
          <HStack gap={2} wrap="wrap">
            <Button size="xs" onClick={() => setRekey(k => k + 1)} disabled={isLayoutRunning}>
              <HStack gap={1}><FiPlay /><Text fontSize="xs">Layout</Text></HStack>
            </Button>
            <Button size="xs" onClick={handleResetView}>
              <HStack gap={1}><FiTarget /><Text fontSize="xs">Fit</Text></HStack>
            </Button>
            <Button size="xs" variant="outline" onClick={() => setIsStylePanelOpen(v => !v)}>
              <HStack gap={1}><FiSettings /><Text fontSize="xs">Style</Text></HStack>
            </Button>
            <Button size="xs" variant="outline" onClick={() => setIsInfoPanelOpen(v => !v)}>
              <HStack gap={1}><FiHash /><Text fontSize="xs">Info</Text></HStack>
            </Button>
          </HStack>
        </Box>
      )}

      {isStylePanelOpen && (
        <Box position="absolute" top={10} right={2} zIndex={2} bg="whiteAlpha.900" _dark={{ bg: 'blackAlpha.700' }} px={3} py={2} rounded="md" boxShadow="lg" minW="260px">
          <Stack gap={3}>
            <HStack justify="space-between"><Text fontSize="sm" fontWeight="semibold">Style</Text><Button size="xs" variant="ghost" onClick={() => setIsStylePanelOpen(false)}>Close</Button></HStack>
            <HStack justify="space-between" align="center">
              <Text fontSize="xs" opacity={0.8}>Name mode</Text>
              <select value={nameMode} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNameMode(e.target.value === 'gene' ? 'gene' : 'systematic')} style={{ fontSize: '12px', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent' }}>
                <option value="systematic">Systematic</option>
                <option value="gene">Gene</option>
              </select>
            </HStack>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(!!e.target.checked)} />
              <Text fontSize="sm">Show labels</Text>
            </label>
            <Box>
              <HStack justify="space-between" mb={1}><Text fontSize="xs">Node size</Text><Text fontSize="xs">{Math.round(nodeScale * 100)}%</Text></HStack>
              <input type="range" min={10} max={200} step={5} value={Math.round(nodeScale * 100)} onChange={(e) => setNodeScale(Number(e.target.value) / 100)} style={{ width: '100%' }} />
            </Box>
            <Box>
              <HStack justify="space-between" mb={1}><Text fontSize="xs">Edge width</Text><Text fontSize="xs">{Math.round(edgeScale * 100)}%</Text></HStack>
              <input type="range" min={10} max={200} step={5} value={Math.round(edgeScale * 100)} onChange={(e) => setEdgeScale(Number(e.target.value) / 100)} style={{ width: '100%' }} />
            </Box>
          </Stack>
        </Box>
      )}

      {isInfoPanelOpen && (
        <Box position="absolute" top={10} right={2} zIndex={2} bg="whiteAlpha.900" _dark={{ bg: 'blackAlpha.700' }} px={3} py={2} rounded="md" boxShadow="lg" minW="260px">
          <Stack gap={3}>
            <HStack justify="space-between"><Text fontSize="sm" fontWeight="semibold">Info</Text><Button size="xs" variant="ghost" onClick={() => setIsInfoPanelOpen(false)}>Close</Button></HStack>
            <Stack gap={1} fontSize="sm">
              <HStack justify="space-between"><Text>Nodes</Text><Text>{graphData.nodes.length}</Text></HStack>
              <HStack justify="space-between"><Text>Edges</Text><Text>{graphData.edges.length}</Text></HStack>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Drawer-like info */}
      {isDrawerOpen && (
        <Box position="absolute" right={2} bottom={2} zIndex={2} bg="whiteAlpha.900" _dark={{ bg: 'blackAlpha.700' }} px={3} py={3} rounded="md" boxShadow="lg" minW="320px" maxW="420px" maxH="60%" overflowY="auto">
          <Stack gap={3}>
            <HStack justify="space-between" align="center"><Text fontWeight="semibold">Node</Text><Button size="xs" variant="ghost" onClick={() => setIsDrawerOpen(false)}>Close</Button></HStack>
            <HStack gap={2}><Badge colorPalette="teal">ID</Badge><Text fontSize="sm">{selectedNode?.id}</Text></HStack>
            {selectedNode?.label && (<HStack gap={2}><Badge colorPalette="purple">Label</Badge><Text fontSize="sm">{selectedNode.label}</Text></HStack>)}
            <HStack gap={2}>
              <Badge colorPalette="blue">Component</Badge>
              {nodeInfoLoading ? (<Spinner size="xs" />) : selectedNodeInfo?.componentId ? (
                <HStack gap={2}><Text fontSize="sm">#{selectedNodeInfo.componentId}</Text>{typeof selectedNodeInfo.componentSize === 'number' && (<Badge colorPalette="gray">{selectedNodeInfo.componentSize} nodes</Badge>)}</HStack>
              ) : (<Text fontSize="sm" opacity={0.8}>No data</Text>)}
            </HStack>
            {selectedNodeInfo?.proteinCounts && selectedNodeInfo.proteinCounts.length > 0 && (
              <Box>
                <Text fontSize="xs" opacity={0.8} mb={1}>Protein counts (component)</Text>
                <Stack gap={1}>
                  {selectedNodeInfo.proteinCounts.map((p) => (<HStack key={p.protein} justify="space-between"><Text fontSize="xs">{p.protein}</Text><Badge>{p.count}</Badge></HStack>))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {(() => {
        const Comp = ((GraphinNS as any).default || (GraphinNS as any)) as React.ComponentType<any>
        return (
          <Comp
            key={rekey}
            data={graphData as any}
            layout={layout as any}
            onReady={onReady as any}
            style={{ width: '100%', height: '100%' }}
          />
        )
      })()}
    </Box>
  )
}

export default memo(GraphinNetwork)
