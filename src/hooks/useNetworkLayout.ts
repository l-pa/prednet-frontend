import { useCallback, useRef } from 'react'
import type { 
  LayoutActions,
  UseNetworkLayoutProps,
  UseNetworkLayoutReturn
} from '@/components/Networks/Cytoscape/types'
import { runLayoutWithTimeout } from './useLayoutCancellation'

export interface UseNetworkLayoutPropsExtended extends UseNetworkLayoutProps {
  onLayoutTimeout?: () => void
  timeoutMs?: number
}

export function useNetworkLayout({
  cy,
  config,
  onLayoutStart,
  onLayoutComplete,
  onLayoutTimeout,
  timeoutMs = 60000,
}: UseNetworkLayoutPropsExtended): UseNetworkLayoutReturn {
  const { selectedLayout, autoRunLayout, fitOnInit } = config
  const layoutTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Run layout with proper configuration and timeout protection
  const runLayout = useCallback(() => {
    if (!cy) {
      console.warn('Cannot run layout: Cytoscape instance not initialized')
      return
    }

    try {
      console.log(`Starting layout: ${selectedLayout}`)
      onLayoutStart()

      // Clear any existing timeout
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current)
        layoutTimeoutRef.current = null
      }

      // Handler for successful layout completion
      const handleComplete = async () => {
        try {
          onLayoutComplete()
          // Use a small delay to ensure layout positions are finalized
          setTimeout(() => {
            try {
              cy.fit(undefined, 50)
            } catch (fitError) {
              console.error('Error fitting view:', fitError)
            }
          }, 50)
        } catch (error) {
          console.error('Error in layout completion handler:', error)
          onLayoutComplete() // Still call completion to reset state
        }
      }

      // Handler for layout timeout
      const handleTimeout = () => {
        console.warn(`Layout computation timed out after ${timeoutMs}ms`)
        
        // Log timeout event for debugging
        console.log('Layout timeout details:', {
          layout: selectedLayout,
          nodeCount: cy.nodes().length,
          edgeCount: cy.edges().length,
          timestamp: new Date().toISOString(),
        })

        // Call the timeout callback if provided
        if (onLayoutTimeout) {
          onLayoutTimeout()
        } else {
          // Default behavior: just complete the layout state
          onLayoutComplete()
        }
      }

      // Get layout options based on selected layout
      let layoutOptions: any

      if (selectedLayout === "concentric-attribute") {
        // Special concentric layout based on node types
        const ranks: Record<string, number> = {
          matched_prediction: 4,
          matched_reference: 3,
          prediction: 2,
          reference: 1,
        }
        
        layoutOptions = {
          name: "concentric",
          concentric: (node: any) => {
            const t = String(node.data("type") ?? "")
            return ranks[t] ?? 0
          },
          levelWidth: () => 1,
          animate: false,
          avoidOverlap: true,
          startAngle: 3.1415 / 2,
          sweep: 3.1415 * 2,
          fit: false,
        }
      } else {
        // Standard layouts with optimized configurations
        const name = selectedLayout as any
        const common = { animate: false, fit: false, worker: true } as any
        
        if (name === 'fcose') {
          layoutOptions = { 
            name, 
            quality: 'default', 
            randomize: true, 
            animate: false,
            fit: false,
            idealEdgeLength: 50,
            nodeRepulsion: 4500,
            edgeElasticity: 0.45,
            gravity: 0.25,
            numIter: 2500,
            packComponents: true,
            // Use built-in component spacing
            tilingPaddingVertical: 100,
            tilingPaddingHorizontal: 100,
          }
        } else if (name === 'cose-bilkent') {
          layoutOptions = { 
            name, 
            quality: 'default', 
            randomize: false, 
            nodeRepulsion: 4500,
            idealEdgeLength: 50,
            edgeElasticity: 0.45,
            nestingFactor: 0.1,
            gravity: 0.25,
            numIter: 2500,
            tile: true,
            // Use built-in component spacing
            tilingPaddingVertical: 100,
            tilingPaddingHorizontal: 100,
            animate: false,
            fit: false,
          }
        } else if (name === 'elk') {
          layoutOptions = {
            name: 'elk',
            nodeDimensionsIncludeLabels: true,
            fit: false,
            animate: false,
            worker: true,
            elk: {
              algorithm: 'force',
              'elk.force.repulsion': 1,
              'elk.force.temperature': 0.01,
              'elk.force.iterations': 300,
              'elk.spacing.componentComponent': 5,
              'elk.spacing.nodeNode': 15,
            },
          }
        } else if (name === 'dagre') {
          layoutOptions = {
            name: 'dagre',
            nodeSep: 50,
            edgeSep: 10,
            rankSep: 50,
            rankDir: 'TB',
            ranker: 'network-simplex',
            fit: false,
            animate: false,
          }
        } else {
          layoutOptions = { name, ...common }
        }
      }

      // Run layout with timeout protection
      runLayoutWithTimeout(
        cy,
        layoutOptions,
        handleComplete,
        handleTimeout,
        timeoutMs
      )
    } catch (error) {
      console.error('Unexpected error in runLayout:', error)
      onLayoutComplete() // Ensure state is reset even on error
    }
  }, [cy, selectedLayout, onLayoutStart, onLayoutComplete, onLayoutTimeout, timeoutMs])

  // Reset view to fit all elements
  const resetView = useCallback(() => {
    if (!cy) {
      console.warn('Cannot reset view: Cytoscape instance not initialized')
      return
    }
    try {
      cy.fit(undefined, 20)
    } catch (error) {
      console.error('Failed to reset view:', error)
    }
  }, [cy])

  const actions: LayoutActions = {
    runLayout,
    resetView,
  }

  return { actions }
}

// Helper function to get layout-specific options
export function getLayoutOptions(layoutName: string): any {
  const common = { animate: false, fit: false, worker: true }
  
  switch (layoutName) {
    case 'fcose':
      return {
        name: 'fcose',
        quality: 'default',
        randomize: true,
        animate: false,
        fit: false,
        idealEdgeLength: 50,
        nodeRepulsion: 4500,
        edgeElasticity: 0.45,
        gravity: 0.25,
        numIter: 2500,
        packComponents: true,
        tilingPaddingVertical: 100,
        tilingPaddingHorizontal: 100,
      }
    
    case 'cose-bilkent':
      return {
        name: 'cose-bilkent',
        quality: 'default',
        randomize: false,
        nodeRepulsion: 4500,
        idealEdgeLength: 50,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 100,
        tilingPaddingHorizontal: 100,
        animate: false,
        fit: false,
      }
    
    case 'elk':
      return {
        name: 'elk',
        nodeDimensionsIncludeLabels: true,
        fit: false,
        animate: false,
        worker: true,
        elk: {
          algorithm: 'force',
          'elk.force.repulsion': 20,
          'elk.force.temperature': 0.001,
          'elk.force.iterations': 300,
          'elk.spacing.componentComponent': 10,
          'elk.spacing.nodeNode': 20,
        },
      }
    
    case 'dagre':
      return {
        name: 'dagre',
        nodeSep: 50,
        edgeSep: 10,
        rankSep: 50,
        rankDir: 'TB',
        ranker: 'network-simplex',
        fit: false,
        animate: false,
      }
    
    case 'concentric-attribute':
      return {
        name: 'concentric',
        concentric: (node: any) => {
          const ranks: Record<string, number> = {
            matched_prediction: 4,
            matched_reference: 3,
            prediction: 2,
            reference: 1,
          }
          const t = String(node.data("type") ?? "")
          return ranks[t] ?? 0
        },
        levelWidth: () => 1,
        animate: false,
        avoidOverlap: true,
        startAngle: 3.1415 / 2,
        sweep: 3.1415 * 2,
        fit: false,
      }
    
    default:
      return {
        name: layoutName,
        ...common,
      }
  }
}