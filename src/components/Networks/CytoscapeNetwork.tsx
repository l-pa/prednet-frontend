import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import cytoscape, { type ElementDefinition } from "cytoscape"
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

  // Keep nameMode in sync with global changes
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem("network.style")
        const parsed = raw ? JSON.parse(raw) : {}
        const v = parsed?.nameMode
        setNameMode(v === 'gene' ? 'gene' : 'systematic')
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
      })
      localStorage.setItem("network.style", payload)
      // notify same-tab listeners
      window.dispatchEvent(new Event('network-style-changed'))
    } catch {
      // ignore persistence errors (e.g., private mode)
    }
  }, [showLabels, nodeScale, edgeScale, nameMode, enableHoverInfo, filterComponentsByProteins, highlightMode])

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
          // Pulse border to emphasize hovered component
          sel.nodes().forEach((n) => {
            try {
              n.animate({ style: { 'border-width': 8 } }, { duration: 120 })
              n.animate({ style: { 'border-width': 4 } }, { duration: 160 })
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
          // Remove highlight and border
          cy.nodes().forEach((n) => { n.data("highlight", 0); n.style('border-width', 0) })
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
          // Pulse animation to clearly indicate selection
          sel.nodes().forEach((n) => {
            try {
              n.animate({ style: { 'border-width': 8 } }, { duration: 140 })
              n.animate({ style: { 'border-width': 4 } }, { duration: 180 })
            } catch {/* ignore */}
          })
          // After animation, remove the highlight border entirely
          window.setTimeout(() => {
            sel.nodes().forEach((n) => {
              try {
                n.data('highlight', 0)
                n.style('border-width', 0)
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

    cyRef.current = cytoscape({
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
            "z-index": 9999,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 0,
            "overlay-opacity": 0,
          },
        },
        {
          selector: "node[highlight = 1]",
          style: {
            "border-width": 4,
            "border-color": "#FF9800",
            "border-opacity": 1,
          },
        },
        {
          selector: "node[proteinHighlight = 1]",
          style: {
            "border-width": 8,
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
          },
        },
        {
          selector: "edge.hovered",
          style: {
            label: "data(hoverLabel)",
            "font-size": 10,
            color: "#111",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.9,
            "text-background-shape": "roundrectangle",
            "text-wrap": "wrap",
            "text-max-width": "200px",
            "text-margin-y": -8,
            "z-index": 9999,
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
            "z-index": 9999,
          },
        },
      ],
      wheelSensitivity,
      minZoom,
      maxZoom,
      // Renderer performance hints
      pixelRatio: 1,
      textureOnViewport: true,
      hideEdgesOnViewport: false,
      hideLabelsOnViewport: true,
      motionBlur: true,
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
      setIsDistributionOpen(true)
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
        const text = overlap.length > 0 ? overlap.join(" ") : ""
        e.data("hoverLabel", text)
        e.addClass("hovered")
      } catch {}
    }
    const onMouseOutEdge = (evt: cytoscape.EventObject) => {
      try {
        const e = evt.target
        e.removeClass("hovered")
        e.data("hoverLabel", "")
      } catch {}
    }
    cy.on("mouseover", "edge", onMouseOverEdge)
    cy.on("mouseout", "edge", onMouseOutEdge)
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
      cy?.off("mouseover", "edge", onMouseOverEdge)
      cy?.off("mouseout", "edge", onMouseOutEdge)
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
    const suppress = highlightProteins.size > 0
    // Keep label content controlled by stylesheet/classes; avoid element-level bypasses
    style
      .selector("node")
      .style({
        'text-opacity': suppress ? 0 : (showLabels ? 1 : 0),
        'min-zoomed-font-size': suppress ? 8 : (showLabels ? 0 : 8),
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
  }, [showLabels, highlightProteins])

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
          cy.layout({ name: selectedLayout as any, animate: false, fit: false }).run()
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
      cy.layout({ name: selectedLayout as any, animate: false, fit: false }).run()
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
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setIsStylePanelOpen((v) => !v)
                setIsInfoPanelOpen(false)
              }}
            >
              Style
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setIsInfoPanelOpen((v) => !v)
                setIsStylePanelOpen(false)
              }}
            >
              Info
            </Button>
          </HStack>
          <Tooltip.Root openDelay={200}>
            <Tooltip.Trigger>
              <Button size="xs" onClick={handleRunLayout}>
                <HStack gap={1}>
                  <FiPlay />
                  <span>Run layout</span>
                </HStack>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                <Tooltip.Arrow />
                <Text fontSize="xs">Calculated in your browser. Large graphs may be slow and could freeze the tab.</Text>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
            <Tooltip.Root openDelay={200}>
            <Tooltip.Trigger>
          {/* <Button size="xs" onClick={handleRunLayoutBackend} variant="outline" disabled={runningBackend}>

            <HStack gap={1}>
              <FiPlay />
              <span>Run layout (backend)</span>
              <Badge colorScheme="purple" variant="subtle" ml={1}>Experimental</Badge>
            </HStack>
          </Button> */}
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                <Tooltip.Arrow />
                <Text fontSize="xs">Calculated on the server, using the spring layout algorithm.</Text>
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          <Button size="xs" onClick={handleResetView} variant="outline">
            <HStack gap={1}>
              <FiRefreshCw />
              <span>Reset view</span>
            </HStack>
          </Button>
        </HStack>
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

      {/* Right-side drawer for node details */}
      <DrawerRoot open={isDrawerOpen} onOpenChange={(e) => setIsDrawerOpen(e.open)} placement="end" modal={false} closeOnInteractOutside={false} trapFocus={false}>
        <DrawerContent maxW="sm">
          <DrawerHeader>
            <DrawerTitle>Node details</DrawerTitle>
            <DrawerCloseTrigger />
          </DrawerHeader>
          <DrawerBody>
            {selectedNode ? (
              <Stack gap={3} fontSize="sm">
                <Box>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">ID</Text>
                    <Button size="xs" variant="ghost" onClick={() => setIsIdOpen((v) => !v)}>{isIdOpen ? "Hide" : "Show"}</Button>
                  </HStack>
                  {isIdOpen && (
                    <Text>{selectedNode.id}</Text>
                  )}
                </Box>

                <Box>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Name</Text>
                    <Button size="xs" variant="ghost" onClick={() => setIsNameOpen((v) => !v)}>{isNameOpen ? "Hide" : "Show"}</Button>
                  </HStack>
                  {isNameOpen && (
                    <Text>{selectedNodeLiveLabel || '-'}</Text>
                  )}
                </Box>

                {nodeInfoLoading ? (
                  <Box>
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Component</Text>
                      <Button size="xs" variant="ghost" onClick={() => setIsComponentOpen((v) => !v)}>{isComponentOpen ? "Hide" : "Show"}</Button>
                    </HStack>
                    {isComponentOpen && <Text>Loading…</Text>}
                  </Box>
                ) : (selectedNodeInfo && (selectedNodeInfo.componentId !== undefined || selectedNodeInfo.componentSize !== undefined)) ? (
                  <Box>
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Component</Text>
                      <Button size="xs" variant="ghost" onClick={() => setIsComponentOpen((v) => !v)}>{isComponentOpen ? "Hide" : "Show"}</Button>
                    </HStack>
                    {isComponentOpen && (
                      <Text>
                        {selectedNodeInfo.componentId !== undefined ? `#${selectedNodeInfo.componentId}` : ""}
                        {selectedNodeInfo.componentId !== undefined && selectedNodeInfo.componentSize !== undefined ? " · " : ""}
                        {selectedNodeInfo.componentSize !== undefined ? `${selectedNodeInfo.componentSize} nodes` : ""}
                      </Text>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Component</Text>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setIsComponentOpen((v) => !v)
                          const id = selectedNode?.id
                          if (id && !selectedNodeInfo && !nodeInfoLoading) fetchNodeComponentInfo(id)
                        }}
                      >
                        {isComponentOpen ? "Hide" : "Show"}
                      </Button>
                    </HStack>
                    {isComponentOpen && <Text>Loading…</Text>}
                  </Box>
                )}
                {/* Removed separate Proteins section; merged into distribution below */}

                <Box>
                  <HStack justify="space-between">
                    <HStack gap={1} align="center">
                      <Text fontWeight="bold">Protein distribution</Text>
                      <Tooltip.Root openDelay={200}>
                        <Tooltip.Trigger>
                          <Button size="xs" variant="ghost" onClick={() => setIsHighlightOptionsOpen((v) => !v)} title="Highlight options">
                            <FiSettings />
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Positioner>
                          <Tooltip.Content>
                            <Tooltip.Arrow />
                            <Text fontSize="xs">Highlight options</Text>
                          </Tooltip.Content>
                        </Tooltip.Positioner>
                      </Tooltip.Root>
                    </HStack>
                    <Button size="xs" variant="ghost" onClick={() => setIsDistributionOpen((v) => !v)}>{isDistributionOpen ? "Hide" : "Show"}</Button>
                  </HStack>
                  {isHighlightOptionsOpen && (
                    <Box>
                      <Stack gap={2} mt={2}>
                        <HStack gap={2} align="center" justify="space-between">
                          <HStack gap={2} align="center">
                            <Text fontSize="xs" opacity={0.8}>Match mode</Text>
                            <Tooltip.Root openDelay={200}>
                              <Tooltip.Trigger>
                                <Text as="span" fontSize="xs" opacity={0.6} cursor="help">?</Text>
                              </Tooltip.Trigger>
                              <Tooltip.Positioner>
                                <Tooltip.Content>
                                  <Tooltip.Arrow />
                                  <Text fontSize="xs">Choose whether a node must contain all selected proteins (AND) or any of them (OR).</Text>
                                </Tooltip.Content>
                              </Tooltip.Positioner>
                            </Tooltip.Root>
                          </HStack>
                          <HStack gap={1}>
                            <Button size="xs" variant={highlightMode === 'AND' ? 'solid' : 'outline'} onClick={() => setHighlightMode('AND')}>AND</Button>
                            <Button size="xs" variant={highlightMode === 'OR' ? 'solid' : 'outline'} onClick={() => setHighlightMode('OR')}>OR</Button>
                          </HStack>
                        </HStack>
                        <Checkbox
                          checked={filterComponentsByProteins}
                          onCheckedChange={({ checked }) => setFilterComponentsByProteins(!!checked)}
                        >
                          <Text fontSize="sm">Show only components matching filter</Text>
                        </Checkbox>
                        <HStack justify="flex-end">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              const cy = cyRef.current
                              if (cy) {
                                try {
                                  cy.batch(() => {
                                    cy.nodes().forEach((n) => { n.data("proteinHighlight", 0); n.data("dim", 0) })
                                  })
                                } catch {}
                              }
                              setHighlightProteins(new Set())
                              setExpandedProteins(new Set())
                            }}
                            disabled={highlightProteins.size === 0}
                          >
                            Clear highlights
                          </Button>
                        </HStack>
                      </Stack>
                    </Box>
                  )}
                  {isDistributionOpen && (
                    nodeInfoLoading ? (
                      <HStack gap={2} align="center" mt={2}>
                        <Spinner size="xs" />
                        <Text fontSize="sm">Loading proteins…</Text>
                      </HStack>
                    ) : selectedNodeInfo ? (
                      proteinCountsSorted.length === 0 ? (
                        <Text opacity={0.7}>(no data)</Text>
                      ) : (
                          <Stack gap={3} overflowY="auto">
                            {proteinCountsSorted.map(({ protein, count, type_counts, type_ratios, ratio, other_components }) => {
                              const totalPct = Math.max(4, Math.round((count / proteinMaxCount) * 100))
                              const parts = Object.entries(type_counts || {}).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
                              const sum = parts.reduce((acc, [, c]) => acc + c, 0) || 1
                              // Build component menu items by scanning graph components where this protein appears
                              const cy = cyRef.current
                              let compMenu: Array<{ label: string, cid: number }> = []
                              if (cy) {
                                const { nidToCid } = computeComponents(cy)
                                // find components that contain this protein token
                                const compSet = new Set<number>()
                                cy.nodes().forEach((n) => {
                                  const lbl = String(n.data("label") ?? "")
                                  if (lbl.split(/\s+/).includes(protein)) {
                                    const cid = nidToCid.get(n.id())
                                    if (typeof cid === "number") compSet.add(cid)
                                  }
                                })
                                // Exclude current component (node clicked) if available
                                let currentCid: number | undefined
                                if (selectedNode?.id) {
                                  currentCid = nidToCid.get(String(selectedNode.id))
                                  if (typeof currentCid === 'number') compSet.delete(currentCid)
                                }
                                compMenu = Array.from(compSet).sort((a, b) => a - b).map((cid) => ({ label: `Component #${cid}`, cid }))
                              }
                              return (
                                <Box key={`bar-${protein}`} p={3} borderWidth="1px" rounded="md" bg="white" _dark={{ bg: 'blackAlpha.600' }}>
                                  {/* Header: Protein label, name, selection, and collapse toggle */}
                                  <Stack gap={1} mb={2}>
                                    <HStack gap={2} align="center">
                                      <Text fontSize="xs" opacity={0.8}>Protein</Text>
                                      <Tooltip.Root openDelay={200}>
                                        <Tooltip.Trigger>
                                          <Text as="span" fontSize="xs" opacity={0.6} cursor="help">?</Text>
                                        </Tooltip.Trigger>
                                        <Tooltip.Positioner>
                                          <Tooltip.Content>
                                            <Tooltip.Arrow />
                                            <Text fontSize="xs">A token extracted from node labels that identifies a protein.</Text>
                                          </Tooltip.Content>
                                        </Tooltip.Positioner>
                                      </Tooltip.Root>
                                    </HStack>
                                    <HStack gap={2} align="center" justify="space-between">
                                      <HStack gap={2} align="center">
                                        <FiHash opacity={0.8} />
                                        <Text fontWeight="semibold">{protein}</Text>
                                      </HStack>
                                      <HStack gap={2} align="center">
                                        <Badge title="Total occurrences in component" variant="subtle" w="fit-content">{count}</Badge>
                                        <Tooltip.Root openDelay={200}>
                                          <Tooltip.Trigger>
                                            <Button
                                              size="2xs"
                                              variant={highlightProteins.has(protein) ? 'solid' : 'outline'}
                                              onClick={() => {
                                                setHighlightProteins((prev) => {
                                                  const next = new Set(prev)
                                                  if (next.has(protein)) next.delete(protein); else next.add(protein)
                                                  return next
                                                })
                                              }}
                                              title="Toggle highlight"
                                            >
                                              <FiTarget />
                                            </Button>
                                          </Tooltip.Trigger>
                                          <Tooltip.Positioner>
                                            <Tooltip.Content>
                                              <Tooltip.Arrow />
                                              <Text fontSize="xs">Toggle highlight for nodes containing this protein</Text>
                                            </Tooltip.Content>
                                          </Tooltip.Positioner>
                                        </Tooltip.Root>
                                        <Button
                                          size="2xs"
                                          variant="outline"
                                          onClick={() => {
                                            setExpandedProteins((prev) => {
                                              const next = new Set(prev)
                                              if (next.has(protein)) next.delete(protein); else next.add(protein)
                                              return next
                                            })
                                          }}
                                        >
                                          {expandedProteins.has(protein) ? 'Hide details' : 'Show details'}
                                        </Button>
                                      </HStack>
                                    </HStack>
                                  </Stack>

                                  {expandedProteins.has(protein) && (
                                    <>
                                      {/* Metrics: Share and Count */}
                                      <HStack gap={6} mb={2} align="flex-end">
                                        <Stack gap={0} minW="120px">
                                          <HStack gap={2} align="center">
                                            <Text fontSize="xs" opacity={0.8}>Share of component</Text>
                                            <Tooltip.Root openDelay={200}>
                                              <Tooltip.Trigger>
                                                <Text as="span" fontSize="xs" opacity={0.6} cursor="help">?</Text>
                                              </Tooltip.Trigger>
                                              <Tooltip.Positioner>
                                                <Tooltip.Content>
                                                  <Tooltip.Arrow />
                                                  <Text fontSize="xs">Percentage of nodes in this component that contain this protein.</Text>
                                                </Tooltip.Content>
                                              </Tooltip.Positioner>
                                            </Tooltip.Root>
                                          </HStack>
                                          <HStack gap={1} title="Share of nodes in component" opacity={0.9}>
                                            <FiPercent />
                                            <Text>{typeof ratio === 'number' ? `${Math.round(ratio * 100)}%` : '-'}</Text>
                                          </HStack>
                                        </Stack>

                                        <Stack gap={0} minW="120px">
                                          <HStack gap={2} align="center">
                                            <Text fontSize="xs" opacity={0.8}>Count in component</Text>
                                            <Tooltip.Root openDelay={200}>
                                              <Tooltip.Trigger>
                                                <Text as="span" fontSize="xs" opacity={0.6} cursor="help">?</Text>
                                              </Tooltip.Trigger>
                                              <Tooltip.Positioner>
                                                <Tooltip.Content>
                                                  <Tooltip.Arrow />
                                                  <Text fontSize="xs">Number of distinct nodes in this component that include this protein in their label.</Text>
                                                </Tooltip.Content>
                                              </Tooltip.Positioner>
                                            </Tooltip.Root>
                                          </HStack>
                                          <Badge title="Total occurrences in component" variant="subtle" w="fit-content">{count}</Badge>
                                        </Stack>
                                      </HStack>

                                      {/* Type distribution */}
                                      <Stack gap={1} mb={2}>
                                        <HStack gap={2} align="center">
                                          <Text fontSize="xs" opacity={0.8}>Type distribution</Text>
                                          <Tooltip.Root openDelay={200}>
                                            <Tooltip.Trigger>
                                              <Text as="span" fontSize="xs" opacity={0.6} cursor="help">?</Text>
                                            </Tooltip.Trigger>
                                            <Tooltip.Positioner>
                                              <Tooltip.Content>
                                                <Tooltip.Arrow />
                                                <Text fontSize="xs">Breakdown of this protein across node types in the component.</Text>
                                              </Tooltip.Content>
                                            </Tooltip.Positioner>
                                          </Tooltip.Root>
                                        </HStack>
                                        <Box bg="blackAlpha.200" _dark={{ bg: 'whiteAlpha.200' }} h="8px" rounded="sm" position="relative">
                                          <HStack gap={0} w={`${typeof ratio === 'number' ? Math.max(4, Math.round(ratio * 100)) : totalPct}%`} h="100%">
                                            {parts.length === 0 ? (
                                              <Box bg="#4A90E2" h="100%" w="100%" rounded="sm" />
                                            ) : (
                                              parts.map(([t, c], idx) => {
                                                const frac = c / sum
                                                const w = `${Math.max(2, Math.round(frac * 100))}%`
                                                const color = nodeTypeColors[t] || nodeTypeColors.unknown
                                                const leftRadius = idx === 0 ? 6 : 0
                                                const rightRadius = idx === parts.length - 1 ? 6 : 0
                                                return (
                                                  <Box key={`${protein}-${t}`} bg={color} h="100%" w={w} borderTopLeftRadius={leftRadius} borderBottomLeftRadius={leftRadius} borderTopRightRadius={rightRadius} borderBottomRightRadius={rightRadius} />
                                                )
                                              })
                                            )}
                                          </HStack>
                                        </Box>
                                        {parts.length > 0 && (
                                          <HStack gap={2} wrap="wrap">
                                            {parts.map(([t, c]) => (
                                              <Badge key={`${protein}-legend-${t}`} colorScheme="gray" variant="outline" title="Per-type counts and ratio within this protein">
                                                {t}: {c}{typeof type_ratios?.[t] === 'number' ? ` (${Math.round(type_ratios[t] * 100)}%)` : ''}
                                              </Badge>
                                            ))}
                                          </HStack>
                                        )}
                                      </Stack>

                                      {/* Other components */}
                                      <Stack gap={1}>
                                        <HStack gap={2} align="center">
                                          <Text fontSize="xs" opacity={0.8}>Other components</Text>
                                          <Tooltip.Root openDelay={200}>
                                            <Tooltip.Trigger>
                                              <Text as="span" fontSize="xs" opacity={0.6} cursor="help">?</Text>
                                            </Tooltip.Trigger>
                                            <Tooltip.Positioner>
                                              <Tooltip.Content>
                                                <Tooltip.Arrow />
                                                <Text fontSize="xs">Components in the current graph where this protein also appears. Hover to preview, click to navigate.</Text>
                                              </Tooltip.Content>
                                            </Tooltip.Positioner>
                                          </Tooltip.Root>
                                        </HStack>
                                        {typeof other_components === 'number' && other_components > 0 ? (
                                          compMenu.length > 0 ? (
                                            <HStack gap={1} wrap="wrap">
                                              {compMenu.map((it) => (
                                                <Button
                                                  key={`${protein}-comp-${it.cid}`}
                                                  size="2xs"
                                                  variant="outline"
                                                  title={`Component #${it.cid}`}
                                                  onMouseEnter={() => previewComponent(it.cid)}
                                                  onMouseLeave={() => clearHoverPreview(it.cid)}
                                                  onClick={() => {
                                                    if (hoverRevertTimeoutRef.current) {
                                                      window.clearTimeout(hoverRevertTimeoutRef.current)
                                                      hoverRevertTimeoutRef.current = null
                                                    }
                                                    prevViewRef.current = null
                                                    hoveredComponentRef.current = null
                                                    highlightComponent(it.cid)
                                                    setIsDrawerOpen(false)
                                                  }}
                                                >
                                                  #{it.cid}
                                                </Button>
                                              ))}
                                            </HStack>
                                          ) : (
                                            <Badge variant="outline">not found in current view</Badge>
                                          )
                                        ) : (
                                          <Badge variant="outline">in {other_components ?? 0} comps</Badge>
                                        )}
                                      </Stack>
                                    </>
                                  )}
                                </Box>
                              )
                            })}
                          </Stack>
                      )
                    ) : null
                  )}
                  {!selectedNodeInfo && (
                    <HStack justify="flex-end" mt={1}>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setIsDistributionOpen((v) => !v)
                          const id = selectedNode?.id
                          if (id && !selectedNodeInfo && !nodeInfoLoading) fetchNodeComponentInfo(id)
                        }}
                      >
                        {isDistributionOpen ? "Hide" : "Show"}
                      </Button>
                    </HStack>
                  )}
                </Box>

                {/* Highlight options now toggled via settings icon in the Protein distribution header */}
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

export default memo(CytoscapeNetwork)


