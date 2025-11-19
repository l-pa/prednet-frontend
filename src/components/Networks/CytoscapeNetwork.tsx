import { memo, useRef, useEffect, useMemo, useCallback, useState } from "react"
import { Box, Spinner, Stack, Text } from "@chakra-ui/react"
import cytoscape, { type ElementDefinition } from "cytoscape"
import { OpenAPI } from "@/client"
import NetworkToolbar from "@/components/Networks/Cytoscape/NetworkToolbar"
import StylePanel from "@/components/Networks/Cytoscape/StylePanel"
import InfoPanel from "@/components/Networks/Cytoscape/InfoPanel"
import ComponentEdgeFilter from "@/components/Networks/Cytoscape/ComponentEdgeFilter"
import NetworkSidebar from "@/components/Networks/Shared/NetworkSidebar"
import { NetworkSidebarProvider } from "@/components/Networks/Shared/NetworkSidebarContext"
import NetworkCore from "@/components/Networks/Cytoscape/NetworkCore"
import { CytoscapeErrorBoundary } from "@/components/Networks/Cytoscape/ErrorBoundary"
import PerformanceIndicator from "@/components/Networks/Cytoscape/PerformanceIndicator"
import PerformanceWarning from "@/components/Networks/Cytoscape/PerformanceWarning"
import LayoutProgressOverlay from "@/components/Networks/Cytoscape/LayoutProgressOverlay"
import { useNetworkState } from "@/hooks/useNetworkState"
import { useNetworkStyle } from "@/hooks/useNetworkStyle"
import { useProteinHighlight } from "@/hooks/useProteinHighlight"
import { usePerformanceTier } from "@/hooks/usePerformanceTier"
import { useLayoutCancellation, runLayoutWithTimeout } from "@/hooks/useLayoutCancellation"
import { 
  computeComponents, 
  previewComponent as previewComponentUtil, 
  clearHoverPreview as clearHoverPreviewUtil, 
  highlightComponent as highlightComponentUtil 
} from "@/utils/cytoscapeUtils"
import { 
  storeLayoutPreference, 
  getLayoutPreference,
  getColaOptionsForSize 
} from "@/utils/performanceUtils"
import type { CytoscapeGraph, RecommendationAction } from "@/components/Networks/Cytoscape/types"
import type { ProteinCount } from "@/components/Networks/Shared/types"

// Re-export for backward compatibility
export type { CytoscapeGraph } from "@/components/Networks/Cytoscape/types"

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
  layoutName = "elk",
  showControls = true,
  autoRunLayout = true,
  fitOnInit = true,
  wheelSensitivity = 0.2,
  minZoom = 0.01,
  maxZoom = 10,
  networkName,
  filename,
  disableComponentTapHighlight = false,
  initialFavoriteExists,
  fixedComponentId,
}: CytoscapeNetworkProps) => {
  const containerRef = useRef<HTMLDivElement>(null!)
  const cyRef = useRef<cytoscape.Core | null>(null)
  
  // Track layout start time for progress overlay
  const [layoutStartTime, setLayoutStartTime] = useState<number>(Date.now())
  
  // Edge filter state
  const [isEdgeFilterOpen, setIsEdgeFilterOpen] = useState(false)
  const [edgeFilter, setEdgeFilter] = useState<any>(null)
  const [filteredComponents, setFilteredComponents] = useState<Set<number> | null>(null)
  
  // Calculate network size for performance tier
  const nodeCount = useMemo(() => (data.nodes || []).length, [data.nodes])
  const edgeCount = useMemo(() => (data.edges || []).length, [data.edges])
  
  // Check for stored layout preference for similar network sizes
  // This remembers the user's layout choice for networks of similar size during the session
  const preferredLayout = useMemo(() => {
    const stored = getLayoutPreference(nodeCount, edgeCount)
    // Use stored preference if available, otherwise use the provided layoutName
    return stored || layoutName
  }, [nodeCount, edgeCount, layoutName])
  
  // Initialize custom hooks
  const { state: networkState, actions: networkActions } = useNetworkState({
    layoutName: preferredLayout,
    initialFavoriteExists,
  })
  
  const { style: styleState, actions: styleActions } = useNetworkStyle()
  
  const { actions: proteinActions, highlightActiveRef } = useProteinHighlight({
    cy: cyRef.current,
    highlightMode: styleState.highlightMode,
    filterComponentsByProteins: styleState.filterComponentsByProteins,
    highlightProteins: networkState.highlightProteins,
    expandedProteins: networkState.expandedProteins,
    setHighlightProteins: networkActions.setHighlightProteins,
    setExpandedProteins: networkActions.setExpandedProteins,
  })
  
  // Initialize performance tier hook
  const {
    tier: performanceTier,
    shouldShowWarning,
    dismissWarning,
    applyOptimizations,
    getLayoutEstimate,
  } = usePerformanceTier(nodeCount, edgeCount)
  
  // Initialize layout cancellation hook
  const { cancelLayout, isCancelling, applyFallbackLayout } = useLayoutCancellation(
    cyRef.current,
    () => {
      networkActions.setIsLayoutRunning(false)
    }
  )
  // Computed values from network state
  const proteinCountsSorted = useMemo<ProteinCount[]>(() => {
    return (networkState.selectedNodeInfo?.proteinCounts || []).slice()
  }, [networkState.selectedNodeInfo])

  const proteinMaxCount = useMemo(() => {
    const arr = networkState.selectedNodeInfo?.proteinCounts || []
    if (arr.length === 0) return 1
    return Math.max(1, ...arr.map((x) => x.count))
  }, [networkState.selectedNodeInfo])

  // If parent indicates it's already a favorite, reflect that promptly
  useEffect(() => {
    if (initialFavoriteExists) networkActions.setSavedFavoriteOnce(true)
  }, [initialFavoriteExists, networkActions])

  // Prefer a server/provided component id for any writes/checks
  const effectiveComponentId = useMemo<number | null>(() => {
    if (typeof fixedComponentId === 'number') return fixedComponentId
    if (typeof networkState.selectedNodeInfo?.componentId === 'number') return networkState.selectedNodeInfo.componentId
    return null
  }, [fixedComponentId, networkState.selectedNodeInfo?.componentId])

  // When component info is known (or local cid computed), check if it's already in favorites for this user
  useEffect(() => {
    const check = async () => {
      try {
        if (!networkName || !filename) return
        const usedServerCid = (typeof fixedComponentId === 'number') || (typeof networkState.selectedNodeInfo?.componentId === 'number')
        const cid = (typeof fixedComponentId === 'number')
          ? fixedComponentId
          : ((typeof networkState.selectedNodeInfo?.componentId === 'number') ? networkState.selectedNodeInfo?.componentId : networkState.localComponentId)
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
          networkActions.setSavedFavoriteOnce(true)
        } else if (usedServerCid) {
          // Only clear if we checked with a backend-provided component id
          networkActions.setSavedFavoriteOnce(false)
        }
      } catch {
        // ignore
      }
    }
    check()
  }, [networkState.selectedNodeInfo?.componentId, networkState.localComponentId, networkName, filename, fixedComponentId, networkActions])


  // Live-selected label reflecting current nameMode and graph state
  const selectedNodeLiveLabel = useMemo(() => {
    const id = networkState.selectedNode?.id
    const cy = cyRef.current
    if (!id || !cy) return networkState.selectedNode?.label
    try {
      const el = cy.getElementById(String(id))
      const lbl = el?.data("label")
      return typeof lbl === "string" ? lbl : networkState.selectedNode?.label
    } catch {
      return networkState.selectedNode?.label
    }
  }, [networkState.selectedNode?.id, styleState.nameMode, networkState.selectedNode?.label])

  // Tokens from the currently selected node's label
  const nodeLabelProteins = useMemo(() => {
    const lbl = selectedNodeLiveLabel || ""
    try {
      const toks = proteinActions.tokenize(lbl)
      const uniq = Array.from(new Set(toks))
      uniq.sort((a, b) => a.localeCompare(b))
      return uniq
    } catch {
      return [] as string[]
    }
  }, [selectedNodeLiveLabel, proteinActions])

  const fetchNodeComponentInfo = useCallback(
    async (nodeId: string) => {
      if (!nodeId) {
        console.warn('Cannot fetch node info: nodeId is empty')
        return
      }
      
      networkActions.setNodeInfoLoading(true)
      networkActions.setSelectedNodeInfo(null)
      
      try {
        const baseUrl = OpenAPI.BASE || "http://localhost"
        const payload: any = { node_id: nodeId, name_mode: styleState.nameMode }
        
        if (typeof networkName === "string") payload.network = networkName
        if (typeof filename === "string") payload.filename = filename
        
        // Include the current graph from Cytoscape to reflect current labels/name mode
        const cy = cyRef.current
        try {
          if (cy) {
            payload.graph = {
              nodes: cy.nodes().map((n) => ({ data: n.data() })),
              edges: cy.edges().map((e) => ({ data: e.data() })),
            }
          } else {
            const fallbackNodes = (data.nodes || []).map((n) => {
              try {
                const sys = String(n.data?.sys_name ?? n.data?.name ?? n.data?.id ?? "")
                const gene = String(n.data?.gene_name ?? sys)
                const label = styleState.nameMode === 'gene' ? (gene || sys) : (sys || gene)
                return { data: { ...n.data, label } }
              } catch (error) {
                console.warn('Failed to process node data:', error)
                return { data: n.data }
              }
            })
            payload.graph = {
              nodes: fallbackNodes,
              edges: (data.edges || []).map((e) => ({ data: e.data })),
            }
          }
        } catch (error) {
          console.error('Failed to prepare graph data for request:', error)
          throw new Error('Failed to prepare graph data')
        }
        
        const resp = await fetch(`${baseUrl}/api/v1/networks/components/by-node`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        
        if (!resp.ok) {
          const errText = await resp.text().catch(() => "Unknown error")
          console.error("by-node request failed", resp.status, resp.statusText, errText)
          throw new Error(`Backend component lookup failed: ${resp.status} ${resp.statusText}`)
        }
        
        const result = await resp.json()
        console.log("by-node result", result)
        
        // Safely extract response data with validation
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
        
        // Validate and sort protein counts
        const proteinCounts = [...proteinCountsRaw]
          .filter(pc => pc && typeof pc.protein === 'string' && typeof pc.count === 'number')
          .sort((a, b) => (b.count - a.count) || a.protein.localeCompare(b.protein))
        
        // Compute edge type statistics for this component
        let edgeTypeStats: any = undefined
        if (cy && typeof componentId === 'number') {
          try {
            const { computeComponentEdgeStats } = await import('@/utils/cytoscapeUtils')
            const { nidToCid } = computeComponents(cy)
            edgeTypeStats = computeComponentEdgeStats(cy, componentId, nidToCid)
          } catch (error) {
            console.warn('Failed to compute edge statistics:', error)
          }
        }
        
        networkActions.setSelectedNodeInfo({ componentId, componentSize, proteinCounts, edgeTypeStats })
      } catch (err) {
        console.error('Failed to fetch node component info:', err)
        networkActions.setSelectedNodeInfo(null)
      } finally {
        networkActions.setNodeInfoLoading(false)
      }
    },
    [data, networkName, filename, styleState.nameMode, networkActions]
  )

  // Recompute backend details when naming mode changes if details are already loaded
  useEffect(() => {
    if (networkState.selectedNode?.id && networkState.selectedNodeInfo) {
      fetchNodeComponentInfo(networkState.selectedNode.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleState.nameMode])

  

  const availableLayouts = [
    "grid",
    "circle",
    "concentric",
    "breadthfirst",
    "fcose",
    "cose-bilkent",
    "elk",
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
      const label = styleState.nameMode === 'gene' ? (gene || sys) : (sys || gene)
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
  }, [data, edgeSimilarityRange, styleState.nameMode])



  // Locally compute the component id of the currently selected node
  useEffect(() => {
    const cy = cyRef.current
    const nodeId = networkState.selectedNode?.id
    if (!cy || !nodeId) { networkActions.setLocalComponentId(null); return }
    try {
      const { nidToCid } = computeComponents(cy)
      const cid = nidToCid.get(String(nodeId))
      networkActions.setLocalComponentId(typeof cid === 'number' ? cid : null)
    } catch {
      networkActions.setLocalComponentId(null)
    }
  }, [networkState.selectedNode?.id, elements, computeComponents, networkActions])

  // Hover preview support: remember viewport and active hovered component
  const prevViewRef = useRef<{ pan: { x: number; y: number }; zoom: number } | null>(null)
  const hoveredComponentRef = useRef<number | null>(null)
  const hoverRevertTimeoutRef = useRef<number | null>(null)

  const previewComponent = useCallback((componentId: number) => {
    const cy = cyRef.current
    if (!cy) return
    previewComponentUtil(cy, componentId, styleState.selectedBorderWidth, prevViewRef, hoveredComponentRef)
  }, [styleState.selectedBorderWidth])

  const clearHoverPreview = useCallback((componentId: number) => {
    const cy = cyRef.current
    if (!cy) return
    clearHoverPreviewUtil(cy, componentId, prevViewRef, hoveredComponentRef, hoverRevertTimeoutRef)
  }, [])

  // Highlight a whole component by its internal id
  const highlightComponent = useCallback((componentId: number) => {
    const cy = cyRef.current
    if (!cy) return
    highlightComponentUtil(cy, componentId, styleState.selectedBorderWidth)
  }, [styleState.selectedBorderWidth])

  // Event handlers for NetworkCore
  const handleNodeTap = useCallback((nodeId: string, label?: string) => {
    try {
      if (!nodeId) {
        console.warn('handleNodeTap called with empty nodeId')
        return
      }
      
      networkActions.setSelectedNode({ id: nodeId, label })
      // Reset details; will lazily load when sections are expanded
      networkActions.setSelectedNodeInfo(null)
      networkActions.setNodeInfoLoading(false)
      networkActions.setIsIdOpen(false)
      networkActions.setIsNameOpen(false)
      networkActions.setIsComponentOpen(false)
      networkActions.setIsDistributionOpen(false)
      networkActions.setIsNodeProteinOpen(true)
      networkActions.setExpandedProteins(new Set())
      
      // Eagerly fetch to populate protein list for checkboxes
      fetchNodeComponentInfo(nodeId)
      
      // Optionally highlight the entire component on tap (disabled for subgraph view)
      if (!disableComponentTapHighlight) {
        const cy = cyRef.current
        if (cy) {
          try {
            cy.batch(() => {
              cy.nodes().forEach((n) => { n.data("highlight", 0) })
              const node = cy.getElementById(nodeId)
              if (node && node.nonempty()) {
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
              }
            })
          } catch (error) {
            console.warn('Failed to highlight component on node tap:', error)
          }
        }
      }
      
      networkActions.setIsDrawerOpen(true)
    } catch (error) {
      console.error('Error in handleNodeTap:', error)
    }
  }, [networkActions, fetchNodeComponentInfo, disableComponentTapHighlight])

  const handleBackgroundTap = useCallback(() => {
    try {
      const cy = cyRef.current
      if (cy) {
        try {
          cy.batch(() => {
            cy.nodes().forEach((n) => { 
              n.data("highlight", 0)
              n.data("proteinHighlight", 0)
              n.data("dim", 0) 
            })
          })
        } catch (error) {
          console.warn('Failed to clear highlights on background tap:', error)
        }
      }
      
      networkActions.setIsDrawerOpen(false)
      networkActions.setSelectedNode(null)
      networkActions.setHighlightProteins(new Set())
      networkActions.setExpandedProteins(new Set())
    } catch (error) {
      console.error('Error in handleBackgroundTap:', error)
    }
  }, [networkActions])

  // Clear highlight when drawer closes
  useEffect(() => {
    if (networkState.isDrawerOpen) return
    const cy = cyRef.current
    if (!cy) return
    try {
      cy.batch(() => {
        cy.nodes().forEach((n) => { n.data("highlight", 0); n.data("proteinHighlight", 0); n.data("dim", 0) })
      })
    } catch {
      // noop
    }
    networkActions.setHighlightProteins(new Set())
    networkActions.setExpandedProteins(new Set())
  }, [networkState.isDrawerOpen, networkActions])

  // NOTE: Label visibility updates are now handled in NetworkCore component
  // This effect has been removed to avoid redundant style updates
  // See NetworkCore.tsx for the implementation

  // NOTE: Node and edge scale updates are now handled in NetworkCore component
  // This effect has been removed to avoid redundant style updates
  // See NetworkCore.tsx for the implementation

  // NOTE: Border width updates are now handled in NetworkCore component
  // This effect has been removed to avoid redundant style updates
  // See NetworkCore.tsx for the implementation

  // Recompute protein-based highlights when selections or labels change
  useEffect(() => {
    proteinActions.recomputeProteinHighlight()
  }, [proteinActions, elements, styleState.nameMode])

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
          ? 40 * styleState.nodeScale
          : `mapData(max_OS_ref, ${nodeMin}, ${nodeMax}, ${25 * styleState.nodeScale}, ${60 * styleState.nodeScale})`
      const edgeWidthValue =
        edgeWMin === edgeWMax
          ? 5 * styleState.edgeScale
          : `mapData(weight, ${edgeWMin}, ${edgeWMax}, ${5 * styleState.edgeScale}, ${20 * styleState.edgeScale})`
      cy.nodes().style("width", nodeSizeValue)
      cy.nodes().style("height", nodeSizeValue)
      cy.edges().style("width", edgeWidthValue)

      if (autoRunLayout) {
        setLayoutStartTime(Date.now())
        networkActions.setIsLayoutRunning(true)
        const onStop = () => {
          cy.off('layoutstop', onStop)
          networkActions.setIsLayoutRunning(false)
          // Use a small delay to ensure layout positions are finalized
          setTimeout(() => {
            try {
              cy.fit(undefined, 50)
            } catch (fitError) {
              console.error('Error fitting view:', fitError)
            }
          }, 50)
        }
        cy.one('layoutstop', onStop)
        if (networkState.selectedLayout === "concentric-attribute") {
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
          const name = networkState.selectedLayout as any
          const common = { animate: false, fit: false, worker: true } as any
          const opts = name === 'fcose'
            ? { name, quality: 'default', randomize: true, animate: false, fit: false, idealEdgeLength: 50, nodeRepulsion: 4500, edgeElasticity: 0.45, gravity: 0.25, numIter: 2500, packComponents: true, tilingPaddingVertical: 50, tilingPaddingHorizontal: 50 }
            : name === 'cose-bilkent'
            ? { name, quality: 'default', randomize: false, nodeRepulsion: 4500, idealEdgeLength: 50, edgeElasticity: 0.45, nestingFactor: 0.1, gravity: 0.25, numIter: 2500, tile: true, tilingPaddingVertical: 50, tilingPaddingHorizontal: 50, animate: false, fit: false }
            : name === 'cola'
            ? getColaOptionsForSize(nodeCount)
            : name === 'elk'
            ? ({ name: 'elk', nodeDimensionsIncludeLabels: true, fit: false, animate: false, worker: true, elk: { algorithm: 'force', 'elk.force.repulsion': 20, 'elk.force.temperature': 0.001, 'elk.force.iterations': 300, 'elk.spacing.componentComponent': 10, 'elk.spacing.nodeNode': 20 } } as any)
            : name === 'dagre'
            ? { name: 'dagre', nodeSep: 50, edgeSep: 10, rankSep: 50, rankDir: 'TB', ranker: 'network-simplex', fit: false, animate: false }
            : { name, ...common }
          try { cy.layout(opts).run() } catch { cy.layout({ name: networkState.selectedLayout as any, animate: false, fit: false, worker: true } as any).run() }
        }
      } else if (fitOnInit && wasEmpty) {
        cy.fit(undefined, 20)
      }
    })

    // Client no longer computes components; backend will provide info per selected node
  }, [elements, networkState.selectedLayout, autoRunLayout, fitOnInit, styleState.nodeScale, styleState.edgeScale, nodeMaxRefRange, edgeWeightRange, networkActions])

  const handleRunLayout = useCallback(() => {
    const cy = cyRef.current
    if (!cy) {
      console.warn('Cannot run layout: Cytoscape instance not initialized')
      return
    }
    
    try {
      // Track layout start time for progress overlay
      setLayoutStartTime(Date.now())
      networkActions.setIsLayoutRunning(true)
      
      // Handler for successful layout completion
      const handleComplete = () => {
        try {
          networkActions.setIsLayoutRunning(false)
          // Use a small delay to ensure layout positions are finalized
          setTimeout(() => {
            try {
              cy.fit(undefined, 50)
            } catch (fitError) {
              console.error('Error fitting view:', fitError)
            }
          }, 50)
        } catch (error) {
          console.error('Error in layout completion handler:', error)
          networkActions.setIsLayoutRunning(false)
        }
      }

      // Handler for layout timeout - trigger cancellation and show suggestion
      const handleTimeout = () => {
        console.warn('Layout computation timed out, applying fallback layout')
        
        // Log timeout event for debugging
        console.log('Layout timeout details:', {
          layout: networkState.selectedLayout,
          nodeCount: cy.nodes().length,
          edgeCount: cy.edges().length,
          timestamp: new Date().toISOString(),
        })

        // Apply fallback layout using the cancellation hook
        applyFallbackLayout()
      }

      // Get layout options based on selected layout
      let layoutOptions: any

      if (networkState.selectedLayout === "concentric-attribute") {
        const ranks: Record<string, number> = {
          matched_prediction: 4,
          matched_reference: 3,
          prediction: 2,
          reference: 1,
        }
        
        layoutOptions = {
          name: "concentric",
          concentric: (node: any) => {
            const t = String(node.data("type") ?? "")
            return ranks[t] ?? 0
          },
          levelWidth: () => 1,
          animate: false,
          avoidOverlap: true,
          startAngle: 3.1415 / 2,
          sweep: 3.1415 * 2,
          fit: false,
        }
      } else {
        const name = networkState.selectedLayout as any
        const common = { animate: false, fit: false, worker: true } as any
        const opts = name === 'fcose'
          ? { name, quality: 'default', randomize: true, animate: false, fit: false, idealEdgeLength: 50, nodeRepulsion: 4500, edgeElasticity: 0.45, gravity: 0.25, numIter: 2500, packComponents: true, tilingPaddingVertical: 50, tilingPaddingHorizontal: 50 }
          : name === 'cose-bilkent'
          ? { name, quality: 'default', randomize: false, nodeRepulsion: 4500, idealEdgeLength: 50, edgeElasticity: 0.45, nestingFactor: 0.1, gravity: 0.25, numIter: 2500, tile: true, tilingPaddingVertical: 50, tilingPaddingHorizontal: 50, animate: false, fit: false }
          : name === 'cola'
          ? getColaOptionsForSize(nodeCount)
          : name === 'elk'
          ? { name: 'elk', nodeDimensionsIncludeLabels: true, fit: false, animate: false, worker: true, elk: { algorithm: 'force', 'elk.force.repulsion': 20, 'elk.force.temperature': 0.001, 'elk.force.iterations': 300, 'elk.spacing.componentComponent': 10, 'elk.spacing.nodeNode': 20 } }
          : name === 'dagre'
          ? { name: 'dagre', nodeSep: 50, edgeSep: 10, rankSep: 50, rankDir: 'TB', ranker: 'network-simplex', fit: false, animate: false }
          : { name, ...common }
        
        layoutOptions = opts
      }

      // Run layout with timeout protection (30 seconds)
      runLayoutWithTimeout(
        cy,
        layoutOptions,
        handleComplete,
        handleTimeout,
        30000
      )
    } catch (error) {
      console.error('Unexpected error in handleRunLayout:', error)
      networkActions.setIsLayoutRunning(false)
    }
  }, [networkState.selectedLayout, networkActions, applyFallbackLayout])

  const handleResetView = useCallback(() => {
    const cy = cyRef.current
    if (!cy) {
      console.warn('Cannot reset view: Cytoscape instance not initialized')
      return
    }
    try {
      cy.fit(undefined, 20)
    } catch (error) {
      console.error('Failed to reset view:', error)
    }
  }, [])
  
  // Handle performance warning recommendation actions
  const handleApplyRecommendation = useCallback((action: RecommendationAction) => {
    if (action.type === 'switch-layout' && action.payload?.layoutName) {
      // Store the user's layout preference when they accept a recommendation
      storeLayoutPreference(action.payload.layoutName, nodeCount, edgeCount)
      networkActions.setSelectedLayout(action.payload.layoutName)
      // Automatically run the new layout
      setTimeout(() => {
        handleRunLayout()
      }, 100)
    }
  }, [networkActions, handleRunLayout, nodeCount, edgeCount])
  
  // Handle layout cancellation
  const handleCancelLayout = useCallback(() => {
    cancelLayout()
  }, [cancelLayout])

  return (
    <Box position="relative" width="100%" height={typeof height === "number" ? `${height}px` : height}>
      {/* Performance Warning - shown at the top if needed */}
      {(shouldShowWarning && performanceTier.name !== 'optimal') || (networkState.selectedLayout === 'cola' && nodeCount > 1000) ? (
        <Box position="absolute" top={2} left={2} right={2} zIndex={4} maxW="600px">
          <PerformanceWarning
            tier={performanceTier}
            nodeCount={nodeCount}
            edgeCount={edgeCount}
            currentLayout={networkState.selectedLayout}
            onDismiss={dismissWarning}
            onApplyRecommendation={handleApplyRecommendation}
          />
        </Box>
      ) : null}
      
      <NetworkToolbar
        showControls={showControls}
        selectedLayout={networkState.selectedLayout}
        isLayoutRunning={networkState.isLayoutRunning}
        onLayoutChange={(v) => {
          // Store the user's layout preference for similar network sizes
          storeLayoutPreference(v, nodeCount, edgeCount)
          networkActions.setSelectedLayout(v)
        }}
        onToggleStylePanel={() => {
          networkActions.setIsStylePanelOpen(!networkState.isStylePanelOpen)
          networkActions.setIsInfoPanelOpen(false)
          setIsEdgeFilterOpen(false)
        }}
        onToggleInfoPanel={() => {
          networkActions.setIsInfoPanelOpen(!networkState.isInfoPanelOpen)
          networkActions.setIsStylePanelOpen(false)
          setIsEdgeFilterOpen(false)
        }}
        onToggleEdgeFilter={() => {
          setIsEdgeFilterOpen(!isEdgeFilterOpen)
          networkActions.setIsStylePanelOpen(false)
          networkActions.setIsInfoPanelOpen(false)
        }}
        onRunLayout={handleRunLayout}
        onResetView={handleResetView}
        performanceIndicator={
          <PerformanceIndicator
            nodeCount={nodeCount}
            edgeCount={edgeCount}
            currentTier={performanceTier}
            estimatedLayoutTime={getLayoutEstimate(networkState.selectedLayout)}
          />
        }
      />
      <StylePanel
        isOpen={networkState.isStylePanelOpen}
        onClose={() => networkActions.setIsStylePanelOpen(false)}
        showLabels={styleState.showLabels}
        onShowLabelsChange={styleActions.setShowLabels}
        nameMode={styleState.nameMode}
        onNameModeChange={styleActions.setNameMode}
        nodeScale={styleState.nodeScale}
        onNodeScaleChange={styleActions.setNodeScale}
        edgeScale={styleState.edgeScale}
        onEdgeScaleChange={styleActions.setEdgeScale}
        selectedBorderWidth={styleState.selectedBorderWidth}
        onSelectedBorderWidthChange={styleActions.setSelectedBorderWidth}
        enableHoverInfo={styleState.enableHoverInfo}
        onEnableHoverInfoChange={styleActions.setEnableHoverInfo}
        hoverLabelScale={styleState.hoverLabelScale}
        onHoverLabelScaleChange={styleActions.setHoverLabelScale}
      />
      <InfoPanel
        isOpen={networkState.isInfoPanelOpen}
        onClose={() => networkActions.setIsInfoPanelOpen(false)}
        networkStats={networkStats}
        nodeTypeColors={nodeTypeColors}
        cy={cyRef.current}
      />
      
      {isEdgeFilterOpen && (
        <Box
          position="absolute"
          top={10}
          right={2}
          zIndex={2}
        >
          <ComponentEdgeFilter
            onApplyFilter={async (filter) => {
              const cy = cyRef.current
              if (!cy) return
              
              try {
                const { filterComponentsByEdgeTypes } = await import('@/utils/cytoscapeUtils')
                const matching = filterComponentsByEdgeTypes(cy, filter)
                setFilteredComponents(matching)
                setEdgeFilter(filter)
                
                // Highlight matching components
                cy.batch(() => {
                  cy.nodes().forEach((n) => {
                    n.data('highlight', 0)
                  })
                  
                  const { nidToCid } = computeComponents(cy)
                  nidToCid.forEach((cid, nid) => {
                    if (matching.has(cid)) {
                      const node = cy.getElementById(nid)
                      if (node && node.nonempty()) {
                        node.data('highlight', 1)
                      }
                    }
                  })
                })
              } catch (error) {
                console.error('Failed to apply edge filter:', error)
              }
            }}
            onClearFilter={() => {
              setFilteredComponents(null)
              setEdgeFilter(null)
              
              const cy = cyRef.current
              if (cy) {
                cy.batch(() => {
                  cy.nodes().forEach((n) => {
                    n.data('highlight', 0)
                  })
                })
              }
            }}
          />
        </Box>
      )}
      
      <NetworkCore
        containerRef={containerRef}
        cyRef={cyRef}
        elements={elements}
        config={{
          wheelSensitivity,
          minZoom,
          maxZoom,
          isBigGraph,
          showLabels: styleState.showLabels,
          nodeScale: styleState.nodeScale,
          edgeScale: styleState.edgeScale,
          selectedBorderWidth: styleState.selectedBorderWidth,
          enableHoverInfo: styleState.enableHoverInfo,
          highlightActiveRef,
          performanceTier: performanceTier.name,
          hoverLabelScale: styleState.hoverLabelScale,
        }}
        onNodeTap={handleNodeTap}
        onBackgroundTap={handleBackgroundTap}
      />

      {networkState.runningBackend && (
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

      {/* Enhanced Layout Progress Overlay with cancellation support */}
      {networkState.isLayoutRunning && !networkState.runningBackend && (
        <LayoutProgressOverlay
          isRunning={networkState.isLayoutRunning}
          layoutName={networkState.selectedLayout}
          nodeCount={nodeCount}
          edgeCount={edgeCount}
          startTime={layoutStartTime}
          estimatedTime={getLayoutEstimate(networkState.selectedLayout)}
          onCancel={handleCancelLayout}
        />
      )}

      <NetworkSidebarProvider
        value={{
          isDrawerOpen: networkState.isDrawerOpen,
          setIsDrawerOpen: (open) => networkActions.setIsDrawerOpen(open),
          selectedNode: networkState.selectedNode,
          nodeInfoLoading: networkState.nodeInfoLoading,
          selectedNodeInfo: networkState.selectedNodeInfo,
          networkName,
          filename,
          fixedComponentId,
          effectiveComponentId,
          savingFavorite: networkState.savingFavorite,
          savedFavoriteOnce: networkState.savedFavoriteOnce,
          setSavingFavorite: networkActions.setSavingFavorite,
          setSavedFavoriteOnce: networkActions.setSavedFavoriteOnce,
          fetchNodeComponentInfo,
          isIdOpen: networkState.isIdOpen,
          setIsIdOpen: networkActions.setIsIdOpen,
          isComponentOpen: networkState.isComponentOpen,
          setIsComponentOpen: networkActions.setIsComponentOpen,
          isDistributionOpen: networkState.isDistributionOpen,
          setIsDistributionOpen: networkActions.setIsDistributionOpen,
          isNodeProteinOpen: networkState.isNodeProteinOpen,
          setIsNodeProteinOpen: networkActions.setIsNodeProteinOpen,
          proteinCountsSorted: proteinCountsSorted as any,
          proteinMaxCount,
          nodeLabelProteins,
          computeComponents: computeComponents as any,
          previewComponent,
          clearHoverPreview,
          highlightComponent,
          highlightProteins: networkState.highlightProteins,
          setHighlightProteins: (next) => networkActions.setHighlightProteins(new Set(next)),
          expandedProteins: networkState.expandedProteins,
          setExpandedProteins: (next) => networkActions.setExpandedProteins(new Set(next)),
          selectedForComparison: networkState.selectedForComparison,
          setSelectedForComparison: (next) => networkActions.setSelectedForComparison(new Set(next)),
          comparisonModalOpen: networkState.comparisonModalOpen,
          setComparisonModalOpen: networkActions.setComparisonModalOpen,
          dataSource: networkState.dataSource,
          graphRef: cyRef,
          hoverRevertTimeoutRef,
          prevViewRef,
        }}
      >
        <NetworkSidebar />
      </NetworkSidebarProvider>
    </Box>
  )
}

// Wrap with error boundary for graceful error handling
const CytoscapeNetworkWithErrorBoundary = (props: CytoscapeNetworkProps) => (
  <CytoscapeErrorBoundary>
    <CytoscapeNetwork {...props} />
  </CytoscapeErrorBoundary>
)

export default memo(CytoscapeNetworkWithErrorBoundary)
