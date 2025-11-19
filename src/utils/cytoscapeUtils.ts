import type cytoscape from 'cytoscape'
import { getColaOptionsForSize, DEFAULT_COLA_OPTIONS } from './performanceUtils'

/**
 * Filter for edge type ratios
 */
export interface EdgeTypeFilter {
  minMatchedPredictionRatio?: number
  maxMatchedPredictionRatio?: number
  minUnmatchedPredictionRatio?: number
  maxUnmatchedPredictionRatio?: number
  minMatchedReferenceRatio?: number
  maxMatchedReferenceRatio?: number
  minUnmatchedReferenceRatio?: number
  maxUnmatchedReferenceRatio?: number
}

/**
 * Check if component edge stats match the filter criteria
 */
export function matchesEdgeTypeFilter(
  stats: {
    matched_prediction: number
    matched_reference: number
    prediction: number
    reference: number
    total: number
  },
  filter: EdgeTypeFilter
): boolean {
  if (stats.total === 0) return false
  
  const totalPred = stats.matched_prediction + stats.prediction
  const totalRef = stats.matched_reference + stats.reference
  
  // Calculate ratios
  const matchedPredRatio = totalPred > 0 ? stats.matched_prediction / totalPred : 0
  const unmatchedPredRatio = totalPred > 0 ? stats.prediction / totalPred : 0
  const matchedRefRatio = totalRef > 0 ? stats.matched_reference / totalRef : 0
  const unmatchedRefRatio = totalRef > 0 ? stats.reference / totalRef : 0
  
  // Check each filter criterion
  if (filter.minMatchedPredictionRatio !== undefined && matchedPredRatio < filter.minMatchedPredictionRatio) return false
  if (filter.maxMatchedPredictionRatio !== undefined && matchedPredRatio > filter.maxMatchedPredictionRatio) return false
  if (filter.minUnmatchedPredictionRatio !== undefined && unmatchedPredRatio < filter.minUnmatchedPredictionRatio) return false
  if (filter.maxUnmatchedPredictionRatio !== undefined && unmatchedPredRatio > filter.maxUnmatchedPredictionRatio) return false
  if (filter.minMatchedReferenceRatio !== undefined && matchedRefRatio < filter.minMatchedReferenceRatio) return false
  if (filter.maxMatchedReferenceRatio !== undefined && matchedRefRatio > filter.maxMatchedReferenceRatio) return false
  if (filter.minUnmatchedReferenceRatio !== undefined && unmatchedRefRatio < filter.minUnmatchedReferenceRatio) return false
  if (filter.maxUnmatchedReferenceRatio !== undefined && unmatchedRefRatio > filter.maxUnmatchedReferenceRatio) return false
  
  return true
}

/**
 * Filter components by edge type ratios and return matching component IDs
 */
export function filterComponentsByEdgeTypes(
  cy: cytoscape.Core,
  filter: EdgeTypeFilter
): Set<number> {
  const matchingComponents = new Set<number>()
  
  if (!cy) return matchingComponents
  
  try {
    const { nidToCid, cidToNodeIds } = computeComponents(cy)
    
    // Check each component
    cidToNodeIds.forEach((nodeIds, componentId) => {
      const stats = computeComponentEdgeStats(cy, componentId, nidToCid)
      if (matchesEdgeTypeFilter(stats, filter)) {
        matchingComponents.add(componentId)
      }
    })
  } catch (error) {
    console.error('Failed to filter components by edge types:', error)
  }
  
  return matchingComponents
}

/**
 * Compute edge type statistics for a specific component
 */
export function computeComponentEdgeStats(
  cy: cytoscape.Core,
  componentId: number,
  nidToCid: Map<string, number>
): {
  matched_prediction: number
  matched_reference: number
  prediction: number
  reference: number
  total: number
} {
  const stats = {
    matched_prediction: 0,
    matched_reference: 0,
    prediction: 0,
    reference: 0,
    total: 0
  }
  
  if (!cy) return stats
  
  try {
    // Get all nodes in this component
    const componentNodes = new Set<string>()
    nidToCid.forEach((cid, nodeId) => {
      if (cid === componentId) {
        componentNodes.add(nodeId)
      }
    })
    
    // Count edges within this component by type
    cy.edges().forEach((edge) => {
      try {
        const source = String(edge.data('source'))
        const target = String(edge.data('target'))
        
        // Only count edges within this component
        if (componentNodes.has(source) && componentNodes.has(target)) {
          const edgeType = edge.data('type') || 'unknown'
          stats.total++
          
          if (edgeType === 'matched_prediction') {
            stats.matched_prediction++
          } else if (edgeType === 'matched_reference') {
            stats.matched_reference++
          } else if (edgeType === 'prediction') {
            stats.prediction++
          } else if (edgeType === 'reference') {
            stats.reference++
          }
        }
      } catch (error) {
        console.warn('Failed to process edge for stats:', error)
      }
    })
  } catch (error) {
    console.error('Failed to compute component edge stats:', error)
  }
  
  return stats
}

/**
 * Deterministic connected components computation (stable IDs across calls)
 */
export function computeComponents(cy: cytoscape.Core): {
  nidToCid: Map<string, number>
  cidToNodeIds: Map<number, string[]>
} {
  if (!cy) {
    console.warn('computeComponents called with null Cytoscape instance')
    return { nidToCid: new Map(), cidToNodeIds: new Map() }
  }
  
  try {
    const adj = new Map<string, string[]>()
    
    // Build adjacency list
    try {
      cy.nodes().forEach((n) => { 
        adj.set(n.id(), []) 
      })
    } catch (error) {
      console.error('Failed to initialize adjacency list:', error)
      return { nidToCid: new Map(), cidToNodeIds: new Map() }
    }
    
    try {
      cy.edges().forEach((e) => {
        try {
          const s = String(e.data("source"))
          const t = String(e.data("target"))
          const as = adj.get(s)
          const at = adj.get(t)
          if (as) as.push(t)
          if (at) at.push(s)
        } catch (edgeError) {
          console.warn('Failed to process edge:', edgeError)
        }
      })
    } catch (error) {
      console.error('Failed to build adjacency list from edges:', error)
    }
    
    // Sort neighbor lists for determinism
    adj.forEach((list: string[]) => list.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
    
    const allIds = cy.nodes().map((n) => n.id()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    const nidToCid = new Map<string, number>()
    const cidToNodeIds: Map<number, string[]> = new Map()
    let nextCid = 0
    
    // BFS to find connected components
    for (const start of allIds) {
      if (nidToCid.has(start)) continue
      
      try {
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
      } catch (componentError) {
        console.warn(`Failed to compute component for node ${start}:`, componentError)
      }
    }
    
    return { nidToCid, cidToNodeIds }
  } catch (error) {
    console.error('Unexpected error in computeComponents:', error)
    return { nidToCid: new Map(), cidToNodeIds: new Map() }
  }
}

/**
 * Preview a component by highlighting it and fitting the viewport
 */
export function previewComponent(
  cy: cytoscape.Core,
  componentId: number,
  selectedBorderWidth: number,
  prevViewRef: React.MutableRefObject<{ pan: { x: number; y: number }; zoom: number } | null>,
  hoveredComponentRef: React.MutableRefObject<number | null>
): void {
  if (!cy) {
    console.warn('previewComponent called with null Cytoscape instance')
    return
  }
  
  try {
    cy.batch(() => {
      try {
        // Save current view once per preview session
        if (!prevViewRef.current) {
          prevViewRef.current = { pan: cy.pan(), zoom: cy.zoom() }
        }
      } catch (error) {
        console.warn('Failed to save current view:', error)
      }
      
      try {
        // Clear any previous highlight, then highlight target component and fit
        cy.nodes().forEach((n) => { n.data("highlight", 0) })
      } catch (error) {
        console.warn('Failed to clear highlights:', error)
      }
      
      try {
        const { nidToCid } = computeComponents(cy)
        const idsToFit: string[] = []
        
        nidToCid.forEach((cid, nid) => {
          if (cid === componentId) {
            try {
              const node = cy.getElementById(nid)
              if (node && node.nonempty()) {
                node.data("highlight", 1)
                idsToFit.push(nid)
              }
            } catch (nodeError) {
              console.warn(`Failed to highlight node ${nid}:`, nodeError)
            }
          }
        })
        
        if (idsToFit.length > 0) {
          try {
            const sel = cy.collection(idsToFit.map((id) => cy.getElementById(id) as any))
            cy.fit(sel, 40)
            
            // Pulse border to emphasize hovered component (respect selectedBorderWidth)
            const base = Math.max(0, selectedBorderWidth)
            const high = base + 4
            sel.nodes().forEach((n) => {
              try {
                n.animate({ style: { 'border-width': high } }, { duration: 120 })
                n.animate({ style: { 'border-width': base } }, { duration: 160 })
              } catch (animError) {
                console.warn('Failed to animate node border:', animError)
              }
            })
          } catch (fitError) {
            console.warn('Failed to fit component:', fitError)
          }
        }
        
        hoveredComponentRef.current = componentId
      } catch (error) {
        console.error('Failed to preview component:', error)
      }
    })
  } catch (error) {
    console.error('Unexpected error in previewComponent:', error)
  }
}

/**
 * Clear hover preview and restore previous view
 */
export function clearHoverPreview(
  cy: cytoscape.Core,
  componentId: number,
  prevViewRef: React.MutableRefObject<{ pan: { x: number; y: number }; zoom: number } | null>,
  hoveredComponentRef: React.MutableRefObject<number | null>,
  hoverRevertTimeoutRef: React.MutableRefObject<number | null>
): void {
  if (!cy) {
    console.warn('clearHoverPreview called with null Cytoscape instance')
    return
  }
  
  // Delay a bit to allow moving between chips without flicker
  if (hoverRevertTimeoutRef.current) {
    try {
      window.clearTimeout(hoverRevertTimeoutRef.current)
    } catch (error) {
      console.warn('Failed to clear timeout:', error)
    }
    hoverRevertTimeoutRef.current = null
  }
  
  hoverRevertTimeoutRef.current = window.setTimeout(() => {
    if (hoveredComponentRef.current !== componentId) return
    
    try {
      cy.batch(() => {
        try {
          // Remove highlight and restore stylesheet-driven border
          cy.nodes().forEach((n) => { 
            try {
              n.data("highlight", 0)
              ;(n as any).removeStyle?.('border-width') || n.removeStyle()
            } catch (nodeError) {
              console.warn('Failed to clear node highlight:', nodeError)
            }
          })
        } catch (error) {
          console.warn('Failed to clear node highlights:', error)
        }
        
        // Restore previous view if available
        if (prevViewRef.current) {
          try {
            cy.zoom(prevViewRef.current.zoom)
            cy.pan(prevViewRef.current.pan)
          } catch (error) {
            console.warn('Failed to restore previous view:', error)
          }
        }
        
        prevViewRef.current = null
        hoveredComponentRef.current = null
      })
    } catch (error) {
      console.error('Unexpected error in clearHoverPreview:', error)
    }
  }, 150)
}

/**
 * Highlight a whole component by its internal id
 */
export function highlightComponent(
  cy: cytoscape.Core,
  componentId: number,
  selectedBorderWidth: number
): void {
  if (!cy) {
    console.warn('highlightComponent called with null Cytoscape instance')
    return
  }
  
  try {
    cy.batch(() => {
      try {
        cy.nodes().forEach((n) => { n.data("highlight", 0) })
      } catch (error) {
        console.warn('Failed to clear highlights:', error)
      }
      
      try {
        // Compute by BFS on the current graph
        const { nidToCid } = computeComponents(cy)
        
        // Apply highlight to nodes with matching cid and fit viewport
        const idsToFit: string[] = []
        nidToCid.forEach((cid, nid) => {
          if (cid === componentId) {
            try {
              const node = cy.getElementById(nid)
              if (node && node.nonempty()) {
                node.data("highlight", 1)
                idsToFit.push(nid)
              }
            } catch (nodeError) {
              console.warn(`Failed to highlight node ${nid}:`, nodeError)
            }
          }
        })
        
        if (idsToFit.length > 0) {
          try {
            const sel = cy.collection(idsToFit.map((id) => cy.getElementById(id) as any))
            cy.fit(sel, 40)
            
            // Pulse animation to clearly indicate selection (respect selectedBorderWidth)
            const base = Math.max(0, selectedBorderWidth)
            const high = base + 4
            sel.nodes().forEach((n) => {
              try {
                n.animate({ style: { 'border-width': high } }, { duration: 140 })
                n.animate({ style: { 'border-width': base } }, { duration: 180 })
              } catch (animError) {
                console.warn('Failed to animate node border:', animError)
              }
            })
            
            // After animation, remove the highlight border bypass so stylesheet applies
            window.setTimeout(() => {
              sel.nodes().forEach((n) => {
                try {
                  n.data('highlight', 0)
                  ;(n as any).removeStyle?.('border-width') || n.removeStyle()
                } catch (styleError) {
                  console.warn('Failed to remove node style:', styleError)
                }
              })
            }, 500)
          } catch (fitError) {
            console.warn('Failed to fit and animate component:', fitError)
          }
        }
      } catch (error) {
        console.error('Failed to highlight component:', error)
      }
    })
  } catch (error) {
    console.error('Unexpected error in highlightComponent:', error)
  }
}

/**
 * Progressive rendering configuration for large networks
 * Renders nodes in batches to improve perceived performance
 */
export interface ProgressiveRenderConfig {
  enabled: boolean
  batchSize: number
  batchDelay: number
  prioritizeVisible: boolean
}

/**
 * Progressive rendering configurations by performance tier
 */
export const PROGRESSIVE_RENDER_CONFIG: Record<string, ProgressiveRenderConfig> = {
  extreme: {
    enabled: true,
    batchSize: 500,
    batchDelay: 50,
    prioritizeVisible: true
  },
  massive: {
    enabled: true,
    batchSize: 1000,
    batchDelay: 100,
    prioritizeVisible: true
  }
}

/**
 * Renders network elements progressively in batches
 * This improves perceived performance for very large networks (>2000 nodes)
 * by displaying nodes incrementally rather than all at once
 * 
 * @param cy - Cytoscape instance
 * @param elements - Array of node and edge elements to render
 * @param config - Progressive rendering configuration
 * @param onProgress - Optional callback for progress updates (current batch, total batches)
 * @returns Promise that resolves when all elements are rendered
 */
export function renderProgressively(
  cy: cytoscape.Core,
  elements: cytoscape.ElementDefinition[],
  config: ProgressiveRenderConfig,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    if (!config.enabled || elements.length === 0) {
      // If progressive rendering is disabled or no elements, add all at once
      try {
        cy.add(elements)
      } catch (error) {
        console.error('Failed to add elements:', error)
      }
      resolve()
      return
    }
    
    // Split elements into nodes and edges
    const nodes = elements.filter(el => el.group === 'nodes' || !el.group)
    const edges = elements.filter(el => el.group === 'edges')
    
    // Create batches of nodes
    const batches: cytoscape.ElementDefinition[][] = []
    for (let i = 0; i < nodes.length; i += config.batchSize) {
      batches.push(nodes.slice(i, i + config.batchSize))
    }
    
    let currentBatch = 0
    const totalBatches = batches.length
    
    function renderNextBatch() {
      if (currentBatch >= totalBatches) {
        // All nodes rendered, now add edges
        try {
          cy.add(edges)
        } catch (error) {
          console.error('Failed to add edges:', error)
        }
        resolve()
        return
      }
      
      try {
        // Add current batch of nodes
        cy.add(batches[currentBatch])
        
        // Report progress
        if (onProgress) {
          onProgress(currentBatch + 1, totalBatches)
        }
        
        currentBatch++
        
        // Schedule next batch using requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
          setTimeout(renderNextBatch, config.batchDelay)
        })
      } catch (error) {
        console.error(`Failed to render batch ${currentBatch}:`, error)
        // Continue with next batch even if current batch fails
        currentBatch++
        requestAnimationFrame(() => {
          setTimeout(renderNextBatch, config.batchDelay)
        })
      }
    }
    
    // Start rendering
    renderNextBatch()
  })
}

// Cola layout configuration is now exported from performanceUtils.ts
// Import DEFAULT_COLA_OPTIONS and getColaOptionsForSize from there
