import type cytoscape from 'cytoscape'

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
