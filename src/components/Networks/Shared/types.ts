// Shared types for network components

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

export interface NodeInfo {
  componentId?: number
  componentSize?: number
  proteinCounts?: ProteinCount[]
}
