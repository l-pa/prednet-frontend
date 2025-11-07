import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Button,
  HStack,
  Stack,
  Text,
  Badge,
  Spinner,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  PopoverRoot,
  Portal,
} from "@chakra-ui/react"
import { FiPlay, FiRefreshCw, FiHash, FiPercent, FiSettings, FiTarget } from "react-icons/fi"
import { OpenAPI } from "@/client"
import Graph from "graphology"
import Sigma from "sigma"
import NetworkSidebar from "@/components/Networks/Shared/NetworkSidebar"
import { NetworkSidebarProvider } from "@/components/Networks/Shared/NetworkSidebarContext"
import { computeComponents, previewComponent as previewComponentUtil, clearHoverPreview as clearHoverPreviewUtil, highlightComponent as highlightComponentUtil } from "@/utils/graphologyUtils"

// Define the types for the graph data
type CytoscapeNode = { data: Record<string, any> }
type CytoscapeEdge = { data: Record<string, any> }
export type CytoscapeGraph = { nodes: CytoscapeNode[]; edges: CytoscapeEdge[] }

// Define the props interface for the component
interface SigmaNetworkProps {
  data: CytoscapeGraph
  height?: string | number
  layoutName?: string
  showControls?: boolean
  autoRunLayout?: boolean
  fitOnInit?: boolean
  networkName?: string
  filename?: string
  initialFavoriteExists?: boolean
  fixedComponentId?: number
}

// Initial default settings
const defaultLayoutSettings = {
  iterations: 3000,
  chunkSize: 50,
  gravity: 1,
  slowDown: 10,
  linLog: true,
  strongGravityMode: false,
  adjustSizes: true,
  barnesHutOptimize: true,
  barnesHutTheta: 0.5,
  edgeWeightInfluence: 1,
  outboundAttractionDistribution: true,
  scalingRatio: 10,
}

const defaultStyleSettings = {
  showLabels: false,
  nodeScale: 1,
  nodeRangeFactor: 1,
  edgeScale: 1,
  nameMode: "systematic" as "systematic" | "gene",
  selectedLayout: "fa2",
  enableHoverInfo: true,
  filterComponentsByProteins: false,
  highlightMode: "AND" as "AND" | "OR",
  selectedBorderWidth: 0,
}


const SigmaNetwork = ({
  data,
  height = "500px",
  layoutName = "fcose",
  showControls = true,
  fitOnInit = false,
  networkName,
  filename,
  initialFavoriteExists,
  fixedComponentId,
}: SigmaNetworkProps) => {
  // Refs
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const layoutWorkerRef = useRef<Worker | null>(null)

  // State Management
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<{ id: string; label?: string } | null>(null)
  const [nodeInfoLoading, setNodeInfoLoading] = useState(false)
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<any | null>(null)
  const [isLayoutRunning, setIsLayoutRunning] = useState(false)

  // ===================== REFACTOR START =====================
  // Consolidate layout settings into a single state object that reads from localStorage
  const [layoutSettings, setLayoutSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("network.layout") || "{}")
      return { ...defaultLayoutSettings, ...saved }
    } catch {
      return defaultLayoutSettings
    }
  })

  // Create a single updater function that sets state AND saves to localStorage immediately
  const updateLayoutSetting = useCallback(<K extends keyof typeof defaultLayoutSettings>(key: K, value: (typeof defaultLayoutSettings)[K]) => {
    const newSettings = { ...layoutSettings, [key]: value };
    // 1. Update React state
    setLayoutSettings(newSettings)
    // 2. Immediately persist to localStorage
    try {
      localStorage.setItem("network.layout", JSON.stringify(newSettings))
    } catch (e) {
      console.error("Failed to save layout settings:", e)
    }
  }, [layoutSettings])

  // Consolidate style settings into a single state object
  const [styleSettings, setStyleSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("network.style") || "{}")
      // Ensure layout name is valid
      const layout = saved.selectedLayout
      if (layout && !['fa2', 'random', 'circle', 'grid'].includes(layout)) {
        saved.selectedLayout = 'fa2'
      }
      return { ...defaultStyleSettings, ...saved }
    } catch {
      return defaultStyleSettings
    }
  })

  // Single updater for style settings
  const updateStyleSetting = useCallback(<K extends keyof typeof defaultStyleSettings>(key: K, value: (typeof defaultStyleSettings)[K]) => {
    const newSettings = { ...styleSettings, [key]: value };
    // 1. Update React state
    setStyleSettings(newSettings)
    // 2. Immediately persist to localStorage
    try {
      localStorage.setItem("network.style", JSON.stringify(newSettings))
      window.dispatchEvent(new Event("network-style-changed"))
    } catch (e) {
      console.error("Failed to save style settings:", e)
    }
  }, [styleSettings])
  // ===================== REFACTOR END =======================

  // Refs for reducers that need instant access to state
  const showLabelsRef = useRef<boolean>(styleSettings.showLabels)
  useEffect(() => {
    showLabelsRef.current = !!styleSettings.showLabels
  }, [styleSettings.showLabels])

  const [isIdOpen, setIsIdOpen] = useState(false)
  const [isComponentOpen, setIsComponentOpen] = useState(false)
  const [isDistributionOpen, setIsDistributionOpen] = useState(false)
  const [savingFavorite, setSavingFavorite] = useState(false)
  const [savedFavoriteOnce, setSavedFavoriteOnce] = useState(() => !!initialFavoriteExists)
  const [isNodeProteinOpen, setIsNodeProteinOpen] = useState(false)
  const [isNodeHighlightOptionsOpen, setIsNodeHighlightOptionsOpen] = useState(false)
  const [highlightProteins, setHighlightProteins] = useState<Set<string>>(new Set())
  const [expandedProteins, setExpandedProteins] = useState<Set<string>>(new Set())

  // Memoized calculations for performance
  const proteinCountsSorted = useMemo(() => {
    return (selectedNodeInfo?.proteinCounts || []).slice()
  }, [selectedNodeInfo])

  const proteinMaxCount = useMemo(() => {
    const arr = selectedNodeInfo?.proteinCounts || []
    if (arr.length === 0) return 1
    return Math.max(1, ...arr.map((x: any) => x.count))
  }, [selectedNodeInfo])

  const effectiveComponentId = useMemo<number | null>(() => {
    if (typeof fixedComponentId === "number") return fixedComponentId
    if (typeof selectedNodeInfo?.componentId === "number") return selectedNodeInfo.componentId
    return null
  }, [fixedComponentId, selectedNodeInfo?.componentId])

  const tokenize = useCallback((s: string) => s.split(/\s+/).filter(Boolean), [])

  const selectedNodeLiveLabel = useMemo(() => {
    const id = selectedNode?.id
    const graph = graphRef.current
    if (!id || !graph || !graph.hasNode(id)) return selectedNode?.label
    return graph.getNodeAttribute(id, "label") as string | undefined
  }, [selectedNode?.id, styleSettings.nameMode])

  const nodeLabelProteins = useMemo(() => {
    const id = selectedNode?.id
    const graph = graphRef.current
    let pool = selectedNodeLiveLabel || ""
    if (id && graph && graph.hasNode(id)) {
      const attrs = graph.getNodeAttributes(id) as any
      const extras = [attrs.label_sys, attrs.sys_name, attrs.label_gene, attrs.gene_name, attrs.name]
        .filter((v) => typeof v === 'string')
        .join(' ')
      pool = `${pool} ${extras}`.trim()
    }
    const toks = tokenize(pool)
    const uniq = Array.from(new Set(toks))
    uniq.sort((a, b) => a.localeCompare(b))
    return uniq
  }, [selectedNode?.id, selectedNodeLiveLabel, tokenize])

  // API Call to fetch node details
  const fetchNodeComponentInfo = useCallback(
    async (nodeId: string) => {
      setNodeInfoLoading(true)
      setSelectedNodeInfo(null)
      try {
        const baseUrl = OpenAPI.BASE || "http://localhost"
        const graph = graphRef.current
        const payload: any = { node_id: nodeId, name_mode: styleSettings.nameMode }
        if (networkName) payload.network = networkName
        if (filename) payload.filename = filename
        if (data) {
          const nodesWithLabel = (data.nodes || []).map((n) => {
            const sys = String(n.data?.label_sys ?? n.data?.sys_name ?? n.data?.name ?? n.data?.id ?? "")
            const gene = String(n.data?.label_gene ?? n.data?.gene_name ?? sys)
            const label = styleSettings.nameMode === "gene" ? (gene || sys) : (sys || gene)
            return { data: { ...n.data, label } }
          })
          payload.graph = {
            nodes: nodesWithLabel,
            edges: (data.edges || []).map((e) => ({ data: e.data })),
          }
        }
        const resp = await fetch(`${baseUrl}/api/v1/networks/components/by-node`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!resp.ok) throw new Error("Backend lookup failed")
        const result = await resp.json()
        const componentId: number | undefined = result.component_id ?? result.componentId
        const componentSize: number | undefined = result.size ?? result.component_size ?? result.componentSize
        const proteinCountsRaw: any[] = (result.protein_counts ?? result.proteinCounts ?? [])
        const proteinCounts = [...proteinCountsRaw].sort(
          (a, b) => (b.count - a.count) || a.protein.localeCompare(b.protein)
        )
        setSelectedNodeInfo({ componentId, componentSize, proteinCounts })
      } catch (err) {
        console.error(err)
        setSelectedNodeInfo(null)
      } finally {
        setNodeInfoLoading(false)
      }
    },
    [networkName, filename, styleSettings.nameMode]
  )

  // Side Effects
  useEffect(() => {
    if (initialFavoriteExists) setSavedFavoriteOnce(true)
  }, [initialFavoriteExists])

  useEffect(() => {
    return () => {
      try { layoutWorkerRef.current?.postMessage({ type: 'stop' }) } catch { }
      try { layoutWorkerRef.current?.terminate() } catch { }
      layoutWorkerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (selectedNode?.id && selectedNodeInfo) {
      fetchNodeComponentInfo(selectedNode.id)
    }
  }, [styleSettings.nameMode, selectedNode, fetchNodeComponentInfo])

  // Color and range helpers
  const nodeTypeColors = useMemo(() => ({
    matched_prediction: "#74C476",
    matched_reference: "#67A9CF",
    prediction: "#FCCF40",
    reference: "#D94801",
    unknown: "#cccccc",
  }), []);

  const edgeSimilarityRange = useMemo(() => {
    const values = (data.edges || []).map((e) => Number(e.data?.wang_similarity)).filter(Number.isFinite);
    if (values.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [data]);

  function hexToRgb(hex: string) {
    const bigint = parseInt(hex.slice(1), 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }

  function rgbToHex(r: number, g: number, b: number) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')}`;
  }

  function interpolate(a: number, b: number, t: number) {
    return Math.round(a + (b - a) * t);
  }

  function edgeColorForSimilarity(value: number, min: number, max: number) {
    const c1 = hexToRgb("#AFAFAF"), c2 = hexToRgb("#DF65B0"), c3 = hexToRgb("#980043");
    if (max <= min) return "#AFAFAF";
    const mid = (min + max) / 2;
    if (value <= mid) {
      const t = (value - min) / (mid - min || 1);
      return rgbToHex(interpolate(c1.r, c2.r, t), interpolate(c1.g, c2.g, t), interpolate(c1.b, c2.b, t));
    }
    const t = (value - mid) / (max - mid || 1);
    return rgbToHex(interpolate(c2.r, c3.r, t), interpolate(c2.g, c3.g, t), interpolate(c2.b, c3.b, t));
  }

  // Sigma & Graphology Initialization and Event Handling
  useEffect(() => {
    if (!containerRef.current) return

    const graph = new Graph({ multi: false, type: "undirected" })
    graphRef.current = graph
    const renderer = new Sigma(graph, containerRef.current, {
      enableEdgeEvents: true,
      nodeReducer: (node, data) => {
        const res = { ...data }
        if (data.highlighted) {
          res.color = "#2196F3"
          res.zIndex = 1
        } else if (data.dimmed) {
          res.color = "#e2e8f0"
          res.label = ""
        } else {
          const nodeType = String((data as any).node_type ?? "unknown")
          res.color = nodeTypeColors[nodeType as keyof typeof nodeTypeColors] || nodeTypeColors.unknown
        }
        if (!showLabelsRef.current) {
          (res as any).label = ""
        }
        return res
      },
      edgeReducer: (edge, data) => {
        const res = { ...data }
        if (data.hidden) res.hidden = true
        return res
      }
    })
    sigmaRef.current = renderer

    renderer.on("clickNode", ({ node }) => {
      const label = graph.getNodeAttribute(node, "label") as string
      setSelectedNode({ id: node, label })
      setIsDrawerOpen(true)
      fetchNodeComponentInfo(node)
    })

    renderer.on("clickStage", () => {
      setIsDrawerOpen(false)
      setSelectedNode(null)
      setHighlightProteins(new Set())
      graph.forEachNode(n => graph.setNodeAttribute(n, 'highlighted', false).setNodeAttribute(n, 'dimmed', false))
    })

    let draggedNode: string | null = null;
    renderer.on("downNode", (e) => {
      draggedNode = e.node;
      renderer.getCamera().disable();
    });
    renderer.getMouseCaptor().on("mousemove", (e) => {
      if (!draggedNode) return;
      const pos = renderer.viewportToGraph(e);
      graph.setNodeAttribute(draggedNode, 'x', pos.x);
      graph.setNodeAttribute(draggedNode, 'y', pos.y);
    });
    renderer.getMouseCaptor().on("mouseup", () => {
      draggedNode = null;
      renderer.getCamera().enable();
    });

    const ro = new ResizeObserver(() => renderer.refresh())
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      renderer.kill()
    }
  }, [fetchNodeComponentInfo, nodeTypeColors])

// Effect to load graph data
useEffect(() => {
  const graph = graphRef.current
  if (!graph || !data) return

  graph.clear()

  const values = (data.nodes || []).map((n) => Number((n as any)?.data?.max_OS_ref)).filter(Number.isFinite)
  const hasValues = values.length > 0
  const valMin = hasValues ? Math.min(...values) : 0
  const valMax = hasValues ? Math.max(...values) : 1
  const baseMin = 12.5, baseMax = 30, mid = (baseMin + baseMax) / 2
  const half = (baseMax - baseMin) / 2
  const effectiveHalf = half * Math.max(0, Math.min(1, styleSettings.nodeRangeFactor))
  const radiusMin = mid - effectiveHalf
  const radiusMax = mid + effectiveHalf
  const defaultRadius = 20

  function mapMaxOsRefToRadius(v: any): number {
    const x = Number(v)
    if (!Number.isFinite(x) || valMin === valMax) return defaultRadius
    const t = Math.max(0, Math.min(1, (x - valMin) / (valMax - valMin)))
    return radiusMin + (radiusMax - radiusMin) * t
  }

  // ===================== FIX STARTS HERE =====================
  ;(data.nodes || []).forEach((n) => {
      const id = String(n.data.id)
      const sys = String(n.data.label_sys ?? n.data.sys_name ?? n.data.name ?? id)
      const gene = String(n.data.label_gene ?? n.data.gene_name ?? sys)
      const label = styleSettings.nameMode === "gene" ? gene || sys : sys || gene
      const baseRadius = mapMaxOsRefToRadius((n as any)?.data?.max_OS_ref)
      
      // Clone the data attributes and explicitly delete the `type` property
      const nodeAttributes = { ...n.data };
      delete nodeAttributes.type; // This prevents the error

      graph.addNode(id, {
          ...nodeAttributes,
          node_type: String(n.data.type ?? "unknown"), // Use original type for coloring
          label,
          base_node_size: baseRadius,
          size: baseRadius * styleSettings.nodeScale,
          x: Math.random() * 100,
          y: Math.random() * 100,
      })
  });
  // ===================== FIX ENDS HERE =======================

  ;(data.edges || []).forEach((e, i) => {
      const source = String(e.data.source)
      const target = String(e.data.target)
      if (graph.hasNode(source) && graph.hasNode(target)) {
          const sim = Number(e.data?.wang_similarity)
          const color = Number.isFinite(sim)
              ? edgeColorForSimilarity(sim, edgeSimilarityRange.min, edgeSimilarityRange.max)
              : "#AFAFAF"
          graph.addEdge(source, target, {
              ...e.data,
              id: e.data.id || `edge-${i}`,
              base_edge_size: 1.5,
              size: 1.5 * styleSettings.edgeScale,
              color,
          })
      }
  })
}, [data, fitOnInit, edgeSimilarityRange, styleSettings]) // Added styleSettings to dependencies

  // Update styles without rebuilding graph
  useEffect(() => {
    const graph = graphRef.current; if (!graph) return;
    const { nodeScale, edgeScale } = styleSettings;
    graph.forEachNode((node, attrs) => {
      const base = (attrs as any).base_node_size ?? 8;
      graph.setNodeAttribute(node, 'size', base * nodeScale);
    });
    graph.forEachEdge((edge, attrs) => {
      const base = (attrs as any).base_edge_size ?? 1.5;
      graph.setEdgeAttribute(edge, 'size', base * edgeScale);
    });
  }, [styleSettings.nodeScale, styleSettings.edgeScale]);

  useEffect(() => {
    const graph = graphRef.current; if (!graph || !data) return;
    const values = (data.nodes || []).map((n) => Number((n as any)?.data?.max_OS_ref)).filter(Number.isFinite);
    const hasValues = values.length > 0;
    const valMin = hasValues ? Math.min(...values) : 0;
    const valMax = hasValues ? Math.max(...values) : 1;
    const baseMin = 12.5, baseMax = 30, mid = (baseMin + baseMax) / 2, half = (baseMax - baseMin) / 2;
    const effectiveHalf = half * Math.max(0, Math.min(1, styleSettings.nodeRangeFactor));
    const radiusMin = mid - effectiveHalf;
    const radiusMax = mid + effectiveHalf;
    const defaultRadius = 20;

    graph.forEachNode((node, attrs) => {
      const v = Number((attrs as any).max_OS_ref);
      let base = defaultRadius;
      if (Number.isFinite(v) && valMin !== valMax) {
        const t = Math.max(0, Math.min(1, (v - valMin) / (valMax - valMin)));
        base = radiusMin + (radiusMax - radiusMin) * t;
      }
      graph.setNodeAttribute(node, 'base_node_size', base);
      graph.setNodeAttribute(node, 'size', base * styleSettings.nodeScale);
    });
  }, [styleSettings.nodeRangeFactor, data, styleSettings.nodeScale]);

  // Update labels in place
  useEffect(() => {
    const graph = graphRef.current; if (!graph) return;
    graph.forEachNode((node, attrs) => {
      const a: any = attrs;
      const sys = String(a.label_sys ?? a.sys_name ?? a.name ?? node);
      const gene = String(a.label_gene ?? a.gene_name ?? sys);
      const label = styleSettings.nameMode === 'gene' ? (gene || sys) : (sys || gene);
      graph.setNodeAttribute(node, 'label', label);
    });
  }, [styleSettings.nameMode]);

  // Refresh renderer on visual-only changes
  useEffect(() => {
    sigmaRef.current?.refresh();
  }, [styleSettings.showLabels, styleSettings.nameMode]);


  // Highlighting Logic
  const recomputeProteinHighlight = useCallback(() => {
    const graph = graphRef.current; if (!graph) return;
    const tokensSel = new Set(highlightProteins);
    const anyActive = tokensSel.size > 0;

    graph.forEachNode((node, attrs) => {
      if (!anyActive) {
        graph.setNodeAttribute(node, "highlighted", false).setNodeAttribute(node, "dimmed", false);
        return;
      }
      const toksSet = new Set(tokenize(String(attrs.label ?? "")));
      let hit = styleSettings.highlightMode === "AND"
        ? [...tokensSel].every(sel => toksSet.has(sel))
        : [...tokensSel].some(sel => toksSet.has(sel));
      graph.setNodeAttribute(node, "highlighted", hit).setNodeAttribute(node, "dimmed", !hit);
    });

    graph.forEachEdge(edge => graph.setEdgeAttribute(edge, 'hidden', false));
    if (anyActive && styleSettings.filterComponentsByProteins) {
      const componentNodes = new Set<string>();
      graph.forEachNode((node) => {
        if (graph.getNodeAttribute(node, 'highlighted')) {
          const q = [node], visited = new Set([node]);
          while (q.length > 0) {
            const u = q.shift()!; componentNodes.add(u);
            graph.forEachNeighbor(u, v => { if (!visited.has(v)) { visited.add(v); q.push(v); } });
          }
        }
      });
      graph.forEachNode(node => { if (!componentNodes.has(node)) graph.setNodeAttribute(node, 'dimmed', true) });
      graph.forEachEdge((edge, attrs, source, target) => {
        if (!componentNodes.has(source) || !componentNodes.has(target)) graph.setEdgeAttribute(edge, 'hidden', true);
      });
    }
  }, [highlightProteins, tokenize, styleSettings.filterComponentsByProteins, styleSettings.highlightMode])

  useEffect(() => {
    recomputeProteinHighlight()
  }, [recomputeProteinHighlight])

  // --- Component helpers ---
  function computeComponents(graph: Graph): { nidToCid: Map<string, number>; components: string[][] } {
    const nidToCid = new Map<string, number>(); const components: string[][] = []; let cid = 0;
    graph.forEachNode((node) => {
      if (nidToCid.has(node)) return; const queue = [node], comp = []; nidToCid.set(node, cid);
      while (queue.length) {
        const u = queue.shift()!; comp.push(u);
        graph.forEachNeighbor(u, (v) => { if (!nidToCid.has(v)) { nidToCid.set(v, cid); queue.push(v); } });
      }
      components.push(comp); cid += 1;
    });
    return { nidToCid, components };
  }



  // UI Action Handlers
  const stopLayout = useCallback(() => layoutWorkerRef.current?.postMessage({ type: 'stop' }), []);

  const handleRunLayout = useCallback(() => {
    const graph = graphRef.current, sigma = sigmaRef.current;
    if (!graph || graph.order === 0 || !sigma) return;

    const { selectedLayout } = styleSettings;
    if (selectedLayout !== 'fa2') {
      try { layoutWorkerRef.current?.terminate(); layoutWorkerRef.current = null; } catch { }
      setIsLayoutRunning(false);
      const nodes = graph.nodes(); const N = nodes.length; if (N === 0) return;
      if (selectedLayout === 'random') nodes.forEach(id => graph.setNodeAttribute(id, 'x', Math.random() * 100).setNodeAttribute(id, 'y', Math.random() * 100));
      else if (selectedLayout === 'circle') nodes.forEach((id, i) => graph.setNodeAttribute(id, 'x', Math.cos((i / N) * Math.PI * 2) * 100).setNodeAttribute(id, 'y', Math.sin((i / N) * Math.PI * 2) * 100));
      else if (selectedLayout === 'grid') { const c = Math.ceil(Math.sqrt(N)); nodes.forEach((id, i) => graph.setNodeAttribute(id, 'x', (i % c) * 25).setNodeAttribute(id, 'y', Math.floor(i / c) * 25)); }
      sigma.refresh();
      return;
    }

    if (layoutWorkerRef.current) { stopLayout(); return; }

    const nodes = graph.nodes().map(id => ({ id, x: graph.getNodeAttribute(id, 'x'), y: graph.getNodeAttribute(id, 'y') }));
    const edges = graph.edges().map(edge => ({ source: graph.source(edge), target: graph.target(edge), weight: graph.getEdgeAttribute(edge, 'weight') }));

    const worker = new Worker(new URL('./fa2.worker.ts', import.meta.url), { type: 'module' });
    layoutWorkerRef.current = worker; setIsLayoutRunning(true);

    worker.onmessage = (ev: MessageEvent) => {
      const { type, positions, message } = ev.data;
      if (type === 'tick' || type === 'done') {
        positions.forEach((p: any) => { if (graph.hasNode(p.id)) graph.setNodeAttribute(p.id, 'x', p.x).setNodeAttribute(p.id, 'y', p.y) });
        sigma.refresh();
        if (type === 'done') { worker.terminate(); layoutWorkerRef.current = null; setIsLayoutRunning(false); }
      } else if (type === 'stopped' || type === 'error') {
        if (type === 'error') console.error('FA2 worker error:', message);
        worker.terminate(); layoutWorkerRef.current = null; setIsLayoutRunning(false);
      }
    };

    worker.postMessage({
      type: 'run',
      iterations: Math.max(100, Math.min(20000, Math.round(layoutSettings.iterations))),
      chunkSize: Math.max(1, Math.min(2000, Math.round(layoutSettings.chunkSize))),
      settings: {
        gravity: layoutSettings.gravity,
        slowDown: layoutSettings.slowDown,
        linLog: layoutSettings.linLog,
        strongGravityMode: layoutSettings.strongGravityMode,
        adjustSizes: layoutSettings.adjustSizes,
        barnesHutOptimize: layoutSettings.barnesHutOptimize,
        barnesHutTheta: layoutSettings.barnesHutTheta,
        edgeWeightInfluence: layoutSettings.edgeWeightInfluence,
        outboundAttractionDistribution: layoutSettings.outboundAttractionDistribution,
        scalingRatio: layoutSettings.scalingRatio,
      },
      nodes, edges,
    });
  }, [stopLayout, layoutSettings, styleSettings.selectedLayout]);

  const handleResetView = useCallback(() => sigmaRef.current?.getCamera().animatedReset({ duration: 300 }), []);

  // Component operations for sidebar
  const previewComponent = useCallback((cid: number) => {
    const graph = graphRef.current
    if (!graph) return
    previewComponentUtil(graph, cid)
  }, [])

  const clearHoverPreview = useCallback(() => {
    const graph = graphRef.current
    if (!graph) return
    clearHoverPreviewUtil(graph)
    recomputeProteinHighlight()
  }, [recomputeProteinHighlight])

  const highlightComponent = useCallback((cid: number) => {
    const graph = graphRef.current
    const sigma = sigmaRef.current
    if (!graph || !sigma) return
    highlightComponentUtil(graph, sigma, cid)
  }, [])

  // Render method
  return (
    <NetworkSidebarProvider
      value={{
        isDrawerOpen,
        setIsDrawerOpen,
        selectedNode,
        nodeInfoLoading,
        selectedNodeInfo,
        networkName,
        filename,
        fixedComponentId,
        effectiveComponentId,
        savingFavorite,
        savedFavoriteOnce,
        setSavingFavorite,
        setSavedFavoriteOnce,
        fetchNodeComponentInfo,
        isIdOpen,
        setIsIdOpen,
        isComponentOpen,
        setIsComponentOpen,
        isDistributionOpen,
        setIsDistributionOpen,
        isNodeProteinOpen,
        setIsNodeProteinOpen,
        proteinCountsSorted,
        proteinMaxCount,
        nodeLabelProteins,
        computeComponents: computeComponents as any,
        previewComponent,
        clearHoverPreview,
        highlightComponent,
        highlightProteins,
        setHighlightProteins,
        expandedProteins,
        setExpandedProteins,
        graphRef,
        hoverRevertTimeoutRef: useRef(null),
        prevViewRef: useRef(null),
      }}
    >
      <Box position="relative" width="100%" height={typeof height === "number" ? `${height}px` : height}>
      {showControls && (
        <Stack gap={2} position="absolute" top={2} right={2} zIndex={10} bg="whiteAlpha.800" _dark={{ bg: "blackAlpha.600" }} px={2} py={2} rounded="md" boxShadow="md" align="stretch" width="260px" >
          <Box>
            <Text fontSize="xs" mb={1}>Layout</Text>
            <PopoverRoot closeOnInteractOutside={false} modal={false}>
              <PopoverTrigger asChild>
                <Button size="xs" variant="subtle" title="Layout & style settings" width="100%" justifyContent="flex-start">
                  <HStack gap={2}><FiSettings /><span>Layout & style settings</span></HStack>
                </Button>
              </PopoverTrigger>
              <PopoverContent width="260px" maxH="60vh" zIndex={3000} onWheel={(e) => e.stopPropagation()} onClickCapture={(e) => e.stopPropagation()} >
                <PopoverArrow />
                <PopoverBody p={3} style={{ userSelect: 'text' }}>
                  <Box maxH="52vh" overflowY="auto" pointerEvents="auto">
                    <Stack gap={3} fontSize="sm">
                      <Text fontSize="xs" opacity={0.7}>Layout options</Text>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Layout</Text></HStack>
                        <select value={styleSettings.selectedLayout} onChange={(e) => updateStyleSetting('selectedLayout', e.target.value)} style={{ width: '100%', fontSize: '12px', padding: '6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent' }} title="Choose a layout" >
                          <option value="fa2">ForceAtlas2 (FA2)</option>
                          <option value="random">Random</option>
                          <option value="circle">Circle</option>
                          <option value="grid">Grid</option>
                        </select>
                      </Box>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Iterations</Text><Text fontSize="xs">{layoutSettings.iterations}</Text></HStack>
                        <input type="range" min={100} max={20000} step={100} value={layoutSettings.iterations} onChange={(e) => updateLayoutSetting('iterations', Number(e.target.value))} style={{ width: '100%' }} />
                      </Box>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Chunk size</Text><Text fontSize="xs">{layoutSettings.chunkSize}</Text></HStack>
                        <input type="range" min={10} max={1000} step={10} value={layoutSettings.chunkSize} onChange={(e) => updateLayoutSetting('chunkSize', Number(e.target.value))} style={{ width: '100%' }} />
                      </Box>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Gravity</Text><Text fontSize="xs">{layoutSettings.gravity.toFixed(2)}</Text></HStack>
                        <input type="range" min={0} max={10} step={0.1} value={layoutSettings.gravity} onChange={(e) => updateLayoutSetting('gravity', Number(e.target.value))} style={{ width: '100%' }} />
                      </Box>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Slow down</Text><Text fontSize="xs">{layoutSettings.slowDown}</Text></HStack>
                        <input type="range" min={1} max={100} step={1} value={layoutSettings.slowDown} onChange={(e) => updateLayoutSetting('slowDown', Number(e.target.value))} style={{ width: '100%' }} />
                      </Box>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={layoutSettings.linLog} onChange={(e) => updateLayoutSetting('linLog', e.target.checked)} />
                        <Text fontSize="sm">LinLog mode</Text>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={layoutSettings.strongGravityMode} onChange={(e) => updateLayoutSetting('strongGravityMode', e.target.checked)} />
                        <Text fontSize="sm">Strong gravity</Text>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={layoutSettings.adjustSizes} onChange={(e) => updateLayoutSetting('adjustSizes', e.target.checked)} />
                        <Text fontSize="sm">Adjust sizes</Text>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={layoutSettings.barnesHutOptimize} onChange={(e) => updateLayoutSetting('barnesHutOptimize', e.target.checked)} />
                        <Text fontSize="sm">Barnes-Hut optimize</Text>
                      </label>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Barnes-Hut theta</Text><Text fontSize="xs">{layoutSettings.barnesHutTheta.toFixed(2)}</Text></HStack>
                        <input type="range" min={0.1} max={2} step={0.05} value={layoutSettings.barnesHutTheta} onChange={(e) => updateLayoutSetting('barnesHutTheta', Number(e.target.value))} style={{ width: '100%' }} />
                      </Box>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Edge weight influence</Text><Text fontSize="xs">{layoutSettings.edgeWeightInfluence.toFixed(2)}</Text></HStack>
                        <input type="range" min={0} max={10} step={0.1} value={layoutSettings.edgeWeightInfluence} onChange={(e) => updateLayoutSetting('edgeWeightInfluence', Number(e.target.value))} style={{ width: '100%' }} />
                      </Box>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={layoutSettings.outboundAttractionDistribution} onChange={(e) => updateLayoutSetting('outboundAttractionDistribution', e.target.checked)} />
                        <Text fontSize="sm">Outbound attraction</Text>
                      </label>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Scaling ratio</Text><Text fontSize="xs">{layoutSettings.scalingRatio.toFixed(2)}</Text></HStack>
                        <input type="range" min={0.1} max={50} step={0.1} value={layoutSettings.scalingRatio} onChange={(e) => updateLayoutSetting('scalingRatio', Number(e.target.value))} style={{ width: '100%' }} />
                      </Box>
                      <HStack justify="space-between" align="center">
                        <Text fontSize="xs" opacity={0.8}>Name mode</Text>
                        <select value={styleSettings.nameMode} onChange={(e) => updateStyleSetting('nameMode', e.target.value as any)} style={{ fontSize: '12px', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent' }} >
                          <option value="systematic">Systematic</option>
                          <option value="gene">Gene</option>
                        </select>
                      </HStack>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={styleSettings.showLabels} onChange={(e) => updateStyleSetting('showLabels', e.target.checked)} />
                        <Text fontSize="sm">Show labels</Text>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={styleSettings.enableHoverInfo} onChange={(e) => updateStyleSetting('enableHoverInfo', e.target.checked)} />
                        <Text fontSize="sm">Hover info</Text>
                      </label>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Node size</Text><Text fontSize="xs">{Math.round(styleSettings.nodeScale * 100)}%</Text></HStack>
                        <input type="range" min={10} max={200} step={5} value={Math.round(styleSettings.nodeScale * 100)} onChange={(e) => updateStyleSetting('nodeScale', Number(e.target.value) / 100)} style={{ width: '100%' }} />
                      </Box>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Node size range</Text><Text fontSize="xs">{Math.round(styleSettings.nodeRangeFactor * 100)}%</Text></HStack>
                        <input type="range" min={0} max={100} step={5} value={Math.round(styleSettings.nodeRangeFactor * 100)} onChange={(e) => updateStyleSetting('nodeRangeFactor', Number(e.target.value) / 100)} style={{ width: '100%' }} title="Adjust spread between smallest and largest nodes" />
                      </Box>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Edge width</Text><Text fontSize="xs">{Math.round(styleSettings.edgeScale * 100)}%</Text></HStack>
                        <input type="range" min={10} max={200} step={5} value={Math.round(styleSettings.edgeScale * 100)} onChange={(e) => updateStyleSetting('edgeScale', Number(e.target.value) / 100)} style={{ width: '100%' }} />
                      </Box>
                      <Box>
                        <HStack justify="space-between" mb={1}><Text fontSize="xs">Selected border width</Text><Text fontSize="xs">{styleSettings.selectedBorderWidth}px</Text></HStack>
                        <input type="range" min={0} max={20} step={1} value={styleSettings.selectedBorderWidth} onChange={(e) => updateStyleSetting('selectedBorderWidth', Number(e.target.value))} style={{ width: '100%' }} />
                      </Box>
                    </Stack>
                  </Box>
                </PopoverBody>
              </PopoverContent>
            </PopoverRoot>
          </Box>
          <Button size="xs" onClick={handleRunLayout} variant={isLayoutRunning ? 'solid' : 'subtle'} width="100%"><HStack gap={1}>{isLayoutRunning ? <FiRefreshCw /> : <FiPlay />}<span>{isLayoutRunning ? 'Stop' : 'Run layout'}</span></HStack></Button>
          <Button size="xs" onClick={handleResetView} variant="outline" width="100%"><HStack gap={1}><FiRefreshCw /><span>Reset view</span></HStack></Button>
        </Stack>
      )}

      <Box ref={containerRef} position="absolute" inset={0} />

      {isLayoutRunning && (
        <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" bg="whiteAlpha.600" _dark={{ bg: "blackAlpha.400" }} zIndex={5}>
          <Stack align="center" gap={2}><Spinner size="sm" /><Text fontSize="sm">Arranging layout…</Text></Stack>
        </Box>
      )}

        <NetworkSidebar />
      </Box>
    </NetworkSidebarProvider>
  )
}

export default memo(SigmaNetwork)