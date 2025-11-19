/**
 * Tests for performance tier system
 * Verifies tier detection, optimization flags, and recommendations for very large networks
 */

import { describe, it, expect } from 'vitest'
import {
  getPerformanceTier,
  estimateLayoutTime,
  PERFORMANCE_TIERS,
  type PerformanceTierName,
} from './performanceUtils'

describe('Performance Tier System', () => {
  describe('getPerformanceTier', () => {
    it('should return optimal tier for small networks', () => {
      const tier = getPerformanceTier(50, 100)
      expect(tier.name).toBe('optimal')
      expect(tier.color).toBe('green')
    })

    it('should return moderate tier for medium networks', () => {
      const tier = getPerformanceTier(250, 500)
      expect(tier.name).toBe('moderate')
      expect(tier.color).toBe('yellow')
    })

    it('should return large tier for large networks', () => {
      const tier = getPerformanceTier(600, 1200)
      expect(tier.name).toBe('large')
      expect(tier.color).toBe('orange')
    })

    it('should return extreme tier for very large networks (2000+ nodes)', () => {
      const tier = getPerformanceTier(2500, 5000)
      expect(tier.name).toBe('extreme')
      expect(tier.color).toBe('red')
    })

    it('should return massive tier for extremely large networks (5000+ nodes)', () => {
      const tier = getPerformanceTier(6000, 12000)
      expect(tier.name).toBe('massive')
      expect(tier.color).toBe('purple')
    })

    it('should detect extreme tier at exactly 2000 nodes', () => {
      const tier = getPerformanceTier(2000, 1000)
      expect(tier.name).toBe('extreme')
    })

    it('should detect massive tier at exactly 5000 nodes', () => {
      const tier = getPerformanceTier(5000, 1000)
      expect(tier.name).toBe('massive')
    })

    it('should stay in large tier just below extreme threshold', () => {
      const tier = getPerformanceTier(1999, 3999)
      expect(tier.name).toBe('large')
    })

    it('should stay in extreme tier just below massive threshold', () => {
      const tier = getPerformanceTier(4999, 9999)
      expect(tier.name).toBe('extreme')
    })
  })

  describe('Optimization Flags', () => {
    it('should have no optimizations for optimal tier', () => {
      const tier = getPerformanceTier(50, 100)
      expect(Object.keys(tier.optimizations).length).toBe(0)
    })

    it('should suggest disabling edge hover for moderate tier', () => {
      const tier = getPerformanceTier(250, 500)
      expect(tier.optimizations.suggestDisableEdgeHover).toBe(true)
    })

    it('should have multiple optimizations for large tier', () => {
      const tier = getPerformanceTier(600, 1200)
      expect(tier.optimizations.suggestDisableEdgeHover).toBe(true)
      expect(tier.optimizations.suggestHideLabelsOnViewport).toBe(true)
      expect(tier.optimizations.suggestFasterLayout).toBe(true)
    })

    it('should have aggressive optimizations for extreme tier', () => {
      const tier = getPerformanceTier(2500, 5000)
      expect(tier.optimizations.hideAllLabels).toBe(true)
      expect(tier.optimizations.disableEdgeArrows).toBe(true)
      expect(tier.optimizations.useProgressiveRendering).toBe(true)
      expect(tier.optimizations.forceSimpleLayout).toBe(true)
      expect(tier.optimizations.showFilterWarning).toBe(true)
    })

    it('should have maximum optimizations for massive tier', () => {
      const tier = getPerformanceTier(6000, 12000)
      expect(tier.optimizations.hideAllLabels).toBe(true)
      expect(tier.optimizations.disableEdgeArrows).toBe(true)
      expect(tier.optimizations.disableEdgeSelection).toBe(true)
      expect(tier.optimizations.useProgressiveRendering).toBe(true)
      expect(tier.optimizations.forceGridLayout).toBe(true)
      expect(tier.optimizations.disableAnimations).toBe(true)
      expect(tier.optimizations.reduceNodeDetail).toBe(true)
      expect(tier.optimizations.showFilterWarning).toBe(true)
      expect(tier.optimizations.recommendDataFiltering).toBe(true)
    })
  })

  describe('Tier Thresholds', () => {
    it('should have correct thresholds for all tiers', () => {
      const optimal = PERFORMANCE_TIERS.find(t => t.name === 'optimal')
      const moderate = PERFORMANCE_TIERS.find(t => t.name === 'moderate')
      const large = PERFORMANCE_TIERS.find(t => t.name === 'large')
      const extreme = PERFORMANCE_TIERS.find(t => t.name === 'extreme')
      const massive = PERFORMANCE_TIERS.find(t => t.name === 'massive')

      expect(optimal?.nodeThreshold).toBe(0)
      expect(moderate?.nodeThreshold).toBe(200)
      expect(large?.nodeThreshold).toBe(500)
      expect(extreme?.nodeThreshold).toBe(2000)
      expect(massive?.nodeThreshold).toBe(5000)

      expect(optimal?.edgeThreshold).toBe(0)
      expect(moderate?.edgeThreshold).toBe(400)
      expect(large?.edgeThreshold).toBe(1000)
      expect(extreme?.edgeThreshold).toBe(4000)
      expect(massive?.edgeThreshold).toBe(10000)
    })

    it('should have correct colors for all tiers', () => {
      const optimal = PERFORMANCE_TIERS.find(t => t.name === 'optimal')
      const moderate = PERFORMANCE_TIERS.find(t => t.name === 'moderate')
      const large = PERFORMANCE_TIERS.find(t => t.name === 'large')
      const extreme = PERFORMANCE_TIERS.find(t => t.name === 'extreme')
      const massive = PERFORMANCE_TIERS.find(t => t.name === 'massive')

      expect(optimal?.color).toBe('green')
      expect(moderate?.color).toBe('yellow')
      expect(large?.color).toBe('orange')
      expect(extreme?.color).toBe('red')
      expect(massive?.color).toBe('purple')
    })
  })

  describe('estimateLayoutTime', () => {
    it('should estimate faster time for grid layout', () => {
      const gridTime = estimateLayoutTime('grid', 1000, 2000)
      const fcoseTime = estimateLayoutTime('fcose', 1000, 2000)
      expect(gridTime).toBeLessThan(fcoseTime)
    })

    it('should scale with network size', () => {
      const smallTime = estimateLayoutTime('fcose', 100, 200)
      const largeTime = estimateLayoutTime('fcose', 1000, 2000)
      expect(largeTime).toBeGreaterThan(smallTime)
    })

    it('should provide estimates for all layout types', () => {
      const layouts = ['grid', 'circle', 'fcose', 'cose-bilkent', 'cola']
      layouts.forEach(layout => {
        const time = estimateLayoutTime(layout, 500, 1000)
        expect(time).toBeGreaterThan(0)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero nodes', () => {
      const tier = getPerformanceTier(0, 0)
      expect(tier.name).toBe('optimal')
    })

    it('should handle very large edge counts', () => {
      const tier = getPerformanceTier(100, 15000)
      expect(tier.name).toBe('massive')
    })

    it('should handle very large node counts', () => {
      const tier = getPerformanceTier(10000, 100)
      expect(tier.name).toBe('massive')
    })

    it('should prioritize higher tier when both thresholds are exceeded', () => {
      const tier = getPerformanceTier(6000, 15000)
      expect(tier.name).toBe('massive')
    })
  })
})
