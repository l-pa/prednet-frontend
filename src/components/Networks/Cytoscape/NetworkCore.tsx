import { useEffect, useRef, RefObject, MutableRefObject } from "react"
import cytoscape, { type ElementDefinition } from "cytoscape"
import type { CytoscapeConfig } from './types'

// Register worker-capable/efficient layouts when available
// Using dynamic imports for Vite compatibility
// @ts-ignore - no type definitions available
import cytoscapeFcose from 'cytoscape-fcose'
// @ts-ignore - no type definitions available
import cytoscapeCoseBilkent from 'cytoscape-cose-bilkent'
// @ts-ignore - no type definitions available
import cytoscapeElk from 'cytoscape-elk'

try {
  cytoscape.use(cytoscapeFcose)
  console.log('✓ cytoscape-fcose registered')
} catch (e) {
  console.error('Failed to register fcose:', e)
}

try {
  cytoscape.use(cytoscapeCoseBilkent)
  console.log('✓ cytoscape-cose-bilkent registered')
} catch (e) {
  console.error('Failed to register cose-bilkent:', e)
}

try {
  cytoscape.use(cytoscapeElk)
  console.log('✓ cytoscape-elk registered')
} catch (e) {
  console.error('Failed to register elk:', e)
}

interface NetworkCoreProps {
  containerRef: RefObject<HTMLDivElement>
  cyRef: MutableRefObject<cytoscape.Core | null>
  elements: ElementDefinition[]
  config: CytoscapeConfig
  onNodeTap: (nodeId: string, label?: string) => void
  onBackgroundTap: () => void
}

export default function NetworkCore({
  containerRef,
  cyRef,
  elements,
  config,
  onNodeTap,
  onBackgroundTap,
}: NetworkCoreProps) {
  const {
    wheelSensitivity,
    minZoom,
    maxZoom,
    isBigGraph,
    showLabels,
    nodeScale,
    edgeScale,
    selectedBorderWidth,
    enableHoverInfo,
    highlightActiveRef,
    performanceTier,
    hoverLabelScale,
  } = config

  // No automatic feature disabling - only show warnings to users
  // Users can manually adjust settings if they experience performance issues
  const shouldDisableEdgeHover = false
  const shouldHideLabelsOnViewport = false

  // Create stable refs for event handler callbacks
  const onNodeTapRef = useRef(onNodeTap)
  const onBackgroundTapRef = useRef(onBackgroundTap)

  // Update refs when callbacks change
  useEffect(() => {
    onNodeTapRef.current = onNodeTap
  }, [onNodeTap])

  useEffect(() => {
    onBackgroundTapRef.current = onBackgroundTap
  }, [onBackgroundTap])

  // Initialize Cytoscape instance with base/default styles
  // Only re-initializes when container or core configuration changes
  useEffect(() => {
    if (!containerRef.current) {
      console.warn('Cannot initialize Cytoscape: container ref not available')
      return
    }

    // Destroy existing instance before creating a new one
    if (cyRef.current) {
      try {
        cyRef.current.destroy()
      } catch (error) {
        console.warn('Error destroying previous Cytoscape instance:', error)
      }
      cyRef.current = null
    }

    // Base initialization configuration with default style values
    // Style properties (showLabels, nodeScale, edgeScale, selectedBorderWidth) 
    // are handled by separate effects to avoid re-initialization
    const baseInit = {
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-opacity": 1, // Default: labels visible (updated by separate effect)
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-max-width": "120px",
            "min-zoomed-font-size": 8,
            "border-width": 0,
            "background-color": "#cccccc",
            width: 40, // Default: base size (updated by separate effect)
            height: 40, // Default: base size (updated by separate effect)
            "z-index-compare": "manual",
            "z-index": 10,
          },
        },
        {
          selector: "node.hovered",
          style: {
            label: "data(label)",
            "font-size": 11,
            "text-opacity": 1,
            "min-zoomed-font-size": 0,
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.95,
            "text-background-shape": "roundrectangle",
            "text-background-padding": "4px",
            "text-border-width": 1,
            "text-border-color": "#e0e0e0",
            "text-border-opacity": 0.8,
            "z-index-compare": "manual",
            "z-index": 100001,
          },
        },
        {
          selector: "node.showNodeId",
          style: {
            label: "data(tempNodeId)",
            "font-size": 7,
            "font-weight": 600,
            "text-opacity": 1,  // Always visible, regardless of showLabels setting
            "min-zoomed-font-size": 0,
            "text-valign": "center",  // Center on node (below the edge label)
            "text-halign": "center",
            "text-background-color": "data(backgroundColor)",  // Use node's own color
            "text-background-opacity": 0.95,
            "text-background-shape": "roundrectangle",
            "text-background-padding": "2px",
            "text-border-width": 1,
            "text-border-color": "#ffffff",  // White border for contrast
            "text-border-opacity": 0.9,
            color: "#ffffff",  // White text for contrast
            "z-index-compare": "manual",
            "z-index": 100002,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 3, // Default: base border width (updated by separate effect)
            "overlay-opacity": 0,
          },
        },
        {
          selector: "node[highlight = 1]",
          style: {
            "border-width": 3, // Default: base border width (updated by separate effect)
            "border-color": "#FF9800",
            "border-opacity": 1,
          },
        },
        {
          selector: "node[proteinHighlight = 1]",
          style: {
            "border-width": 3, // Default: base border width (updated by separate effect)
            "border-color": "#2196F3",
            "border-opacity": 1,
            "z-index": 9999,
          },
        },
        {
          selector: "node[dim = 1]",
          style: {
            opacity: 0.25,
            "text-opacity": 0.2,
          },
        },
        { selector: "node[type = 'matched_prediction']", style: { "background-color": "#74C476" } },
        { selector: "node[type = 'matched_reference']", style: { "background-color": "#67A9CF" } },
        { selector: "node[type = 'prediction']", style: { "background-color": "#FCCF40" } },
        { selector: "node[type = 'reference']", style: { "background-color": "#D94801" } },
        {
          selector: "edge",
          style: {
            width: 5, // Default: base width (updated by separate effect)
            "line-color": "data(edgeColor)",
            "target-arrow-color": "data(edgeColor)",
            "target-arrow-shape": "none",
            "curve-style": "bezier",
            "z-index-compare": "manual",
            "z-index": 5,
          },
        },
        {
          selector: "edge.hovered",
          style: {
            // Single multi-line label containing all three pieces of info
            label: "data(hoverLabel)",
            "font-size": 7,
            "font-weight": 500,
            color: "#1a237e",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.95,
            "text-background-shape": "roundrectangle",
            "text-background-padding": "3px",
            "text-border-width": 1,
            "text-border-color": "#90CAF9",
            "text-border-opacity": 0.8,
            "text-wrap": "wrap",
            "text-max-width": "120px",
            "text-margin-y": -40,  // Positioned high above edge, so node IDs appear below it
            "z-index-compare": "manual",
            "z-index": 100002,
          },
        },
      ],
      wheelSensitivity,
      minZoom,
      maxZoom,
      pixelRatio: 1,
      textureOnViewport: true,
      hideEdgesOnViewport: isBigGraph ? true : false,
      hideLabelsOnViewport: shouldHideLabelsOnViewport,
      motionBlur: true,
    } as const

    // Create Cytoscape instance
    try {
      cyRef.current = cytoscape({
        ...(baseInit as any),
        renderer: {
          name: 'canvas',
          webgl: false,
          showFps: false,
          webglDebug: false,
          webglTexSize: 4096,
          webglTexRows: 24,
          webglBatchSize: 2048,
          webglTexPerBatch: 16,
        } as any,
      })
    } catch (error) {
      console.error('Failed to initialize Cytoscape instance:', error)
      return
    }

    const cy = cyRef.current
    if (!cy) {
      console.error('Cytoscape instance is null after initialization')
      return
    }

    // Node tap handler
    const onTapNode = (evt: cytoscape.EventObject) => {
      try {
        const node = evt.target
        const id = String(node.data("id"))
        const label = node.data("label") as string | undefined
        onNodeTapRef.current(id, label)
        try { node.unselect() } catch {}
      } catch (error) {
        console.error('Error in node tap handler:', error)
      }
    }
    cy.on("tap", "node", onTapNode)

    // Note: Hover handlers (mouseover/mouseout for nodes and edges) are now managed
    // by a separate effect that responds to enableHoverInfo changes dynamically

    // Background tap handler
    const onTapBg = (evt: cytoscape.EventObject) => {
      try {
        if (evt.target === cy) {
          onBackgroundTapRef.current()
        }
      } catch (error) {
        console.error('Error in background tap handler:', error)
      }
    }
    cy.on("tap", onTapBg)

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        if (!cy) return
        cy.resize()
      } catch (error) {
        console.warn('Error resizing Cytoscape:', error)
      }
    })
    
    try {
      resizeObserver.observe(containerRef.current)
    } catch (error) {
      console.error('Failed to observe container resize:', error)
    }

    // Cleanup
    return () => {
      try {
        resizeObserver.disconnect()
      } catch (error) {
        console.warn('Error disconnecting resize observer:', error)
      }
      
      try {
        cy?.off("tap", "node", onTapNode)
        cy?.off("tap", onTapBg)
        // Note: Hover handlers are cleaned up by the separate enableHoverInfo effect
      } catch (error) {
        console.warn('Error removing event listeners:', error)
      }
      
      if (cyRef.current) {
        try {
          cyRef.current.destroy()
        } catch (error) {
          console.warn('Error destroying Cytoscape instance:', error)
        }
        cyRef.current = null
      }
    }
  }, [
    containerRef,
    wheelSensitivity,
    minZoom,
    maxZoom,
    isBigGraph,
    shouldHideLabelsOnViewport,
  ])

  // Update label visibility when showLabels changes
  useEffect(() => {
    if (!cyRef.current) return
    
    const cy = cyRef.current
    try {
      cy.style()
        .selector("node")
        .style({ 'text-opacity': showLabels ? 1 : 0 })
        .selector("node.hovered")
        .style({ 'text-opacity': 1 }) // Ensure hovered node labels remain visible
        .selector("node.showNodeId")
        .style({ 'text-opacity': 1 }) // Ensure node ID labels always show on edge hover
        .update()
    } catch (error) {
      console.warn('Error updating label visibility:', error)
    }
  }, [showLabels])

  // Automatic optimization: Hide node labels when zoomed out below 50% for moderate+ tiers
  // This improves performance by reducing text rendering overhead at low zoom levels
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    
    // Only apply zoom-based label hiding for moderate+ tiers
    const shouldApplyZoomOptimization = performanceTier === 'moderate' || performanceTier === 'large' || performanceTier === 'extreme'
    if (!shouldApplyZoomOptimization) return
    
    const handleZoom = () => {
      try {
        const zoom = cy.zoom()
        const shouldHideLabels = zoom < 0.5
        
        // Only update if showLabels is true (respect user's label preference)
        if (showLabels) {
          cy.style()
            .selector("node")
            .style({ 'text-opacity': shouldHideLabels ? 0 : 1 })
            .selector("node.hovered")
            .style({ 'text-opacity': 1 }) // Keep hovered labels visible
            .selector("node.showNodeId")
            .style({ 'text-opacity': 1 }) // Keep node ID labels visible
            .update()
        }
      } catch (error) {
        console.warn('Error handling zoom-based label optimization:', error)
      }
    }
    
    // Attach zoom event listener
    cy.on('zoom', handleZoom)
    
    // Initial check
    handleZoom()
    
    // Cleanup
    return () => {
      try {
        cy.off('zoom', handleZoom)
      } catch (error) {
        console.warn('Error removing zoom handler:', error)
      }
    }
  }, [performanceTier, showLabels])

  // Update node and edge scale when nodeScale or edgeScale changes
  useEffect(() => {
    if (!cyRef.current) return
    
    const cy = cyRef.current
    try {
      cy.style()
        .selector("node")
        .style({ 
          width: 40 * nodeScale, 
          height: 40 * nodeScale 
        })
        .selector("edge")
        .style({ 
          width: 5 * edgeScale 
        })
        .update()
    } catch (error) {
      console.warn('Error updating node and edge scale:', error)
    }
  }, [nodeScale, edgeScale])

  // Update border width for selected, highlighted, and protein-highlighted nodes
  useEffect(() => {
    if (!cyRef.current) return
    
    const cy = cyRef.current
    try {
      cy.style()
        .selector("node:selected")
        .style({ 'border-width': selectedBorderWidth })
        .selector("node[highlight = 1]")
        .style({ 'border-width': selectedBorderWidth })
        .selector("node[proteinHighlight = 1]")
        .style({ 'border-width': selectedBorderWidth })
        .update()
    } catch (error) {
      console.warn('Error updating border width:', error)
    }
  }, [selectedBorderWidth])

  // Update hover label scale when hoverLabelScale changes
  useEffect(() => {
    if (!cyRef.current) return
    
    const cy = cyRef.current
    try {
      cy.style()
        .selector("node.hovered")
        .style({ 
          'font-size': 11 * hoverLabelScale 
        })
        .selector("node.showNodeId")
        .style({ 
          'font-size': 7 * hoverLabelScale 
        })
        .selector("edge.hovered")
        .style({ 
          'font-size': 7 * hoverLabelScale 
        })
        .update()
    } catch (error) {
      console.warn('Error updating hover label scale:', error)
    }
  }, [hoverLabelScale])

  // Handle hover info toggle dynamically without re-initialization
  // This effect manages event handler attachment/detachment based on enableHoverInfo
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    // Define hover handlers that check enableHoverInfo dynamically
    const onMouseOverNode = (evt: cytoscape.EventObject) => {
      try {
        if (!enableHoverInfo) return
        if (isBigGraph && cy.zoom() < 0.5) return
        evt.target.addClass("hovered")
      } catch (error) {
        console.warn('Error in node mouseover handler:', error)
      }
    }

    const onMouseOutNode = (evt: cytoscape.EventObject) => {
      try {
        evt.target.removeClass("hovered")
      } catch (error) {
        console.warn('Error in node mouseout handler:', error)
      }
    }

    const onMouseOverEdge = (evt: cytoscape.EventObject) => {
      try {
        if (!enableHoverInfo) return
        if (highlightActiveRef.current) return
        // Automatic optimization: Disable edge hover for moderate+ tiers (200+ nodes)
        if (shouldDisableEdgeHover) return
        if (isBigGraph) return
        if (cy.zoom() < 0.6) return
        
        const e = evt.target
        const sid = String(e.data("source"))
        const tid = String(e.data("target"))
        const sNode = cy.getElementById(sid)
        const tNode = cy.getElementById(tid)
        
        const sLabel = String(sNode?.data("label") ?? sNode?.data("id") ?? "")
        const tLabel = String(tNode?.data("label") ?? tNode?.data("id") ?? "")
        const sNodeId = String(sNode?.data("id") ?? "")
        const tNodeId = String(tNode?.data("id") ?? "")
        
        const tokenize = (s: string) => {
          if (!s || typeof s !== 'string') return []
          return s.trim().split(/\s+/).filter(Boolean)
        }
        
        try {
          const sTokens = tokenize(sLabel)
          const tTokens = tokenize(tLabel)
          const sSet = new Set(sTokens)
          const tSet = new Set(tTokens)
          
          const intersection = Array.from(new Set(sTokens.filter((x) => tSet.has(x))))
          const sourceDiff = sTokens.filter((x) => !tSet.has(x))
          const targetDiff = tTokens.filter((x) => !sSet.has(x))
          
          // Determine which node is higher (lower y value = higher in layout)
          const sPos = sNode.position()
          const tPos = tNode.position()
          const sIsHigher = sPos.y < tPos.y
          
          // Format labels with node IDs
          const sourceUnique = sourceDiff.length > 0 ? sourceDiff.join("/") : ""
          const targetUnique = targetDiff.length > 0 ? targetDiff.join("/") : ""
          const sharedText = intersection.length > 0 ? intersection.join("/") : "—"
          
          // Create single multi-line label with all info and directional indicators
          const sourceText = sourceUnique ? `${sNodeId}: ${sourceUnique}` : `${sNodeId}: (all shared)`
          const targetText = targetUnique ? `${tNodeId}: ${targetUnique}` : `${tNodeId}: (all shared)`
          
          // Combine into single label with line breaks (no arrows)
          const combinedLabel = `${sourceText}\n[${sharedText}]\n${targetText}`
          
          e.data("hoverLabel", combinedLabel)
          e.data("sourceLabel", "")
          e.data("targetLabel", "")
          e.addClass("hovered")
          
          // Temporarily show node IDs on the actual nodes with their own colors
          sNode.data("tempNodeId", sNodeId)
          tNode.data("tempNodeId", tNodeId)
          sNode.data("backgroundColor", sNode.style("background-color"))
          tNode.data("backgroundColor", tNode.style("background-color"))
          sNode.addClass("showNodeId")
          tNode.addClass("showNodeId")
        } catch (setError) {
          console.warn('Error computing protein sets:', setError)
          e.data("hoverLabel", `${sNodeId} — ${tNodeId}`)
          e.data("sourceLabel", "")
          e.data("targetLabel", "")
          e.addClass("hovered")
        }
      } catch (error) {
        console.warn('Error in edge mouseover handler:', error)
      }
    }

    const onMouseOutEdge = (evt: cytoscape.EventObject) => {
      try {
        const e = evt.target
        e.removeClass("hovered")
        e.removeData("hoverLabel")
        e.removeData("sourceLabel")
        e.removeData("targetLabel")
        
        // Remove temporary node ID labels
        const sid = String(e.data("source"))
        const tid = String(e.data("target"))
        const sNode = cy.getElementById(sid)
        const tNode = cy.getElementById(tid)
        sNode.removeData("tempNodeId")
        tNode.removeData("tempNodeId")
        sNode.removeData("backgroundColor")
        tNode.removeData("backgroundColor")
        sNode.removeClass("showNodeId")
        tNode.removeClass("showNodeId")
      } catch (error) {
        console.warn('Error in edge mouseout handler:', error)
      }
    }

    // Attach or detach handlers based on enableHoverInfo
    if (enableHoverInfo) {
      // Attach node hover handlers
      cy.on("mouseover", "node", onMouseOverNode)
      cy.on("mouseout", "node", onMouseOutNode)
      
      // Attach edge hover handlers (only if not a big graph and edge hover not disabled by performance tier)
      if (!isBigGraph && !shouldDisableEdgeHover) {
        cy.on("mouseover", "edge", onMouseOverEdge)
        cy.on("mouseout", "edge", onMouseOutEdge)
      }
    } else {
      // Remove any existing hover classes when disabling
      try {
        cy.nodes().removeClass("hovered")
        cy.edges().removeClass("hovered")
        cy.edges().forEach((e) => {
          e.removeData("hoverLabel")
          e.removeData("sourceLabel")
          e.removeData("targetLabel")
        })
      } catch (error) {
        console.warn('Error clearing hover state:', error)
      }
    }

    // Cleanup: remove handlers when effect re-runs or component unmounts
    return () => {
      try {
        cy.off("mouseover", "node", onMouseOverNode)
        cy.off("mouseout", "node", onMouseOutNode)
        if (!isBigGraph && !shouldDisableEdgeHover) {
          cy.off("mouseover", "edge", onMouseOverEdge)
          cy.off("mouseout", "edge", onMouseOutEdge)
        }
      } catch (error) {
        console.warn('Error removing hover handlers:', error)
      }
    }
  }, [enableHoverInfo, isBigGraph, highlightActiveRef, shouldDisableEdgeHover])

  // Update elements when they change
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) {
      console.warn('Cannot update elements: Cytoscape instance not initialized')
      return
    }

    try {
      cy.batch(() => {
        // Index new elements by id
        const newById = new Map<string, ElementDefinition>()
        for (const el of elements) {
          try {
            const id = String((el?.data as any)?.id)
            if (id) newById.set(id, el)
          } catch (error) {
            console.warn('Failed to process element:', error)
          }
        }

        // Remove elements not present anymore and update those that remain
        const existingIds = new Set<string>()
        cy.elements().forEach((ele) => {
          try {
            const id = String(ele.id())
            const incoming = newById.get(id)
            if (!incoming) {
              ele.remove()
              return
            }
            existingIds.add(id)
            // Update data immutably
            if (incoming.data) {
              ele.data(incoming.data as any)
            }
          } catch (error) {
            console.warn(`Failed to update element ${ele.id()}:`, error)
          }
        })

        // Add new elements
        const toAdd: ElementDefinition[] = []
        newById.forEach((el, id) => {
          if (!existingIds.has(id)) toAdd.push(el)
        })
        
        if (toAdd.length > 0) {
          try {
            cy.add(toAdd)
          } catch (error) {
            console.error('Failed to add new elements:', error)
          }
        }
      })
    } catch (error) {
      console.error('Failed to update Cytoscape elements:', error)
    }
  }, [elements])

  return (
    <div
      ref={containerRef}
      style={{ 
        width: "100%", 
        height: "100%", 
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    />
  )
}