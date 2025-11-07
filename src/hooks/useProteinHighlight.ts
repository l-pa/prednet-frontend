import { useCallback, useRef, useEffect } from 'react'
import type { 
  ProteinHighlightActions,
  UseProteinHighlightProps,
  UseProteinHighlightReturn
} from '@/components/Networks/Cytoscape/types'

export function useProteinHighlight({
  cy,
  highlightMode,
  filterComponentsByProteins,
  highlightProteins,
  setHighlightProteins,
  setExpandedProteins,
}: UseProteinHighlightProps): UseProteinHighlightReturn {
  // Track whether highlighting is active to suppress labels/hover labels
  const highlightActiveRef = useRef<boolean>(false)

  // Update highlight active state when proteins change
  useEffect(() => {
    highlightActiveRef.current = highlightProteins.size > 0
  }, [highlightProteins])

  // Tokenize function for protein labels
  const tokenize = useCallback((s: string) => s.split(/\s+/).filter(Boolean), [])

  // Main protein highlighting computation
  const recomputeProteinHighlight = useCallback(() => {
    if (!cy) {
      console.warn('Cannot compute protein highlight: Cytoscape instance not initialized')
      return
    }
    
    try {
      const tokensSel = new Set(highlightProteins)
      
      cy.batch(() => {
        const anyActive = tokensSel.size > 0
        
        try {
          // Reset visibility
          cy.nodes().forEach((n) => { 
            n.style("display", "element") 
          })
          cy.edges().forEach((e) => { 
            e.style("display", "element") 
          })
        } catch (error) {
          console.error('Failed to reset element visibility:', error)
          return
        }
        
        // Compute hits according to selected match mode
        try {
          cy.nodes().forEach((n) => {
            if (!anyActive) {
              n.data("proteinHighlight", 0)
              n.data("dim", 0)
              return
            }
            
            try {
              const lbl = String(n.data("label") ?? "")
              const toksSet = new Set(tokenize(lbl))
              let hit = 0
              
              if (highlightMode === 'AND') {
                hit = 1
                for (const sel of tokensSel) {
                  if (!toksSet.has(sel)) { 
                    hit = 0
                    break 
                  }
                }
              } else {
                // OR mode
                for (const sel of tokensSel) { 
                  if (toksSet.has(sel)) { 
                    hit = 1
                    break 
                  } 
                }
              }
              
              n.data("proteinHighlight", hit)
              n.data("dim", hit ? 0 : 1)
            } catch (nodeError) {
              console.warn(`Failed to process node ${n.id()}:`, nodeError)
              // Continue with other nodes
            }
          })
        } catch (error) {
          console.error('Failed to compute protein highlights:', error)
          return
        }
        
        // Filter to components containing highlighted proteins if enabled
        if (anyActive && filterComponentsByProteins) {
          try {
            // Hide nodes/edges that are not in components containing at least one highlighted node
            const visited = new Set<string>()
            const queue: string[] = []
            
            // Seed queue with highlighted nodes
            cy.nodes().forEach((n) => { 
              if (n.data("proteinHighlight") === 1) {
                queue.push(n.id()) 
              }
            })
            
            // BFS to mark their components
            while (queue.length) {
              const id = queue.shift() as string
              if (visited.has(id)) continue
              visited.add(id)
              
              try {
                const node = cy.getElementById(id)
                if (node && node.nonempty()) {
                  node.connectedEdges().forEach((e) => {
                    const s = String(e.data("source"))
                    const t = String(e.data("target"))
                    if (!visited.has(s)) queue.push(s)
                    if (!visited.has(t)) queue.push(t)
                  })
                }
              } catch (nodeError) {
                console.warn(`Failed to process connected edges for node ${id}:`, nodeError)
                // Continue with other nodes
              }
            }
            
            // Hide nodes not visited; keep only subgraph of visited ids
            cy.nodes().forEach((n) => {
              if (!visited.has(n.id())) {
                n.style("display", "none")
              }
            })
            cy.edges().forEach((e) => {
              const s = String(e.data("source"))
              const t = String(e.data("target"))
              if (!(visited.has(s) && visited.has(t))) {
                e.style("display", "none")
              }
            })
          } catch (error) {
            console.error('Failed to filter components by proteins:', error)
          }
        }
      })
    } catch (error) {
      console.error('Unexpected error in protein highlight computation:', error)
    }
  }, [cy, highlightProteins, tokenize, filterComponentsByProteins, highlightMode])

  // Memoized actions object
  const actions: ProteinHighlightActions = {
    setHighlightProteins,
    setExpandedProteins,
    recomputeProteinHighlight,
    tokenize,
  }

  return {
    actions,
    highlightActiveRef,
  }
}