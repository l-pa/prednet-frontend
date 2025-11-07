/**
 * Example usage of PerformanceIndicator component
 * 
 * This file demonstrates how to integrate the PerformanceIndicator
 * into the CytoscapeNetwork component. This integration will be
 * completed in task 7.
 * 
 * DO NOT IMPORT THIS FILE - IT IS FOR DOCUMENTATION ONLY
 */

import PerformanceIndicator from './PerformanceIndicator'
import { usePerformanceTier } from '../../../hooks/usePerformanceTier'

// Example 1: Basic usage with performance tier hook
function ExampleWithHook() {
  const nodeCount = 300
  const edgeCount = 600
  const layoutName = 'fcose'
  
  const { tier, getLayoutEstimate } = usePerformanceTier(nodeCount, edgeCount)
  const estimatedTime = getLayoutEstimate(layoutName)
  
  return (
    <PerformanceIndicator
      nodeCount={nodeCount}
      edgeCount={edgeCount}
      currentTier={tier}
      estimatedLayoutTime={estimatedTime}
    />
  )
}

// Example 2: Integration in NetworkToolbar (future task 7)
function ExampleInToolbar() {
  // This shows where the PerformanceIndicator will be placed
  // in the NetworkToolbar component
  
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {/* Existing toolbar items */}
      <select>
        <option>grid</option>
        <option>fcose</option>
      </select>
      
      {/* NEW: Performance indicator */}
      <PerformanceIndicator
        nodeCount={300}
        edgeCount={600}
        currentTier={{
          name: 'moderate',
          nodeThreshold: 200,
          edgeThreshold: 400,
          color: 'yellow',
          optimizations: { disableEdgeHover: true }
        }}
        estimatedLayoutTime={2500}
      />
      
      {/* Other toolbar buttons */}
      <button>Run Layout</button>
      <button>Reset View</button>
    </div>
  )
}

export { ExampleWithHook, ExampleInToolbar }
