import { useState, useMemo } from 'react'
import type { 
  SelectedNode, 
  NodeInfo, 
  NetworkState, 
  NetworkStateActions,
  UseNetworkStateProps,
  UseNetworkStateReturn
} from '@/components/Networks/Cytoscape/types'

export function useNetworkState({
  layoutName = 'fcose',
  initialFavoriteExists = false,
}: UseNetworkStateProps = {}): UseNetworkStateReturn {
  // Layout state
  const [selectedLayout, setSelectedLayout] = useState<string>(layoutName)
  const [isLayoutRunning, setIsLayoutRunning] = useState(false)
  
  // Panel state
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(false)
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Node selection and info
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
  const [nodeInfoLoading, setNodeInfoLoading] = useState(false)
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<NodeInfo | null>(null)
  
  // Collapsible sections state (collapsed by default)
  const [isIdOpen, setIsIdOpen] = useState(false)
  const [isNameOpen, setIsNameOpen] = useState(false)
  const [isComponentOpen, setIsComponentOpen] = useState(false)
  const [isDistributionOpen, setIsDistributionOpen] = useState(false)
  const [isNodeProteinOpen, setIsNodeProteinOpen] = useState(false)
  const [isNodeHighlightOptionsOpen, setIsNodeHighlightOptionsOpen] = useState(false)
  const [isHighlightOptionsOpen, setIsHighlightOptionsOpen] = useState(false)
  
  // Protein highlighting
  const [highlightProteins, setHighlightProteins] = useState<Set<string>>(new Set())
  const [expandedProteins, setExpandedProteins] = useState<Set<string>>(new Set())
  
  // Protein comparison
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set())
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false)
  
  // Backend operations
  const [runningBackend, setRunningBackend] = useState(false)
  const [savingFavorite, setSavingFavorite] = useState(false)
  const [savedFavoriteOnce, setSavedFavoriteOnce] = useState(() => !!initialFavoriteExists)
  
  // Component state
  const [localComponentId, setLocalComponentId] = useState<number | null>(null)

  // Memoized state object
  const state = useMemo<NetworkState>(() => ({
    selectedLayout,
    isLayoutRunning,
    isStylePanelOpen,
    isInfoPanelOpen,
    isDrawerOpen,
    selectedNode,
    nodeInfoLoading,
    selectedNodeInfo,
    isIdOpen,
    isNameOpen,
    isComponentOpen,
    isDistributionOpen,
    isNodeProteinOpen,
    isNodeHighlightOptionsOpen,
    isHighlightOptionsOpen,
    highlightProteins,
    expandedProteins,
    selectedForComparison,
    comparisonModalOpen,
    runningBackend,
    savingFavorite,
    savedFavoriteOnce,
    localComponentId,
  }), [
    selectedLayout,
    isLayoutRunning,
    isStylePanelOpen,
    isInfoPanelOpen,
    isDrawerOpen,
    selectedNode,
    nodeInfoLoading,
    selectedNodeInfo,
    isIdOpen,
    isNameOpen,
    isComponentOpen,
    isDistributionOpen,
    isNodeProteinOpen,
    isNodeHighlightOptionsOpen,
    isHighlightOptionsOpen,
    highlightProteins,
    expandedProteins,
    selectedForComparison,
    comparisonModalOpen,
    runningBackend,
    savingFavorite,
    savedFavoriteOnce,
    localComponentId,
  ])

  // Memoized actions object
  const actions = useMemo<NetworkStateActions>(() => ({
    setSelectedLayout,
    setIsLayoutRunning,
    setIsStylePanelOpen,
    setIsInfoPanelOpen,
    setIsDrawerOpen,
    setSelectedNode,
    setNodeInfoLoading,
    setSelectedNodeInfo,
    setIsIdOpen,
    setIsNameOpen,
    setIsComponentOpen,
    setIsDistributionOpen,
    setIsNodeProteinOpen,
    setIsNodeHighlightOptionsOpen,
    setIsHighlightOptionsOpen,
    setHighlightProteins,
    setExpandedProteins,
    setSelectedForComparison,
    setComparisonModalOpen,
    setRunningBackend,
    setSavingFavorite,
    setSavedFavoriteOnce,
    setLocalComponentId,
  }), [])

  return { state, actions }
}