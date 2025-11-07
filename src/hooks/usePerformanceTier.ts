import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getPerformanceTier,
  estimateLayoutTime,
  shouldShowWarning as shouldShowWarningUtil,
  dismissWarning as dismissWarningUtil,
  type OptimizationConfig,
} from '../utils/performanceUtils'
import type { UsePerformanceTierReturn } from '../components/Networks/Cytoscape/types'

/**
 * Custom hook for managing performance tier logic and optimizations
 * Determines the current performance tier based on network size,
 * manages warning dismissal state, and provides optimization configuration
 * 
 * @param nodeCount - Number of nodes in the network
 * @param edgeCount - Number of edges in the network
 * @returns Performance tier information and utility functions
 */
export function usePerformanceTier(
  nodeCount: number,
  edgeCount: number
): UsePerformanceTierReturn {
  // Calculate the current performance tier based on network size
  const tier = useMemo(
    () => getPerformanceTier(nodeCount, edgeCount),
    [nodeCount, edgeCount]
  )

  // Track whether the warning should be shown
  const [shouldShowWarning, setShouldShowWarning] = useState(() =>
    shouldShowWarningUtil(tier.name)
  )

  // Update warning visibility when tier changes
  useEffect(() => {
    setShouldShowWarning(shouldShowWarningUtil(tier.name))
  }, [tier.name])

  /**
   * Dismisses the performance warning for the current tier
   * Persists dismissal to session storage
   */
  const dismissWarning = useCallback(() => {
    dismissWarningUtil(tier.name)
    setShouldShowWarning(false)
  }, [tier.name])

  /**
   * Returns the optimization configuration for the current tier
   * This can be used to apply automatic performance optimizations
   */
  const applyOptimizations = useCallback((): OptimizationConfig => {
    return tier.optimizations
  }, [tier.optimizations])

  /**
   * Estimates the layout computation time for a given layout algorithm
   * @param layoutName - The name of the layout algorithm
   * @returns Estimated time in milliseconds
   */
  const getLayoutEstimate = useCallback(
    (layoutName: string): number => {
      return estimateLayoutTime(layoutName, nodeCount, edgeCount)
    },
    [nodeCount, edgeCount]
  )

  return {
    tier,
    shouldShowWarning,
    dismissWarning,
    applyOptimizations,
    getLayoutEstimate,
  }
}
