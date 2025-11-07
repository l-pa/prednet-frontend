import { useState, useCallback, useRef } from 'react'
import type cytoscape from 'cytoscape'
import type { UseLayoutCancellationReturn } from '../components/Networks/Cytoscape/types'

/**
 * Custom hook for managing layout cancellation and fallback behavior
 * Provides functionality to cancel long-running layout computations
 * and apply a fallback grid layout when needed
 * 
 * @param cy - Cytoscape instance
 * @param onLayoutComplete - Callback to invoke when layout completes or is cancelled
 * @returns Layout cancellation utilities
 */
export function useLayoutCancellation(
  cy: cytoscape.Core | null,
  onLayoutComplete: () => void
): UseLayoutCancellationReturn {
  const [isCancelling, setIsCancelling] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const layoutStopHandlerRef = useRef<(() => void) | null>(null)

  /**
   * Applies a simple grid layout as a fallback
   * Used when layout is cancelled or times out
   */
  const applyFallbackLayout = useCallback(() => {
    if (!cy) {
      console.warn('Cannot apply fallback layout: Cytoscape instance not initialized')
      return
    }

    try {
      // Remove any existing layout stop handlers to prevent conflicts
      if (layoutStopHandlerRef.current) {
        cy.off('layoutstop', layoutStopHandlerRef.current)
        layoutStopHandlerRef.current = null
      }

      // Set up completion handler for fallback layout
      const onStop = () => {
        try {
          cy.off('layoutstop', onStop)
          setIsCancelling(false)
          onLayoutComplete()
          cy.fit(undefined, 20)
        } catch (error) {
          console.error('Error in fallback layout completion handler:', error)
          setIsCancelling(false)
          onLayoutComplete()
        }
      }

      cy.one('layoutstop', onStop)

      // Apply simple grid layout
      cy.layout({
        name: 'grid',
        animate: false,
        fit: false,
        avoidOverlap: true,
        padding: 30,
      }).run()

      console.log('Applied fallback grid layout')
    } catch (error) {
      console.error('Failed to apply fallback layout:', error)
      setIsCancelling(false)
      onLayoutComplete()
    }
  }, [cy, onLayoutComplete])

  /**
   * Cancels the currently running layout computation
   * Stops the layout and applies a fallback grid layout
   */
  const cancelLayout = useCallback(() => {
    if (!cy) {
      console.warn('Cannot cancel layout: Cytoscape instance not initialized')
      return
    }

    if (isCancelling) {
      console.log('Layout cancellation already in progress')
      return
    }

    try {
      console.log('Cancelling layout computation...')
      setIsCancelling(true)

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Stop the current layout
      cy.stop()

      // Apply fallback layout after a brief delay to ensure stop completes
      setTimeout(() => {
        applyFallbackLayout()
      }, 100)
    } catch (error) {
      console.error('Error cancelling layout:', error)
      setIsCancelling(false)
      onLayoutComplete()
    }
  }, [cy, isCancelling, applyFallbackLayout, onLayoutComplete])

  return {
    cancelLayout,
    isCancelling,
    applyFallbackLayout,
  }
}

/**
 * Wraps a layout execution with timeout protection
 * Automatically cancels the layout if it exceeds the timeout duration
 * 
 * @param cy - Cytoscape instance
 * @param layoutOptions - Layout configuration options
 * @param onComplete - Callback when layout completes successfully
 * @param onTimeout - Callback when layout times out
 * @param timeoutMs - Timeout duration in milliseconds (default: 30000)
 */
export function runLayoutWithTimeout(
  cy: cytoscape.Core,
  layoutOptions: any,
  onComplete: () => void,
  onTimeout: () => void,
  timeoutMs: number = 30000
): void {
  let timeoutId: NodeJS.Timeout | null = null
  let completed = false

  // Set up timeout handler
  timeoutId = setTimeout(() => {
    if (!completed) {
      console.warn(`Layout computation exceeded ${timeoutMs}ms timeout, triggering cancellation`)
      completed = true
      cy.stop()
      onTimeout()
    }
  }, timeoutMs)

  // Set up completion handler
  const onStop = () => {
    if (!completed) {
      completed = true
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      cy.off('layoutstop', onStop)
      onComplete()
    }
  }

  cy.one('layoutstop', onStop)

  // Run the layout
  try {
    cy.layout(layoutOptions).run()
  } catch (error) {
    completed = true
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    console.error('Layout failed:', error)
    onTimeout()
  }
}
