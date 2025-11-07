import { useEffect, useCallback, useRef } from 'react'
import type cytoscape from 'cytoscape'
import type { 
  UseNetworkEventsProps
} from '@/components/Networks/Cytoscape/types'

export function useNetworkEvents({
  cy,
  handlers,
  config,
}: UseNetworkEventsProps): void {
  const { onNodeTap, onBackgroundTap, onNodeSelect } = handlers
  const { enableHoverInfo, isBigGraph, disableComponentTapHighlight = false, highlightActiveRef } = config
  
  // Store refs to current handlers to avoid stale closures
  const handlersRef = useRef(handlers)
  const configRef = useRef(config)
  
  useEffect(() => {
    handlersRef.current = handlers
    configRef.current = config
  }, [handlers, config])

  // Tokenize function for edge hover overlaps
  const tokenize = useCallback((s: string) => s.split(/\s+/).filter(Boolean), [])

  useEffect(() => {
    if (!cy) return

    // Node tap handler
    const onTapNode = (evt: cytoscape.EventObject) => {
      const node = evt.target
      const id = String(node.data("id"))
      const label = node.data("label") as string | undefined
      
      // Call the provided handler
      handlersRef.current.onNodeTap(id, label)
      
      // Optionally highlight the entire component on tap (disabled for subgraph view)
      if (!configRef.current.disableComponentTapHighlight) {
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
          // Ignore highlight errors
        }
      }
      
      try { 
        node.unselect() 
      } catch {}
    }

    // Node hover handlers: show node labels on hover
    const onMouseOverNode = (evt: cytoscape.EventObject) => {
      if (!configRef.current.enableHoverInfo) return
      if (configRef.current.isBigGraph && cy.zoom() < 0.5) return
      try { 
        evt.target.addClass("hovered") 
      } catch {}
    }

    const onMouseOutNode = (evt: cytoscape.EventObject) => {
      try { 
        evt.target.removeClass("hovered") 
      } catch {}
    }

    // Edge hover: compute protein overlaps between endpoint node labels
    const onMouseOverEdge = (evt: cytoscape.EventObject) => {
      if (highlightActiveRef.current) return
      if (!configRef.current.enableHoverInfo) return
      if (configRef.current.isBigGraph) return
      if (cy.zoom() < 0.6) return
      
      try {
        const e = evt.target
        const sid = String(e.data("source"))
        const tid = String(e.data("target"))
        const sNode = cy.getElementById(sid)
        const tNode = cy.getElementById(tid)
        const sLabel = String(sNode?.data("label") ?? "")
        const tLabel = String(tNode?.data("label") ?? "")
        
        const sTokens = tokenize(sLabel)
        const tTokens = tokenize(tLabel)
        const setT = new Set(tTokens)
        const overlap = Array.from(new Set(sTokens.filter((x) => setT.has(x))))
        
        // Overlap (center, larger)
        const text = overlap.length > 0 ? overlap.join(" ") : ""
        e.data("hoverLabel", text)
        
        // Endpoint labels (smaller, shown as source/target-label)
        e.data("sourceLabel", sLabel)
        e.data("targetLabel", tLabel)
        e.addClass("hovered")
      } catch {}
    }

    const onMouseOutEdge = (evt: cytoscape.EventObject) => {
      try {
        const e = evt.target
        e.removeClass("hovered")
        e.data("hoverLabel", "")
        e.data("sourceLabel", "")
        e.data("targetLabel", "")
      } catch {}
    }

    // Background tap clears highlight and closes drawer
    const onTapBg = (evt: cytoscape.EventObject) => {
      if (evt.target === cy) {
        cy.batch(() => {
          cy.nodes().forEach((n) => { 
            n.data("highlight", 0)
            n.data("proteinHighlight", 0)
            n.data("dim", 0) 
          })
        })
        handlersRef.current.onBackgroundTap()
      }
    }

    // Attach event listeners
    cy.on("tap", "node", onTapNode)
    cy.on("tap", onTapBg)
    cy.on("mouseover", "node", onMouseOverNode)
    cy.on("mouseout", "node", onMouseOutNode)
    
    // Only attach edge hover events for smaller graphs
    if (!isBigGraph) {
      cy.on("mouseover", "edge", onMouseOverEdge)
      cy.on("mouseout", "edge", onMouseOutEdge)
    }

    // Cleanup function
    return () => {
      cy?.off("tap", "node", onTapNode)
      cy?.off("tap", onTapBg)
      cy?.off("mouseover", "node", onMouseOverNode)
      cy?.off("mouseout", "node", onMouseOutNode)
      
      if (!isBigGraph) {
        cy?.off("mouseover", "edge", onMouseOverEdge)
        cy?.off("mouseout", "edge", onMouseOutEdge)
      }
    }
  }, [cy, onNodeTap, onBackgroundTap, onNodeSelect, enableHoverInfo, isBigGraph, disableComponentTapHighlight, tokenize])
}