import { createContext, useContext } from 'react'
import type { NodeInfo, ProteinCount, SelectedNode } from './types'

export interface NetworkSidebarState {
  // Drawer state
  isDrawerOpen: boolean
  setIsDrawerOpen: (open: boolean) => void
  
  // Selected node
  selectedNode: SelectedNode | null
  nodeInfoLoading: boolean
  selectedNodeInfo: NodeInfo | null
  
  // Network info
  networkName?: string
  filename?: string
  fixedComponentId?: number
  effectiveComponentId: number | null
  
  // Favorite state
  savingFavorite: boolean
  savedFavoriteOnce: boolean
  setSavingFavorite: (v: boolean) => void
  setSavedFavoriteOnce: (v: boolean) => void
  fetchNodeComponentInfo: (nodeId: string) => Promise<void>
  
  // Panel visibility toggles
  isIdOpen: boolean
  setIsIdOpen: (v: boolean) => void
  isComponentOpen: boolean
  setIsComponentOpen: (v: boolean) => void
  isDistributionOpen: boolean
  setIsDistributionOpen: (v: boolean) => void
  isNodeProteinOpen: boolean
  setIsNodeProteinOpen: (v: boolean) => void
  
  // Protein data
  proteinCountsSorted: ProteinCount[]
  proteinMaxCount: number
  nodeLabelProteins: string[]
  
  // Component operations
  computeComponents: (cy: any) => { nidToCid: Map<string, number>; cidToNodeIds: Map<number, string[]> }
  previewComponent: (cid: number) => void
  clearHoverPreview: (cid: number) => void
  highlightComponent: (cid: number) => void
  
  // Highlight state
  highlightProteins: Set<string>
  setHighlightProteins: (next: Set<string>) => void
  expandedProteins: Set<string>
  setExpandedProteins: (next: Set<string>) => void
  
  // Comparison state
  selectedForComparison: Set<string>
  setSelectedForComparison: (next: Set<string>) => void
  comparisonModalOpen: boolean
  setComparisonModalOpen: (open: boolean) => void
  
  // Refs
  cyRef: React.RefObject<any>
  hoverRevertTimeoutRef: React.RefObject<number | null>
  prevViewRef: React.RefObject<{ pan: { x: number; y: number }; zoom: number } | null>
}

const NetworkSidebarContext = createContext<NetworkSidebarState | null>(null)

export const NetworkSidebarProvider = NetworkSidebarContext.Provider

export function useNetworkSidebar() {
  const context = useContext(NetworkSidebarContext)
  if (!context) {
    throw new Error('useNetworkSidebar must be used within NetworkSidebarProvider')
  }
  return context
}
