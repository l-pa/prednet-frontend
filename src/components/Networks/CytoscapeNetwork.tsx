import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import cytoscape, { type ElementDefinition } from "cytoscape"
// Register worker-capable/efficient layouts when available
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fcose = require('cytoscape-fcose')
  if (fcose) {
    try { (cytoscape as any).use(fcose) } catch {}
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const coseBilkent = require('cytoscape-cose-bilkent')
  if (coseBilkent) {
    try { (cytoscape as any).use(coseBilkent) } catch {}
  }
} catch {}
import { Box, Button, HStack, Stack, Text, Tooltip, Badge, Spinner } from "@chakra-ui/react"
import { FiPlay, FiRefreshCw, FiHash, FiPercent, FiSettings, FiTarget } from "react-icons/fi"
import {
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerRoot,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Checkbox } from "@/components/ui/checkbox"
import { OpenAPI } from "@/client"
import CytoscapeToolbar from "@/components/Networks/Cytoscape/CytoscapeToolbar"
import CytoscapeSidebar from "@/components/Networks/Cytoscape/CytoscapeSidebar"

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
  wheelSensitivity?: number
  minZoom?: number
  maxZoom?: number
  // Context for backend computations
  networkName?: string
  filename?: string
  // When true, disable default tap highlight of entire component (used in subgraph view)
  disableComponentTapHighlight?: boolean
  // Optional hint from parent if this component is already a favorite
  initialFavoriteExists?: boolean
  // Optional fixed component id for this view (e.g., component page)
  fixedComponentId?: number
}

const CytoscapeNetwork = ({
  data,
  height = "500px",
  layoutName = "cose",
  showControls = true,
  autoRunLayout = true,
  fitOnInit = true,
  wheelSensitivity = 0.2,
  minZoom,
  maxZoom,
  networkName,
  filename,
  disableComponentTapHighlight = false,
  initialFavoriteExists,
  fixedComponentId,
}: CytoscapeNetworkProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [selectedLayout, setSelectedLayout] = useState<string>(layoutName)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<{ id: string; label?: string } | null>(null)
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
  // legacy map no longer needed after merging sections; keep for potential future use
  // const proteinCountMap = useMemo(() => {
  //   const map = new Map<string, number>()
  //   const list = selectedNodeInfo?.proteinCounts || []
  //   for (const { protein, count } of list) {
  //     map.set(protein, count)
  //   }
  //   return map
  // }, [selectedNodeInfo])

  const proteinCountsSorted = useMemo(() => {
    return (selectedNodeInfo?.proteinCounts || []).slice()
  }, [selectedNodeInfo])

  const proteinMaxCount = useMemo(() => {
    const arr = selectedNodeInfo?.proteinCounts || []
    if (arr.length === 0) return 1
    return Math.max(1, ...arr.map((x) => x.count))
  }, [selectedNodeInfo])
  const [showLabels, setShowLabels] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("network.style")
      if (!raw) return false
      const parsed = JSON.parse(raw)
      return typeof parsed?.showLabels === "boolean" ? parsed.showLabels : false
    } catch {
      return false
    }
  })
  const [runningBackend, setRunningBackend] = useState(false)
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(false)
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false)
  const [isLayoutRunning, setIsLayoutRunning] = useState(false)
  // Collapsible sections state (collapsed by default)
  const [isIdOpen, setIsIdOpen] = useState(false)
  const [isNameOpen, setIsNameOpen] = useState(false)
  const [isComponentOpen, setIsComponentOpen] = useState(false)
  const [isDistributionOpen, setIsDistributionOpen] = useState(false)
  const [savingFavorite, setSavingFavorite] = useState(false)
  const [savedFavoriteOnce, setSavedFavoriteOnce] = useState(() => !!initialFavoriteExists)
  const [localComponentId, setLocalComponentId] = useState<number | null>(null)

  // If parent indicates it's already a favorite, reflect that promptly
  useEffect(() => {
    if (initialFavoriteExists) setSavedFavoriteOnce(true)
  }, [initialFavoriteExists])

  // Prefer a server/provided component id for any writes/checks
  const effectiveComponentId = useMemo<number | null>(() => {
    if (typeof fixedComponentId === 'number') return fixedComponentId
    if (typeof selectedNodeInfo?.componentId === 'number') return selectedNodeInfo.componentId
    return null
  }, [fixedComponentId, selectedNodeInfo?.componentId])

  // When component info is known (or local cid computed), check if it's already in favorites for this user
  useEffect(() => {
    const check = async () => {
      try {
        if (!networkName || !filename) return
        const usedServerCid = (typeof fixedComponentId === 'number') || (typeof selectedNodeInfo?.componentId === 'number')
        const cid = (typeof fixedComponentId === 'number')
          ? fixedComponentId
          : ((typeof selectedNodeInfo?.componentId === 'number') ? selectedNodeInfo?.componentId : localComponentId)
        if (typeof cid !== 'number') return
        const baseUrl = OpenAPI.BASE || 'http://localhost'
        const token = localStorage.getItem('access_token') || ''
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const url = `${baseUrl}/api/v1/favorites/exists?network_name=${encodeURIComponent(networkName)}&filename=${encodeURIComponent(filename)}&component_id=${cid}`
        const resp = await fetch(url, { headers })
        if (!resp.ok) return
        const json = await resp.json()
        const exists = !!(json && json.exists)
        if (exists) {
          setSavedFavoriteOnce(true)
        } else if (usedServerCid) {
          // Only clear if we checked with a backend-provided component id
          setSavedFavoriteOnce(false)
        }
      } catch {
        // ignore
      }
    }
    check()
  }, [selectedNodeInfo?.componentId, localComponentId, networkName, filename, fixedComponentId])
  // New: collapsible section for node-label proteins
  const [isNodeProteinOpen, setIsNodeProteinOpen] = useState(false)
  const [isNodeHighlightOptionsOpen, setIsNodeHighlightOptionsOpen] = useState(false)
  const [isHighlightOptionsOpen, setIsHighlightOptionsOpen] = useState(false)
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
  // Selected border width (for Cytoscape selected state)
  const [selectedBorderWidth, setSelectedBorderWidth] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("network.style")
      const v = raw ? JSON.parse(raw)?.selectedBorderWidth : undefined
      const n = typeof v === "number" && Number.isFinite(v) ? v : 0
      return Math.min(20, Math.max(0, n))
    } catch {
      return 0
    }
  })
  // Toggle hover-driven info (node labels on hover, edge overlap on hover)
  const [enableHoverInfo, setEnableHoverInfo] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("network.style")
      if (!raw) return true
      const parsed = JSON.parse(raw)
      return typeof parsed?.enableHoverInfo === "boolean" ? parsed.enableHoverInfo : true
    } catch {
      return true
    }
  })
  const enableHoverInfoRef = useRef<boolean>(true)
  useEffect(() => { enableHoverInfoRef.current = enableHoverInfo }, [enableHoverInfo])

  // Removed detailedMode in favor of per-protein expand/collapse

  // Protein-based highlight selection across the graph
  const [highlightProteins, setHighlightProteins] = useState<Set<string>>(new Set())
  // Per-protein expand/collapse state (collapsed by default)
  const [expandedProteins, setExpandedProteins] = useState<Set<string>>(new Set())
  // Filter to components that contain at least one selected protein
  const [filterComponentsByProteins, setFilterComponentsByProteins] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("network.style")
      const parsed = raw ? JSON.parse(raw) : undefined
      return typeof parsed?.filterComponentsByProteins === 'boolean' ? parsed.filterComponentsByProteins : false
    } catch {
      return false
    }
  })

  type HighlightMode = 'AND' | 'OR'
  const [highlightMode, setHighlightMode] = useState<HighlightMode>(() => {
    try {
      const raw = localStorage.getItem("network.style")
      const parsed = raw ? JSON.parse(raw) : undefined
      const v = parsed?.highlightMode
      return v === 'OR' ? 'OR' : 'AND'
    } catch {
      return 'AND'
    }
  })

  const tokenize = useCallback((s: string) => s.split(/\s+/).filter(Boolean), [])
  // Track whether highlighting is active to suppress labels/hover labels
  const highlightActiveRef = useRef<boolean>(false)
  useEffect(() => {
    highlightActiveRef.current = highlightProteins.size > 0
  }, [highlightProteins])

  const recomputeProteinHighlight = useCallback(() => {
    const cy = cyRef.current
    if (!cy) return
    try {
      const tokensSel = new Set(highlightProteins)
      cy.batch(() => {
        const anyActive = tokensSel.size > 0
        // reset visibility
        cy.nodes().forEach((n) => { n.style("display", "element") })
        cy.edges().forEach((e) => { e.style("display", "element") })
        // compute hits according to selected match mode
        cy.nodes().forEach((n) => {
          if (!anyActive) {
            n.data("proteinHighlight", 0)
            n.data("dim", 0)
            return
          }
          const lbl = String(n.data("label") ?? "")
          const toksSet = new Set(tokenize(lbl))
          let hit = 0
          if (highlightMode === 'AND') {
            hit = 1
            for (const sel of tokensSel) {
              if (!toksSet.has(sel)) { hit = 0; break }
            }
          } else {
            for (const sel of tokensSel) { if (toksSet.has(sel)) { hit = 1; break } }
          }
          n.data("proteinHighlight", hit)
          n.data("dim", hit ? 0 : 1)
        })
        if (anyActive && filterComponentsByProteins) {
          // hide nodes/edges that are not in components containing at least one highlighted node
          const visited = new Set<string>()
          const queue: string[] = []
          // seed queue with highlighted nodes
          cy.nodes().forEach((n) => { if (n.data("proteinHighlight") === 1) queue.push(n.id()) })
          // BFS to mark their components
          while (queue.length) {
            const id = queue.shift() as string
            if (visited.has(id)) continue
            visited.add(id)
            const node = cy.getElementById(id)
            node.connectedEdges().forEach((e) => {
              const s = String(e.data("source"))
              const t = String(e.data("target"))
              if (!visited.has(s)) queue.push(s)
              if (!visited.has(t)) queue.push(t)
            })
          }
          // hide nodes not visited; keep only subgraph of visited ids
          cy.nodes().forEach((n) => {
            if (!visited.has(n.id())) n.style("display", "none")
          })
          cy.edges().forEach((e) => {
            const s = String(e.data("source"))
            const t = String(e.data("target"))
            if (!(visited.has(s) && visited.has(t))) e.style("display", "none")
          })
        }
      })
    } catch {
      // ignore
    }
  }, [highlightProteins, tokenize, filterComponentsByProteins, highlightMode])

  type NameMode = 'systematic' | 'gene'
  const [nameMode, setNameMode] = useState<NameMode>(() => {
    try {
      const raw = localStorage.getItem("network.style")
      const parsed = raw ? JSON.parse(raw) : undefined
      const v = parsed?.nameMode
      return v === 'gene' ? 'gene' : 'systematic'
    } catch {
      return 'systematic'
    }
  })

  // Live-selected label reflecting current nameMode and graph state
  const selectedNodeLiveLabel = useMemo(() => {
    const id = selectedNode?.id
    const cy = cyRef.current
    if (!id || !cy) return selectedNode?.label
    try {
      const el = cy.getElementById(String(id))
      const lbl = el?.data("label")
      return typeof lbl === "string" ? lbl : selectedNode?.label
    } catch {
      return selectedNode?.label
    }
  }, [selectedNode?.id, nameMode])

  // Tokens from the currently selected node's label
  const nodeLabelProteins = useMemo(() => {
    const lbl = selectedNodeLiveLabel || ""
    try {
      const toks = tokenize(lbl)
      const uniq = Array.from(new Set(toks))
      uniq.sort((a, b) => a.localeCompare(b))
      return uniq
    } catch {
      return [] as string[]
    }
  }, [selectedNodeLiveLabel, tokenize])

  // Keep some global style options in sync across components
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem("network.style")
        const parsed = raw ? JSON.parse(raw) : {}
        const v = parsed?.nameMode
        setNameMode(v === 'gene' ? 'gene' : 'systematic')
        if (typeof parsed?.showLabels === 'boolean') setShowLabels(!!parsed.showLabels)
        if (typeof parsed?.nodeScale === 'number') setNodeScale(Math.min(2, Math.max(0.1, parsed.nodeScale)))
        if (typeof parsed?.edgeScale === 'number') setEdgeScale(Math.min(2, Math.max(0.1, parsed.edgeScale)))
        if (typeof parsed?.enableHoverInfo === 'boolean') setEnableHoverInfo(!!parsed.enableHoverInfo)
        if (typeof parsed?.selectedBorderWidth === 'number') setSelectedBorderWidth(Math.min(20, Math.max(0, parsed.selectedBorderWidth)))
      } catch {}
    }
    window.addEventListener('network-style-changed', handler as any)
    window.addEventListener('storage', handler as any)
    return () => {
      window.removeEventListener('network-style-changed', handler as any)
      window.removeEventListener('storage', handler as any)
    }
  }, [])

  const fetchNodeComponentInfo = useCallback(
    async (nodeId: string) => {
      setNodeInfoLoading(true)
      setSelectedNodeInfo(null)
      try {
        const baseUrl = OpenAPI.BASE || "http://localhost"
        const payload: any = { node_id: nodeId, name_mode: nameMode }
        if (typeof networkName === "string") payload.network = networkName
        if (typeof filename === "string") payload.filename = filename
        // Include the current graph from Cytoscape to reflect current labels/name mode
        const cy = cyRef.current
        if (cy) {
          payload.graph = {
            nodes: cy.nodes().map((n) => ({ data: n.data() })),
            edges: cy.edges().map((e) => ({ data: e.data() })),
          }
        } else {
          const fallbackNodes = (data.nodes || []).map((n) => {
            const sys = String(n.data?.sys_name ?? n.data?.name ?? n.data?.id ?? "")
            const gene = String(n.data?.gene_name ?? sys)
            const label = nameMode === 'gene' ? (gene || sys) : (sys || gene)
            return { data: { ...n.data, label } }
          })
          payload.graph = {
            nodes: fallbackNodes,
            edges: (data.edges || []).map((e) => ({ data: e.data })),
          }
        }
        const resp = await fetch(`${baseUrl}/api/v1/networks/components/by-node`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!resp.ok) {
          const errText = await resp.text().catch(() => "")
          // eslint-disable-next-line no-console
          console.error("by-node request failed", resp.status, resp.statusText, errText)
          throw new Error(`Backend component lookup failed: ${resp.status} ${resp.statusText}`)
        }
        const result = await resp.json()
        // eslint-disable-next-line no-console
        console.log("by-node result", result)
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

  // Recompute backend details when naming mode changes if details are already loaded
  useEffect(() => {
    if (selectedNode?.id && selectedNodeInfo) {
      fetchNodeComponentInfo(selectedNode.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameMode])

  // Persist style settings
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
        enableHoverInfo,
        filterComponentsByProteins,
        highlightMode,
        selectedBorderWidth,
      })
      localStorage.setItem("network.style", payload)
      // notify same-tab listeners
      window.dispatchEvent(new Event('network-style-changed'))
    } catch {
      // ignore persistence errors (e.g., private mode)
    }
  }, [showLabels, nodeScale, edgeScale, nameMode, enableHoverInfo, filterComponentsByProteins, highlightMode, selectedBorderWidth])

  // Satisfy linter about setter usage in certain build modes
  useEffect(() => {
    // no-op
  }, [setFilterComponentsByProteins])

  

  const availableLayouts = [
    "grid",
    "circle",
    "concentric",
    "breadthfirst",
    "cose",
    "fcose",
    "cose-bilkent",
    "concentric-attribute",
  ]

  // Colors matching node type selectors
  const nodeTypeColors = useMemo(() => ({
    matched_prediction: '#74C476',
    matched_reference: '#67A9CF',
    prediction: '#FCCF40',
    reference: '#D94801',
    unknown: '#cccccc',
  } as Record<string, string>), [])

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

  // Heuristic: treat very large graphs specially to keep UI responsive
  const isBigGraph = useMemo(() => {
    const n = (data.nodes || []).length
    const m = (data.edges || []).length
    return n >= 1500 || m >= 3000
  }, [data])

  const networkStats = useMemo(() => {
    const nodeCount = (data.nodes || []).length
    const edgeCount = (data.edges || []).length
    const typeCountsMap = new Map<string, number>()
    ;(data.nodes || []).forEach((n) => {
      const t = String(n.data?.type ?? 'unknown')
      typeCountsMap.set(t, (typeCountsMap.get(t) || 0) + 1)
    })
    const typeCounts = Array.from(typeCountsMap.entries()).map(([type, count]) => ({ type, count }))
    return {
      nodeCount,
      edgeCount,
      typeCounts,
      weightRange: edgeWeightRange,
      similarityRange: edgeSimilarityRange,
    }
  }, [data, edgeWeightRange, edgeSimilarityRange])

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
    const nodeElements: ElementDefinition[] = (data.nodes || []).map((n) => {
      const sys = String(n.data?.label_sys ?? n.data?.sys_name ?? n.data?.name ?? n.data?.id ?? "")
      const gene = String(n.data?.label_gene ?? n.data?.gene_name ?? sys)
      const label = nameMode === 'gene' ? (gene || sys) : (sys || gene)
      return { data: { ...n.data, label } }
    })
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
  }, [data, edgeSimilarityRange, nameMode])

  // Deterministic connected components (stable IDs across calls)
  const computeComponents: (cy: cytoscape.Core) => { nidToCid: Map<string, number>; cidToNodeIds: Map<number, string[]> } = useCallback((cy: cytoscape.Core) => {
    const adj = new Map<string, string[]>()
    cy.nodes().forEach((n) => { adj.set(n.id(), []) })
    cy.edges().forEach((e) => {
      const s = String(e.data("source"))
      const t = String(e.data("target"))
      const as = adj.get(s)
      const at = adj.get(t)
      if (as) as.push(t)
      if (at) at.push(s)
    })
    // Sort neighbor lists for determinism
    adj.forEach((list: string[]) => list.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
    const allIds = cy.nodes().map((n) => n.id()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    const nidToCid = new Map<string, number>()
    const cidToNodeIds: Map<number, string[]> = new Map()
    let nextCid = 0
    for (const start of allIds) {
      if (nidToCid.has(start)) continue
      const cid = nextCid++
      const q: string[] = [start]
      nidToCid.set(start, cid)
      cidToNodeIds.set(cid, [start])
      while (q.length) {
        const cur = q.shift() as string
        const neigh: string[] = adj.get(cur) || []
        for (const nb of neigh) {
          if (!nidToCid.has(nb)) {
            nidToCid.set(nb, cid)
            cidToNodeIds.get(cid)!.push(nb)
            q.push(nb)
          }
        }
      }
      cidToNodeIds.set(cid, (cidToNodeIds.get(cid) || []).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
    }
    return { nidToCid, cidToNodeIds }
  }, [])

  // Locally compute the component id of the currently selected node
  useEffect(() => {
    const cy = cyRef.current
    const nodeId = selectedNode?.id
    if (!cy || !nodeId) { setLocalComponentId(null); return }
    try {
      const { nidToCid } = computeComponents(cy)
      const cid = nidToCid.get(String(nodeId))
      setLocalComponentId(typeof cid === 'number' ? cid : null)
    } catch {
      setLocalComponentId(null)
    }
  }, [selectedNode?.id, elements, computeComponents])

  // Hover preview support: remember viewport and active hovered component
  const prevViewRef = useRef<{ pan: { x: number; y: number }; zoom: number } | null>(null)
  const hoveredComponentRef = useRef<number | null>(null)
  const hoverRevertTimeoutRef = useRef<number | null>(null)

  const previewComponent = useCallback((componentId: number) => {
    const cy = cyRef.current
    if (!cy) return
    try {
      cy.batch(() => {
        // Save current view once per preview session
        if (!prevViewRef.current) {
          prevViewRef.current = { pan: cy.pan(), zoom: cy.zoom() }
        }
        // Clear any previous highlight, then highlight target component and fit
        cy.nodes().forEach((n) => { n.data("highlight", 0) })
        const { nidToCid } = computeComponents(cy)
        const idsToFit: string[] = []
        nidToCid.forEach((cid, nid) => {
          if (cid === componentId) {
            cy.getElementById(nid).data("highlight", 1)
            idsToFit.push(nid)
          }
        })
        if (idsToFit.length > 0) {
          const sel = cy.collection(idsToFit.map((id) => cy.getElementById(id) as any))
          cy.fit(sel, 40)
          // Pulse border to emphasize hovered component (respect selectedBorderWidth)
          const base = Math.max(0, selectedBorderWidth)
          const high = base + 4
          sel.nodes().forEach((n) => {
            try {
              n.animate({ style: { 'border-width': high } }, { duration: 120 })
              n.animate({ style: { 'border-width': base } }, { duration: 160 })
            } catch { /* ignore */ }
          })
        }
        hoveredComponentRef.current = componentId
      })
    } catch {
      // ignore
    }
  }, [computeComponents])

  const clearHoverPreview = useCallback((componentId: number) => {
    const cy = cyRef.current
    if (!cy) return
    // Delay a bit to allow moving between chips without flicker
    if (hoverRevertTimeoutRef.current) {
      window.clearTimeout(hoverRevertTimeoutRef.current)
      hoverRevertTimeoutRef.current = null
    }
    hoverRevertTimeoutRef.current = window.setTimeout(() => {
      if (hoveredComponentRef.current !== componentId) return
      try {
        cy.batch(() => {
          // Remove highlight and restore stylesheet-driven border
          cy.nodes().forEach((n) => { n.data("highlight", 0); (n as any).removeStyle?.('border-width') || n.removeStyle() })
          // Restore previous view if available
          if (prevViewRef.current) {
            cy.zoom(prevViewRef.current.zoom)
            cy.pan(prevViewRef.current.pan)
          }
          prevViewRef.current = null
          hoveredComponentRef.current = null
        })
      } catch {
        // ignore
      }
    }, 150)
  }, [])

  // Highlight a whole component by its internal id
  const highlightComponent = useCallback((componentId: number) => {
    const cy = cyRef.current
    if (!cy) return
    try {
      cy.batch(() => {
        cy.nodes().forEach((n) => { n.data("highlight", 0) })
        // Compute by BFS on the current graph
        // Seed with any node currently in the component highlight (none) -> we will rebuild from edges using a tag
        const { nidToCid } = computeComponents(cy)
        // Apply highlight to nodes with matching cid and fit viewport
        const idsToFit: string[] = []
        nidToCid.forEach((cid, nid) => {
          if (cid === componentId) {
            cy.getElementById(nid).data("highlight", 1)
            idsToFit.push(nid)
          }
        })
        if (idsToFit.length > 0) {
          const sel = cy.collection(idsToFit.map((id) => cy.getElementById(id) as any))
          cy.fit(sel, 40)
          // Pulse animation to clearly indicate selection (respect selectedBorderWidth)
          const base = Math.max(0, selectedBorderWidth)
          const high = base + 4
          sel.nodes().forEach((n) => {
            try {
              n.animate({ style: { 'border-width': high } }, { duration: 140 })
              n.animate({ style: { 'border-width': base } }, { duration: 180 })
            } catch {/* ignore */}
          })
          // After animation, remove the highlight border bypass so stylesheet applies
          window.setTimeout(() => {
            sel.nodes().forEach((n) => {
              try {
                n.data('highlight', 0)
                ;(n as any).removeStyle?.('border-width') || n.removeStyle()
              } catch {/* ignore */}
            })
          }, 500)
        }
      })
    } catch {
      // ignore
    }
  }, [])

  // Initialize Cytoscape (init-only; elements and data-driven styles are handled in separate effects)
  useEffect(() => {
    if (!containerRef.current) return

    // Destroy existing instance before creating a new one
    if (cyRef.current) {
      cyRef.current.destroy()
      cyRef.current = null
    }

    // Prefer WebGL renderer when available; fall back to canvas if not registered
    const baseInit = {
      container: containerRef.current,
      elements: [],
      // Keep initial style simple; data-driven mappings are applied in follow-up effects
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
            "background-color": "#cccccc",
            width: 40 * nodeScale,
            height: 40 * nodeScale,
            // Use manual z-index so hovered edge labels can overtake nodes
            "z-index-compare": "manual",
            "z-index": 10,
          },
        },
        {
          selector: "node.hovered",
          style: {
            label: "data(label)",
            "text-opacity": 1,
            "min-zoomed-font-size": 0,
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.9,
            "text-background-shape": "roundrectangle",
            // Ensure hovered node label is above all
            "z-index-compare": "manual",
            "z-index": 100001,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": selectedBorderWidth,
            "overlay-opacity": 0,
          },
        },
        {
          selector: "node[highlight = 1]",
          style: {
            "border-width": selectedBorderWidth,
            "border-color": "#FF9800",
            "border-opacity": 1,
          },
        },
        {
          selector: "node[proteinHighlight = 1]",
          style: {
            "border-width": selectedBorderWidth,
            "border-color": "#2196F3",
            "border-opacity": 1,
            "z-index": 9999,
          },
        },
        {
          selector: "node[dim = 1]",
          style: {
            opacity: 0.25,
            "text-opacity": 0.2,
          },
        },
        { selector: "node[type = 'matched_prediction']", style: { "background-color": "#74C476" } },
        { selector: "node[type = 'matched_reference']", style: { "background-color": "#67A9CF" } },
        { selector: "node[type = 'prediction']", style: { "background-color": "#FCCF40" } },
        { selector: "node[type = 'reference']", style: { "background-color": "#D94801" } },
        {
          selector: "edge",
          style: {
            width: 5 * edgeScale,
            "line-color": "data(edgeColor)",
            "target-arrow-color": "data(edgeColor)",
            "target-arrow-shape": "none",
            "curve-style": "bezier",
            // Edges under nodes by default, but can be raised on hover
            "z-index-compare": "manual",
            "z-index": 5,
          },
        },
        {
          selector: "edge.hovered",
          style: {
            // Center overlap text (larger)
            label: "data(hoverLabel)",
            "font-size": 14,
            color: "#111",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.9,
            "text-background-shape": "roundrectangle",
            "text-wrap": "wrap",
            "text-max-width": "220px",
            "text-margin-y": -6,
            // Endpoint labels (smaller, positioned near ends)
            "source-label": "data(sourceLabel)",
            "target-label": "data(targetLabel)",
            "source-text-margin-y": 12,
            "target-text-margin-y": 12,
            "source-text-margin-x": 6,
            "target-text-margin-x": -6,
            // Ensure hovered edge label is above nodes and edges
            "z-index-compare": "manual",
            "z-index": 100002,
          },
        },
        // Repeat hovered rule late to ensure precedence over other node rules
        {
          selector: "node.hovered",
          style: {
            label: "data(label)",
            "text-opacity": 1,
            "min-zoomed-font-size": 0,
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.9,
            "text-background-shape": "roundrectangle",
            // Ensure hovered node label is above all
            "z-index-compare": "manual",
            "z-index": 100001,
          },
        },
      ],
      wheelSensitivity,
      minZoom,
      maxZoom,
      // Renderer performance hints
      pixelRatio: 1,
      textureOnViewport: true,
      hideEdgesOnViewport: isBigGraph ? true : false,
      hideLabelsOnViewport: true,
      motionBlur: true,
    } as const

    // Enable WebGL mode on the canvas renderer per Cytoscape guidance
    cyRef.current = cytoscape({
      ...(baseInit as any),
      renderer: {
        name: 'canvas',
        // turn on WebGL-backed rendering
        webgl: false,
        // optional diagnostics; set to true to debug
        showFps: false,
        webglDebug: false,
        // provisional tuning knobs; safe defaults
        webglTexSize: 4096,
        webglTexRows: 24,
        webglBatchSize: 2048,
        webglTexPerBatch: 16,
      } as any,
    })

    const cy = cyRef.current
    // Click handler for nodes
    const onTapNode = (evt: cytoscape.EventObject) => {
      const node = evt.target
      const id = String(node.data("id"))
      const label = node.data("label") as string | undefined
      setSelectedNode({ id, label })
      // Reset details; will lazily load when sections are expanded
      setSelectedNodeInfo(null)
      setNodeInfoLoading(false)
      setIsIdOpen(false)
      setIsNameOpen(false)
      setIsComponentOpen(false)
      setIsDistributionOpen(false)
      setIsNodeProteinOpen(true)
      setExpandedProteins(new Set())
      // Eagerly fetch to populate protein list for checkboxes
      fetchNodeComponentInfo(id)
      // Optionally highlight the entire component on tap (disabled for subgraph view)
      if (!disableComponentTapHighlight) {
        try {
          cy.batch(() => {
            cy.nodes().forEach((n) => { n.data("highlight", 0) })
            const comps = cy.elements().components()
            let targetComp: cytoscape.CollectionReturnValue | undefined
            for (const comp of comps) {
              if (comp.contains(node)) {
                targetComp = comp
                break
              }
            }
            if (targetComp) {
              targetComp.nodes().forEach((n) => { n.data("highlight", 1) })
            }
          })
        } catch {
          // ignore highlight errors
        }
      }
      setIsDrawerOpen(true)
      try { node.unselect() } catch {}
    }
    cy.on("tap", "node", onTapNode)
    // Hover handlers: show node labels on hover
    const onMouseOverNode = (evt: cytoscape.EventObject) => {
      if (!enableHoverInfoRef.current) return
      if (isBigGraph && cy.zoom() < 0.5) return
      try { evt.target.addClass("hovered") } catch {}
    }
    const onMouseOutNode = (evt: cytoscape.EventObject) => {
      try { evt.target.removeClass("hovered") } catch {}
    }
    cy.on("mouseover", "node", onMouseOverNode)
    cy.on("mouseout", "node", onMouseOutNode)

    // Edge hover: compute protein overlaps between endpoint node labels
    const onMouseOverEdge = (evt: cytoscape.EventObject) => {
      if (highlightActiveRef.current) return
      if (!enableHoverInfoRef.current) return
      if (isBigGraph) return
      if (cy.zoom() < 0.6) return
      try {
        const e = evt.target
        const sid = String(e.data("source"))
        const tid = String(e.data("target"))
        const sNode = cy.getElementById(sid)
        const tNode = cy.getElementById(tid)
        const sLabel = String(sNode?.data("label") ?? "")
        const tLabel = String(tNode?.data("label") ?? "")
        const tokenize = (s: string) => s.split(/\s+/).filter(Boolean)
        const sTokens = tokenize(sLabel)
        const tTokens = tokenize(tLabel)
        const setT = new Set(tTokens)
        const overlap = Array.from(new Set(sTokens.filter((x) => setT.has(x))))
        // Overlap (center, larger)
        const text = overlap.length > 0 ? overlap.join(" ") : ""
        e.data("hoverLabel", text)
        // Endpoint labels (smaller, shown as source/target-label)
        e.data("sourceLabel", sLabel)
        e.data("targetLabel", tLabel)
        e.addClass("hovered")
      } catch {}
    }
    const onMouseOutEdge = (evt: cytoscape.EventObject) => {
      try {
        const e = evt.target
        e.removeClass("hovered")
        e.data("hoverLabel", "")
        e.data("sourceLabel", "")
        e.data("targetLabel", "")
      } catch {}
    }
    if (!isBigGraph) {
      cy.on("mouseover", "edge", onMouseOverEdge)
      cy.on("mouseout", "edge", onMouseOutEdge)
    }
    // Background tap clears highlight and closes drawer
    const onTapBg = (evt: cytoscape.EventObject) => {
      if (evt.target === cy) {
        cy.batch(() => {
          cy.nodes().forEach((n) => { n.data("highlight", 0); n.data("proteinHighlight", 0); n.data("dim", 0) })
        })
        setIsDrawerOpen(false)
        setSelectedNode(null)
        setHighlightProteins(new Set())
        setExpandedProteins(new Set())
      }
    }
    cy.on("tap", onTapBg)
    const resizeObserver = new ResizeObserver(() => {
      if (!cy) return
      cy.resize()
    })
    resizeObserver.observe(containerRef.current)

    // Do not fit here; we'll fit once after first data load

    return () => {
      resizeObserver.disconnect()
      cy?.off("tap", "node", onTapNode)
      cy?.off("tap", onTapBg)
      cy?.off("mouseover", "node", onMouseOverNode)
      cy?.off("mouseout", "node", onMouseOutNode)
      if (!isBigGraph) {
        cy?.off("mouseover", "edge", onMouseOverEdge)
        cy?.off("mouseout", "edge", onMouseOutEdge)
      }
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [fitOnInit, wheelSensitivity, minZoom, maxZoom])

  // Clear highlight when drawer closes
  useEffect(() => {
    if (isDrawerOpen) return
    const cy = cyRef.current
    if (!cy) return
    try {
      cy.batch(() => {
        cy.nodes().forEach((n) => { n.data("highlight", 0); n.data("proteinHighlight", 0); n.data("dim", 0) })
      })
    } catch {
      // noop
    }
    setHighlightProteins(new Set())
    setExpandedProteins(new Set())
  }, [isDrawerOpen])

  // Toggle labels without re-initializing or re-running layout
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    const style = cy.style()
    // Keep label content controlled by stylesheet/classes; avoid element-level bypasses
    // Always reflect the explicit showLabels toggle (do not suppress due to highlights)
    style
      .selector("node")
      .style({
        'text-opacity': showLabels ? 1 : 0,
        'min-zoomed-font-size': showLabels ? 0 : 8,
      })
      .update()
    // Ensure hovered rule wins by making it the latest updated selector
    style
      .selector('node.hovered')
      .style({
        'text-opacity': 1,
        'min-zoomed-font-size': 0,
      })
      .update()
  }, [showLabels])

  // Scale node and edge sizes dynamically without re-initializing Cytoscape or re-running layouts
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    const nodeMin = nodeMaxRefRange.min
    const nodeMax = nodeMaxRefRange.max
    const edgeWMin = edgeWeightRange.min
    const edgeWMax = edgeWeightRange.max

    const style = cy.style()
    if (nodeMin === nodeMax) {
      style.selector("node").style({ width: 40 * nodeScale, height: 40 * nodeScale })
    } else {
      style
        .selector("node")
        .style({
          width: `mapData(max_OS_ref, ${nodeMin}, ${nodeMax}, ${25 * nodeScale}, ${60 * nodeScale})`,
          height: `mapData(max_OS_ref, ${nodeMin}, ${nodeMax}, ${25 * nodeScale}, ${60 * nodeScale})`,
        })
    }
    if (edgeWMin === edgeWMax) {
      style.selector("edge").style({ width: 5 * edgeScale })
    } else {
      style
        .selector("edge")
        .style({ width: `mapData(weight, ${edgeWMin}, ${edgeWMax}, ${5 * edgeScale}, ${20 * edgeScale})` })
    }
    style.update()
  }, [nodeScale, edgeScale, nodeMaxRefRange, edgeWeightRange])

  // Update selected border width dynamically
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    try {
      const style = cy.style()
      style.selector('node:selected').style({ 'border-width': selectedBorderWidth, 'overlay-opacity': 0 })
      style.selector('node[highlight = 1]').style({ 'border-width': selectedBorderWidth })
      style.selector('node[proteinHighlight = 1]').style({ 'border-width': selectedBorderWidth })
      style.update()
    } catch {
      // ignore
    }
  }, [selectedBorderWidth])

  // Recompute protein-based highlights when selections or labels change
  useEffect(() => {
    recomputeProteinHighlight()
  }, [recomputeProteinHighlight, elements, nameMode])

  // If only elements change (same instance), update graph efficiently via diffing (do not re-run layout on size tweaks)
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.batch(() => {
      const wasEmpty = cy.elements().length === 0
      // Index new elements by id
      const newById = new Map<string, ElementDefinition>()
      for (const el of elements) {
        const id = String((el?.data as any)?.id)
        if (id) newById.set(id, el)
      }

      // Remove elements not present anymore and update those that remain
      const existingIds = new Set<string>()
      cy.elements().forEach((ele) => {
        const id = String(ele.id())
        const incoming = newById.get(id)
        if (!incoming) {
          ele.remove()
          return
        }
        existingIds.add(id)
        // Update data immutably (id is immutable; Cytoscape ignores id changes)
        if (incoming.data) {
          ele.data(incoming.data as any)
        }
      })

      // Add new elements
      const toAdd: ElementDefinition[] = []
      newById.forEach((el, id) => {
        if (!existingIds.has(id)) toAdd.push(el)
      })
      if (toAdd.length > 0) cy.add(toAdd)

      // Re-apply current scale styles to ensure sizes stay consistent
      const nodeMin = nodeMaxRefRange.min
      const nodeMax = nodeMaxRefRange.max
      const edgeWMin = edgeWeightRange.min
      const edgeWMax = edgeWeightRange.max
      const nodeSizeValue =
        nodeMin === nodeMax
          ? 40 * nodeScale
          : `mapData(max_OS_ref, ${nodeMin}, ${nodeMax}, ${25 * nodeScale}, ${60 * nodeScale})`
      const edgeWidthValue =
        edgeWMin === edgeWMax
          ? 5 * edgeScale
          : `mapData(weight, ${edgeWMin}, ${edgeWMax}, ${5 * edgeScale}, ${20 * edgeScale})`
      cy.nodes().style("width", nodeSizeValue)
      cy.nodes().style("height", nodeSizeValue)
      cy.edges().style("width", edgeWidthValue)

      if (autoRunLayout) {
        setIsLayoutRunning(true)
        const onStop = () => {
          cy.off('layoutstop', onStop)
          setIsLayoutRunning(false)
          cy.fit(undefined, 20)
        }
        cy.one('layoutstop', onStop)
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
            fit: false,
          }).run()
        } else {
          const name = selectedLayout as any
          const common = { animate: false, fit: false } as any
          const opts = name === 'fcose'
            ? { name, quality: 'default', randomize: true, packComponents: true, nodeSeparation: 75, uniformNodeDimensions: false, ...common }
            : name === 'cose-bilkent'
            ? { name, quality: 'default', randomize: true, gravity: 1, idealEdgeLength: 80, nodeRepulsion: 4500, ...common }
            : { name, ...common }
          try { cy.layout(opts).run() } catch { cy.layout({ name: selectedLayout as any, animate: false, fit: false }).run() }
        }
      } else if (fitOnInit && wasEmpty) {
        cy.fit(undefined, 20)
      }
    })

    // Client no longer computes components; backend will provide info per selected node
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
      setIsLayoutRunning(true)
      const onStop = () => {
        cy.off('layoutstop', onStop)
        setIsLayoutRunning(false)
        cy.fit(undefined, 20)
      }
      cy.one('layoutstop', onStop)
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
        fit: false,
      }).run()
    } else {
      setIsLayoutRunning(true)
      const onStop = () => {
        cy.off('layoutstop', onStop)
        setIsLayoutRunning(false)
        cy.fit(undefined, 20)
      }
      cy.one('layoutstop', onStop)
      const name = selectedLayout as any
      const common = { animate: false, fit: false, worker: true } as any
      const opts = name === 'fcose'
        ? { name, quality: 'default', randomize: true, packComponents: true, nodeSeparation: 75, uniformNodeDimensions: false, ...common }
        : name === 'cose-bilkent'
        ? { name, quality: 'default', randomize: true, gravity: 1, idealEdgeLength: 80, nodeRepulsion: 4500, ...common }
        : { name, ...common }
      try { cy.layout(opts).run() } catch { cy.layout({ name: selectedLayout as any, animate: false, fit: false }).run() }
    }
  }, [selectedLayout])

  const handleResetView = useCallback(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.fit(undefined, 20)
  }, [])

  // const handleRunLayoutBackend = useCallback(async () => {
  //   const cy = cyRef.current
  //   if (!cy || runningBackend) return
  //   try {
  //     setRunningBackend(true)

  //     const nodes = cy.nodes().map((n) => ({ data: n.data() }))
  //     const edges = cy.edges().map((e) => ({ data: e.data() }))

  //     // Collect current node sizes (model units) to help backend avoid overlaps
  //     const nodeSizes: Record<string, { width: number; height: number }> = {}
  //     cy.nodes().forEach((n) => {
  //       const id = String(n.id())
  //       nodeSizes[id] = { width: n.width(), height: n.height() }
  //     })

  //     const container = containerRef.current
  //     const containerWidth = container?.clientWidth ?? 800
  //     const containerHeight = container?.clientHeight ?? 600
  //     const scale = Math.min(containerWidth, containerHeight) * 0.45

  //     const baseUrl = OpenAPI.BASE || window.location.origin
  //     const resp = await fetch(`${baseUrl}/api/v1/networks/layout/spring`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ graph: { nodes, edges }, scale, nodeSizes }),
  //     })
  //     if (!resp.ok) {
  //       const txt = await resp.text()
  //       throw new Error(`Backend layout failed: ${resp.status} ${resp.statusText} ${txt}`)
  //     }
  //     const data = (await resp.json()) as { positions: Record<string, { x: number; y: number }> }
  //     const positions = data?.positions || {}

  //     cy.batch(() => {
  //       Object.entries(positions).forEach(([id, pos]) => {
  //         const node = cy.getElementById(String(id))
  //         if (node && node.nonempty()) {
  //           node.position({ x: pos.x, y: pos.y })
  //         }
  //       })
  //     })
  //     if (fitOnInit) cy.fit(undefined, 20)
  //   } catch (err) {
  //     // eslint-disable-next-line no-console
  //     console.error(err)
  //   } finally {
  //     setRunningBackend(false)
  //   }
  // }, [fitOnInit, runningBackend])

  return (
    <Box position="relative" width="100%" height={typeof height === "number" ? `${height}px` : height}>
      <CytoscapeToolbar
        showControls={showControls}
        selectedLayout={selectedLayout}
        onChangeSelectedLayout={(v) => setSelectedLayout(v)}
        onToggleStylePanel={() => {
          setIsStylePanelOpen((v) => !v)
          setIsInfoPanelOpen(false)
        }}
        onToggleInfoPanel={() => {
          setIsInfoPanelOpen((v) => !v)
          setIsStylePanelOpen(false)
        }}
        onRunLayout={handleRunLayout}
        onResetView={handleResetView}
      />
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
          minW="240px"
        >
                  <Stack gap={3}>
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="semibold">Style</Text>
              <Button size="xs" variant="ghost" onClick={() => setIsStylePanelOpen(false)}>Close</Button>
            </HStack>
            <HStack gap={2} align="center">
              <Text fontSize="xs" opacity={0.8}>Names:</Text>
              <select
                value={nameMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNameMode(e.target.value === 'gene' ? 'gene' : 'systematic')}
                style={{ fontSize: '12px', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent' }}
              >
                <option value="systematic">Systematic</option>
                <option value="gene">Gene</option>
              </select>
            </HStack>
            <Checkbox
              checked={showLabels}
              onCheckedChange={({ checked }) => setShowLabels(!!checked)}
            >
              <Text fontSize="sm">Show labels</Text>
            </Checkbox>

            <Checkbox
              checked={enableHoverInfo}
              onCheckedChange={({ checked }) => setEnableHoverInfo(!!checked)}
            >
              <Text fontSize="sm">Hover info (labels & overlaps)</Text>
            </Checkbox>

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

            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs">Selected border width</Text>
                <Text fontSize="xs">{selectedBorderWidth}px</Text>
              </HStack>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={selectedBorderWidth}
                onChange={(e) => setSelectedBorderWidth(Number(e.target.value))}
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
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", minHeight: typeof height === "number" ? `${height}px` : height }}
      />

      {runningBackend && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="whiteAlpha.700"
          _dark={{ bg: "blackAlpha.500" }}
          zIndex={3}
        >
          <Stack align="center" gap={2}>
            <Spinner size="sm" />
            <Text fontSize="sm">Calculating layout on backend…</Text>
          </Stack>
        </Box>
      )}

      {isLayoutRunning && !runningBackend && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="whiteAlpha.600"
          _dark={{ bg: "blackAlpha.400" }}
          zIndex={2}
        >
          <Stack align="center" gap={2}>
            <Spinner size="sm" />
            <Text fontSize="sm">Arranging layout…</Text>
          </Stack>
        </Box>
      )}

      <CytoscapeSidebar
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={(open) => setIsDrawerOpen(open)}
        selectedNode={selectedNode}
        nodeInfoLoading={nodeInfoLoading}
        selectedNodeInfo={selectedNodeInfo}
        networkName={networkName}
        filename={filename}
        fixedComponentId={fixedComponentId}
        effectiveComponentId={effectiveComponentId}
        savingFavorite={savingFavorite}
        savedFavoriteOnce={savedFavoriteOnce}
        setSavingFavorite={setSavingFavorite}
        setSavedFavoriteOnce={setSavedFavoriteOnce}
        fetchNodeComponentInfo={fetchNodeComponentInfo}
        isIdOpen={isIdOpen}
        setIsIdOpen={setIsIdOpen}
        isComponentOpen={isComponentOpen}
        setIsComponentOpen={setIsComponentOpen}
        isDistributionOpen={isDistributionOpen}
        setIsDistributionOpen={setIsDistributionOpen}
        isNodeProteinOpen={isNodeProteinOpen}
        setIsNodeProteinOpen={setIsNodeProteinOpen}
        isNodeHighlightOptionsOpen={isNodeHighlightOptionsOpen}
        setIsNodeHighlightOptionsOpen={setIsNodeHighlightOptionsOpen}
        isHighlightOptionsOpen={isHighlightOptionsOpen}
        setIsHighlightOptionsOpen={setIsHighlightOptionsOpen}
        proteinCountsSorted={proteinCountsSorted as any}
        proteinMaxCount={proteinMaxCount}
        nodeLabelProteins={nodeLabelProteins}
        computeComponents={computeComponents as any}
        previewComponent={previewComponent}
        clearHoverPreview={clearHoverPreview}
        highlightComponent={highlightComponent}
        highlightProteins={highlightProteins}
        setHighlightProteins={(next) => setHighlightProteins(new Set(next))}
        expandedProteins={expandedProteins}
        setExpandedProteins={(next) => setExpandedProteins(new Set(next))}
        selectedBorderWidth={selectedBorderWidth}
        cyRef={cyRef as any}
        hoverRevertTimeoutRef={hoverRevertTimeoutRef as any}
        prevViewRef={prevViewRef as any}
      />
    </Box>
  )
}

export default memo(CytoscapeNetwork)
