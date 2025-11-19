import type cytoscape from 'cytoscape'
import type { PerformanceTier, PerformanceTierName, OptimizationConfig } from '../../../utils/performanceUtils'

// Re-export performance types for convenience
export type { PerformanceTier, PerformanceTierName, OptimizationConfig } from '../../../utils/performanceUtils'

// ============================================================================
// Core Graph Types
// ============================================================================

export interface CytoscapeNode {
  data: Record<string, any>
}

export interface CytoscapeEdge {
  data: Record<string, any>
}

export interface CytoscapeGraph {
  nodes: CytoscapeNode[]
  edges: CytoscapeEdge[]
}

// ============================================================================
// Node and Component Types
// ============================================================================

export interface SelectedNode {
  id: string
  label?: string
}

export interface ProteinCount {
  protein: string
  count: number
  type_counts?: Record<string, number>
  type_ratios?: Record<string, number>
  ratio?: number
  other_components?: number
  other_components_network?: number
}

export interface EdgeTypeStats {
  matched_prediction: number
  matched_reference: number
  prediction: number
  reference: number
  total: number
}

export interface NodeInfo {
  componentId?: number
  componentSize?: number
  proteinCounts?: ProteinCount[]
  edgeTypeStats?: EdgeTypeStats
}

// ============================================================================
// Network Statistics Types
// ============================================================================

export interface NetworkStats {
  nodeCount: number
  edgeCount: number
  typeCounts: Array<{ type: string; count: number }>
  weightRange: { min: number; max: number }
  similarityRange: { min: number; max: number }
}

// ============================================================================
// Style and Display Types
// ============================================================================

export type NameMode = 'systematic' | 'gene'
export type HighlightMode = 'AND' | 'OR'

// ============================================================================
// Hook State Types
// ============================================================================

export interface NetworkState {
  // Layout state
  selectedLayout: string
  isLayoutRunning: boolean
  
  // Panel state
  isStylePanelOpen: boolean
  isInfoPanelOpen: boolean
  isDrawerOpen: boolean
  
  // Node selection and info
  selectedNode: SelectedNode | null
  nodeInfoLoading: boolean
  selectedNodeInfo: NodeInfo | null
  
  // Collapsible sections state
  isIdOpen: boolean
  isNameOpen: boolean
  isComponentOpen: boolean
  isDistributionOpen: boolean
  isNodeProteinOpen: boolean
  isNodeHighlightOptionsOpen: boolean
  isHighlightOptionsOpen: boolean
  
  // Protein highlighting
  highlightProteins: Set<string>
  expandedProteins: Set<string>
  
  // Protein comparison
  selectedForComparison: Set<string>
  comparisonModalOpen: boolean
  
  // Backend operations
  runningBackend: boolean
  savingFavorite: boolean
  savedFavoriteOnce: boolean
  
  // Component state
  localComponentId: number | null
  
  // Data source state
  dataSource: "uniprot" | "stringdb"
}

export interface NetworkStateActions {
  // Layout actions
  setSelectedLayout: (layout: string) => void
  setIsLayoutRunning: (running: boolean) => void
  
  // Panel actions
  setIsStylePanelOpen: (open: boolean) => void
  setIsInfoPanelOpen: (open: boolean) => void
  setIsDrawerOpen: (open: boolean) => void
  
  // Node selection actions
  setSelectedNode: (node: SelectedNode | null) => void
  setNodeInfoLoading: (loading: boolean) => void
  setSelectedNodeInfo: (info: NodeInfo | null) => void
  
  // Collapsible sections actions
  setIsIdOpen: (open: boolean) => void
  setIsNameOpen: (open: boolean) => void
  setIsComponentOpen: (open: boolean) => void
  setIsDistributionOpen: (open: boolean) => void
  setIsNodeProteinOpen: (open: boolean) => void
  setIsNodeHighlightOptionsOpen: (open: boolean) => void
  setIsHighlightOptionsOpen: (open: boolean) => void
  
  // Protein highlighting actions
  setHighlightProteins: (proteins: Set<string>) => void
  setExpandedProteins: (proteins: Set<string>) => void
  
  // Protein comparison actions
  setSelectedForComparison: (proteins: Set<string>) => void
  setComparisonModalOpen: (open: boolean) => void
  
  // Backend operation actions
  setRunningBackend: (running: boolean) => void
  setSavingFavorite: (saving: boolean) => void
  setSavedFavoriteOnce: (saved: boolean) => void
  
  // Component actions
  setLocalComponentId: (id: number | null) => void
  
  // Data source actions
  setDataSource: (source: "uniprot" | "stringdb") => void
}

export interface StyleState {
  showLabels: boolean
  nameMode: NameMode
  nodeScale: number
  edgeScale: number
  selectedBorderWidth: number
  enableHoverInfo: boolean
  filterComponentsByProteins: boolean
  highlightMode: HighlightMode
  hoverLabelScale: number
}

export interface StyleActions {
  setShowLabels: (show: boolean) => void
  setNameMode: (mode: NameMode) => void
  setNodeScale: (scale: number) => void
  setEdgeScale: (scale: number) => void
  setSelectedBorderWidth: (width: number) => void
  setEnableHoverInfo: (enable: boolean) => void
  setFilterComponentsByProteins: (filter: boolean) => void
  setHighlightMode: (mode: HighlightMode) => void
  setHoverLabelScale: (scale: number) => void
}

export interface LayoutConfig {
  selectedLayout: string
  autoRunLayout: boolean
  fitOnInit: boolean
}

export interface LayoutActions {
  runLayout: () => void
  resetView: () => void
}

export interface EventHandlers {
  onNodeTap: (nodeId: string, label?: string) => void
  onBackgroundTap: () => void
  onNodeSelect?: (nodeId: string, label?: string) => void
}

export interface EventConfig {
  enableHoverInfo: boolean
  isBigGraph: boolean
  disableComponentTapHighlight?: boolean
  highlightActiveRef: React.MutableRefObject<boolean>
}

export interface ProteinHighlightState {
  highlightProteins: Set<string>
  expandedProteins: Set<string>
}

export interface ProteinHighlightActions {
  setHighlightProteins: (proteins: Set<string>) => void
  setExpandedProteins: (proteins: Set<string>) => void
  recomputeProteinHighlight: () => void
  tokenize: (s: string) => string[]
}

// ============================================================================
// Performance Types
// ============================================================================

export interface PerformanceState {
  // Current tier
  tier: PerformanceTier
  
  // Warning state
  warningDismissed: boolean
  warningDismissedAt: number | null
  
  // Layout tracking
  layoutStartTime: number | null
  layoutElapsedTime: number
  layoutEstimatedTime: number | null
  
  // Cancellation
  isCancelling: boolean
  
  // Applied optimizations
  appliedOptimizations: Set<string>
}

export interface RecommendationAction {
  type: 'switch-layout' | 'filter-data' | 'disable-features'
  payload?: any
}

// ============================================================================
// Component Prop Types
// ============================================================================

export interface PerformanceIndicatorProps {
  nodeCount: number
  edgeCount: number
  currentTier: PerformanceTier
  estimatedLayoutTime?: number
}

export interface PerformanceWarningProps {
  tier: PerformanceTier
  nodeCount: number
  edgeCount: number
  currentLayout?: string
  onDismiss: () => void
  onApplyRecommendation?: (action: RecommendationAction) => void
}

export interface LayoutProgressOverlayProps {
  isRunning: boolean
  isLoading?: boolean
  layoutName: string
  nodeCount: number
  edgeCount: number
  startTime: number
  estimatedTime?: number
  onCancel: () => void
}

// ============================================================================
// Cytoscape Configuration Types
// ============================================================================

export interface CytoscapeConfig {
  wheelSensitivity?: number
  minZoom?: number
  maxZoom?: number
  isBigGraph: boolean
  showLabels: boolean
  nodeScale: number
  edgeScale: number
  selectedBorderWidth: number
  enableHoverInfo: boolean
  highlightActiveRef: React.MutableRefObject<boolean>
  performanceTier?: PerformanceTierName
  optimizations?: OptimizationConfig
  hoverLabelScale: number
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseNetworkStateProps {
  layoutName?: string
  initialFavoriteExists?: boolean
}

export interface UseNetworkStateReturn {
  state: NetworkState
  actions: NetworkStateActions
}

export interface UseNetworkStyleReturn {
  style: StyleState
  actions: StyleActions
}

export interface UseNetworkLayoutProps {
  cy: cytoscape.Core | null
  config: LayoutConfig
  onLayoutStart: () => void
  onLayoutComplete: () => void
}

export interface UseNetworkLayoutReturn {
  actions: LayoutActions
}

export interface UseNetworkEventsProps {
  cy: cytoscape.Core | null
  handlers: EventHandlers
  config: EventConfig
}

export interface UseProteinHighlightProps {
  cy: cytoscape.Core | null
  highlightMode: HighlightMode
  filterComponentsByProteins: boolean
  highlightProteins: Set<string>
  expandedProteins: Set<string>
  setHighlightProteins: (proteins: Set<string>) => void
  setExpandedProteins: (proteins: Set<string>) => void
}

export interface UseProteinHighlightReturn {
  actions: ProteinHighlightActions
  highlightActiveRef: React.MutableRefObject<boolean>
}

export interface UsePerformanceTierReturn {
  tier: PerformanceTier
  shouldShowWarning: boolean
  dismissWarning: () => void
  applyOptimizations: () => OptimizationConfig
  getLayoutEstimate: (layoutName: string) => number
}

export interface UseLayoutCancellationReturn {
  cancelLayout: () => void
  isCancelling: boolean
  applyFallbackLayout: () => void
}

// ============================================================================
// Protein Feature Comparison Types
// ============================================================================

export interface ProteinFeature {
  type: string
  description: string
  start: number
  end: number
}

// GO Terms Types
export interface GOTerm {
  id: string
  name: string
  parents: string[]
  evidence?: string
  p_value?: number | null
}

export interface GOTermsByDomain {
  biological_process: GOTerm[]
  cellular_component: GOTerm[]
  molecular_function: GOTerm[]
}

export interface ProteinFeatureData {
  protein: string
  sequence_length: number | null
  features: ProteinFeature[]
  go_terms?: GOTermsByDomain | null
  error: string | null
}

export interface ProteinFeaturesResponse {
  proteins: ProteinFeatureData[]
}
