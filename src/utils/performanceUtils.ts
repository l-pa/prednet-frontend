/**
 * Performance tier system for Cytoscape network visualization
 * Provides utilities for determining performance tiers, estimating layout times,
 * and managing performance warnings based on network size.
 */

export type PerformanceTierName = 'optimal' | 'moderate' | 'large' | 'extreme' | 'massive'
export type TierColor = 'green' | 'yellow' | 'orange' | 'red' | 'purple'

export interface OptimizationConfig {
  // Note: These are suggestions only, not automatically applied
  suggestDisableEdgeHover?: boolean
  suggestHideLabelsOnViewport?: boolean
  suggestFasterLayout?: boolean
  suggestGridLayout?: boolean
  showFilterWarning?: boolean
  hideAllLabels?: boolean
  disableEdgeArrows?: boolean
  disableEdgeSelection?: boolean
  reduceNodeDetail?: boolean
  useProgressiveRendering?: boolean
  forceSimpleLayout?: boolean
  forceGridLayout?: boolean
  disableAnimations?: boolean
  recommendDataFiltering?: boolean
}

export interface PerformanceTier {
  name: PerformanceTierName
  nodeThreshold: number
  edgeThreshold: number
  color: TierColor
  optimizations: OptimizationConfig
}

/**
 * Performance tier definitions based on network size thresholds
 */
export const PERFORMANCE_TIERS: PerformanceTier[] = [
  {
    name: 'optimal',
    nodeThreshold: 0,
    edgeThreshold: 0,
    color: 'green',
    optimizations: {}
  },
  {
    name: 'moderate',
    nodeThreshold: 200,
    edgeThreshold: 400,
    color: 'yellow',
    optimizations: { 
      suggestDisableEdgeHover: true 
    }
  },
  {
    name: 'large',
    nodeThreshold: 500,
    edgeThreshold: 1000,
    color: 'orange',
    optimizations: { 
      suggestDisableEdgeHover: true,
      suggestHideLabelsOnViewport: true,
      suggestFasterLayout: true
    }
  },
  {
    name: 'extreme',
    nodeThreshold: 2000,
    edgeThreshold: 4000,
    color: 'red',
    optimizations: {
      suggestDisableEdgeHover: true,
      suggestHideLabelsOnViewport: true,
      hideAllLabels: true,
      disableEdgeArrows: true,
      useProgressiveRendering: true,
      forceSimpleLayout: true,
      showFilterWarning: true
    }
  },
  {
    name: 'massive',
    nodeThreshold: 5000,
    edgeThreshold: 10000,
    color: 'purple',
    optimizations: {
      suggestDisableEdgeHover: true,
      hideAllLabels: true,
      disableEdgeArrows: true,
      disableEdgeSelection: true,
      useProgressiveRendering: true,
      forceGridLayout: true,
      disableAnimations: true,
      reduceNodeDetail: true,
      showFilterWarning: true,
      recommendDataFiltering: true
    }
  }
]

/**
 * Determines the performance tier based on node and edge counts
 * Returns the highest tier that matches the network size
 */
export function getPerformanceTier(
  nodeCount: number,
  edgeCount: number
): PerformanceTier {
  // Find the highest tier where network size exceeds thresholds
  for (let i = PERFORMANCE_TIERS.length - 1; i >= 0; i--) {
    const tier = PERFORMANCE_TIERS[i]
    if (nodeCount >= tier.nodeThreshold || edgeCount >= tier.edgeThreshold) {
      return tier
    }
  }
  
  // Default to optimal tier
  return PERFORMANCE_TIERS[0]
}

/**
 * Layout time estimates in milliseconds per 100 nodes
 * Based on empirical testing of different layout algorithms
 */
const LAYOUT_TIME_ESTIMATES: Record<string, number> = {
  grid: 50,
  circle: 100,
  concentric: 150,
  breadthfirst: 200,
  fcose: 800,
  'cose-bilkent': 1000,
  cola: 600,  // Constraint-based force-directed layout (optimal <500, acceptable <1000, discouraged >1000)
  elk: 600,
  'concentric-attribute': 150,
}

/**
 * Cola layout options interface
 * Cola is a constraint-based force-directed layout algorithm
 */
export interface ColaLayoutOptions {
  name: 'cola'
  animate: boolean
  refresh: number
  maxSimulationTime: number
  ungrabifyWhileSimulating: boolean
  fit: boolean
  padding: number
  
  // Cola-specific options
  nodeSpacing: number           // Minimum space between nodes
  edgeLength: number            // Ideal edge length
  convergenceThreshold: number  // Stop when energy below this threshold
  
  // Performance tuning
  randomize: boolean            // Start with random positions
  avoidOverlap: boolean         // Prevent node overlap (slower for large graphs)
  handleDisconnected: boolean   // Separate disconnected components
  
  // Constraint support (optional)
  alignment?: Array<{           // Align nodes horizontally or vertically
    axis: 'x' | 'y'
    nodes: string[]
  }>
}

/**
 * Default configuration for cola layout algorithm
 * Cola provides high-quality constraint-based positioning
 * 
 * Performance characteristics:
 * - Optimal for: <500 nodes
 * - Acceptable for: 500-1000 nodes (with warnings)
 * - Discouraged for: >1000 nodes (suggest alternatives)
 */
export const DEFAULT_COLA_OPTIONS: ColaLayoutOptions = {
  name: 'cola',
  animate: false,
  refresh: 1,
  maxSimulationTime: 30000,
  ungrabifyWhileSimulating: false,
  fit: false,
  padding: 30,
  
  // Cola-specific options
  nodeSpacing: 10,              // Minimum space between nodes
  edgeLength: 100,              // Ideal edge length
  convergenceThreshold: 0.01,   // Stop when energy below this threshold
  
  // Performance tuning
  randomize: false,             // Start with current positions
  avoidOverlap: true,           // Prevent node overlap (slower for large graphs)
  handleDisconnected: true,     // Separate disconnected components
}

/**
 * Get optimized cola layout options based on network size
 * Adjusts parameters to balance quality and performance for different network sizes
 * 
 * Size-based optimization:
 * - <500 nodes: Full quality settings (optimal)
 * - 500-1000 nodes: Reduced quality for better performance (acceptable)
 * - >1000 nodes: Minimal quality for fastest completion (discouraged)
 * 
 * @param nodeCount - Number of nodes in the network
 * @returns Optimized cola layout options
 */
export function getColaOptionsForSize(nodeCount: number): ColaLayoutOptions {
  if (nodeCount < 500) {
    // Optimal range - use full quality settings
    return DEFAULT_COLA_OPTIONS
  } else if (nodeCount < 1000) {
    // Acceptable range - reduce quality for better performance
    return {
      ...DEFAULT_COLA_OPTIONS,
      avoidOverlap: false,        // Disable overlap detection
      maxSimulationTime: 20000,   // Reduce max time to 20 seconds
      convergenceThreshold: 0.05, // Less strict convergence
    }
  } else {
    // Not recommended - minimal quality for fastest completion
    return {
      ...DEFAULT_COLA_OPTIONS,
      avoidOverlap: false,
      maxSimulationTime: 10000,   // Reduce max time to 10 seconds
      convergenceThreshold: 0.1,  // Much less strict convergence
      animate: false,             // Disable animation
    }
  }
}

/**
 * Estimates layout computation time based on network size and algorithm
 * @param layoutName - The layout algorithm name
 * @param nodeCount - Number of nodes in the network
 * @param edgeCount - Number of edges in the network
 * @returns Estimated time in milliseconds
 */
export function estimateLayoutTime(
  layoutName: string,
  nodeCount: number,
  edgeCount: number
): number {
  const baseTime = LAYOUT_TIME_ESTIMATES[layoutName] || 500
  const nodeFactor = nodeCount / 100
  const edgeFactor = edgeCount / 500
  
  // Time scales with nodes linearly and edges with square root
  return Math.round(baseTime * nodeFactor * Math.sqrt(edgeFactor))
}

/**
 * Session storage key for warning dismissal
 */
const WARNING_DISMISSAL_KEY = 'cytoscape-performance-warning-dismissed'

/**
 * Duration for which a warning dismissal is valid (24 hours)
 */
const WARNING_DISMISSAL_DURATION = 24 * 60 * 60 * 1000

interface WarningDismissal {
  tier: PerformanceTierName
  timestamp: number
}

/**
 * Checks if a performance warning should be shown for the given tier
 * @param tier - The current performance tier name
 * @returns true if warning should be shown, false if dismissed
 */
export function shouldShowWarning(tier: PerformanceTierName): boolean {
  // Don't show warning for optimal tier
  if (tier === 'optimal') {
    return false
  }
  
  try {
    const stored = sessionStorage.getItem(WARNING_DISMISSAL_KEY)
    if (!stored) {
      return true
    }
    
    const dismissal: WarningDismissal = JSON.parse(stored)
    const elapsed = Date.now() - dismissal.timestamp
    
    // Show warning again if tier increased or dismissal expired
    return tier !== dismissal.tier || elapsed > WARNING_DISMISSAL_DURATION
  } catch (error) {
    console.warn('Failed to check warning dismissal:', error)
    return true
  }
}

/**
 * Dismisses the performance warning for the given tier
 * Stores dismissal in session storage with timestamp
 * @param tier - The performance tier name to dismiss warning for
 */
export function dismissWarning(tier: PerformanceTierName): void {
  try {
    const dismissal: WarningDismissal = {
      tier,
      timestamp: Date.now()
    }
    sessionStorage.setItem(WARNING_DISMISSAL_KEY, JSON.stringify(dismissal))
  } catch (error) {
    console.error('Failed to dismiss warning:', error)
  }
}

/**
 * Session storage key for layout preferences
 */
const LAYOUT_PREFERENCE_KEY = 'cytoscape-layout-preference'

/**
 * Network size bucket for grouping similar network sizes
 * Used to determine which stored preference applies
 */
type NetworkSizeBucket = 'small' | 'medium' | 'large' | 'very-large' | 'extreme' | 'massive'

interface LayoutPreference {
  layoutName: string
  bucket: NetworkSizeBucket
  timestamp: number
}

/**
 * Determines the network size bucket based on node and edge counts
 * This groups similar network sizes together for preference matching
 * @param nodeCount - Number of nodes in the network
 * @param edgeCount - Number of edges in the network
 * @returns The network size bucket
 */
function getNetworkSizeBucket(nodeCount: number, edgeCount: number): NetworkSizeBucket {
  // Use the same thresholds as performance tiers for consistency
  if (nodeCount >= 5000 || edgeCount >= 10000) {
    return 'massive'
  }
  if (nodeCount >= 2000 || edgeCount >= 4000) {
    return 'extreme'
  }
  if (nodeCount >= 500 || edgeCount >= 1000) {
    return 'very-large'
  }
  if (nodeCount >= 200 || edgeCount >= 400) {
    return 'large'
  }
  if (nodeCount >= 100 || edgeCount >= 200) {
    return 'medium'
  }
  return 'small'
}

/**
 * Stores the user's layout preference for networks of similar size
 * Preference is stored in session storage and cleared when session ends
 * @param layoutName - The layout algorithm name chosen by the user
 * @param nodeCount - Number of nodes in the network
 * @param edgeCount - Number of edges in the network
 */
export function storeLayoutPreference(
  layoutName: string,
  nodeCount: number,
  edgeCount: number
): void {
  try {
    const bucket = getNetworkSizeBucket(nodeCount, edgeCount)
    const preference: LayoutPreference = {
      layoutName,
      bucket,
      timestamp: Date.now()
    }
    sessionStorage.setItem(LAYOUT_PREFERENCE_KEY, JSON.stringify(preference))
  } catch (error) {
    console.error('Failed to store layout preference:', error)
  }
}

/**
 * Retrieves the stored layout preference for networks of similar size
 * Returns null if no preference exists or if the network size doesn't match
 * @param nodeCount - Number of nodes in the network
 * @param edgeCount - Number of edges in the network
 * @returns The preferred layout name, or null if no preference exists
 */
export function getLayoutPreference(
  nodeCount: number,
  edgeCount: number
): string | null {
  try {
    const stored = sessionStorage.getItem(LAYOUT_PREFERENCE_KEY)
    if (!stored) {
      return null
    }
    
    const preference: LayoutPreference = JSON.parse(stored)
    const currentBucket = getNetworkSizeBucket(nodeCount, edgeCount)
    
    // Only return preference if the network size bucket matches
    if (preference.bucket === currentBucket) {
      return preference.layoutName
    }
    
    return null
  } catch (error) {
    console.warn('Failed to retrieve layout preference:', error)
    return null
  }
}

/**
 * Clears the stored layout preference
 * This is automatically cleared when the session ends, but can be called manually
 */
export function clearLayoutPreference(): void {
  try {
    sessionStorage.removeItem(LAYOUT_PREFERENCE_KEY)
  } catch (error) {
    console.error('Failed to clear layout preference:', error)
  }
}
