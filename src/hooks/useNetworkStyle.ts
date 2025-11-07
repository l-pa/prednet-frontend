import { useState, useEffect, useCallback, useMemo } from 'react'
import type { 
  NameMode, 
  HighlightMode, 
  StyleState, 
  StyleActions,
  UseNetworkStyleReturn
} from '@/components/Networks/Cytoscape/types'

// Helper function to safely parse localStorage
function getStoredStyleValue<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem("network.style")
    if (!raw) return defaultValue
    const parsed = JSON.parse(raw)
    const value = parsed?.[key]
    return value !== undefined ? value : defaultValue
  } catch (error) {
    // Log error for debugging but don't throw
    console.warn(`Failed to read style value for key "${key}":`, error)
    return defaultValue
  }
}

// Helper function to safely store style values
function storeStyleValue(updates: Partial<StyleState>) {
  try {
    const raw = localStorage.getItem("network.style")
    const prev = raw ? JSON.parse(raw) : {}
    const payload = JSON.stringify({ ...prev, ...updates })
    localStorage.setItem("network.style", payload)
    // Notify same-tab listeners
    window.dispatchEvent(new Event('network-style-changed'))
  } catch (error) {
    // Log error for debugging but continue (e.g., private mode, quota exceeded)
    console.warn('Failed to persist style settings:', error)
  }
}

export function useNetworkStyle(initialStyle?: Partial<StyleState>): UseNetworkStyleReturn {
  // Initialize state from localStorage with fallbacks
  const [showLabels, setShowLabelsState] = useState<boolean>(() => 
    initialStyle?.showLabels ?? getStoredStyleValue('showLabels', false)
  )
  
  const [nameMode, setNameModeState] = useState<NameMode>(() => 
    initialStyle?.nameMode ?? getStoredStyleValue('nameMode', 'systematic')
  )
  
  const [nodeScale, setNodeScaleState] = useState<number>(() => {
    const stored = initialStyle?.nodeScale ?? getStoredStyleValue('nodeScale', 1)
    return Math.min(2, Math.max(0.1, stored))
  })
  
  const [edgeScale, setEdgeScaleState] = useState<number>(() => {
    const stored = initialStyle?.edgeScale ?? getStoredStyleValue('edgeScale', 1)
    return Math.min(2, Math.max(0.1, stored))
  })
  
  const [selectedBorderWidth, setSelectedBorderWidthState] = useState<number>(() => {
    const stored = initialStyle?.selectedBorderWidth ?? getStoredStyleValue('selectedBorderWidth', 0)
    return Math.min(20, Math.max(0, stored))
  })
  
  const [enableHoverInfo, setEnableHoverInfoState] = useState<boolean>(() => 
    initialStyle?.enableHoverInfo ?? getStoredStyleValue('enableHoverInfo', true)
  )
  
  const [filterComponentsByProteins, setFilterComponentsByProteinsState] = useState<boolean>(() => 
    initialStyle?.filterComponentsByProteins ?? getStoredStyleValue('filterComponentsByProteins', false)
  )
  
  const [highlightMode, setHighlightModeState] = useState<HighlightMode>(() => {
    const stored = initialStyle?.highlightMode ?? getStoredStyleValue('highlightMode', 'AND')
    return stored === 'OR' ? 'OR' : 'AND'
  })
  
  const [hoverLabelScale, setHoverLabelScaleState] = useState<number>(() => {
    const stored = initialStyle?.hoverLabelScale ?? getStoredStyleValue('hoverLabelScale', 1)
    return Math.min(3, Math.max(0.5, stored))
  })

  // Wrapped setters that also persist to localStorage
  const setShowLabels = useCallback((show: boolean) => {
    setShowLabelsState(show)
    storeStyleValue({ showLabels: show })
  }, [])

  const setNameMode = useCallback((mode: NameMode) => {
    setNameModeState(mode)
    storeStyleValue({ nameMode: mode })
  }, [])

  const setNodeScale = useCallback((scale: number) => {
    const clampedScale = Math.min(2, Math.max(0.1, scale))
    setNodeScaleState(clampedScale)
    storeStyleValue({ nodeScale: clampedScale })
  }, [])

  const setEdgeScale = useCallback((scale: number) => {
    const clampedScale = Math.min(2, Math.max(0.1, scale))
    setEdgeScaleState(clampedScale)
    storeStyleValue({ edgeScale: clampedScale })
  }, [])

  const setSelectedBorderWidth = useCallback((width: number) => {
    const clampedWidth = Math.min(20, Math.max(0, width))
    setSelectedBorderWidthState(clampedWidth)
    storeStyleValue({ selectedBorderWidth: clampedWidth })
  }, [])

  const setEnableHoverInfo = useCallback((enable: boolean) => {
    setEnableHoverInfoState(enable)
    storeStyleValue({ enableHoverInfo: enable })
  }, [])

  const setFilterComponentsByProteins = useCallback((filter: boolean) => {
    setFilterComponentsByProteinsState(filter)
    storeStyleValue({ filterComponentsByProteins: filter })
  }, [])

  const setHighlightMode = useCallback((mode: HighlightMode) => {
    setHighlightModeState(mode)
    storeStyleValue({ highlightMode: mode })
  }, [])

  const setHoverLabelScale = useCallback((scale: number) => {
    const clampedScale = Math.min(3, Math.max(0.5, scale))
    setHoverLabelScaleState(clampedScale)
    storeStyleValue({ hoverLabelScale: clampedScale })
  }, [])

  // Listen for style changes from other components/tabs
  useEffect(() => {
    const handleStyleChange = () => {
      try {
        const raw = localStorage.getItem("network.style")
        const parsed = raw ? JSON.parse(raw) : {}
        
        if (typeof parsed?.showLabels === 'boolean') {
          setShowLabelsState(parsed.showLabels)
        }
        if (parsed?.nameMode === 'gene' || parsed?.nameMode === 'systematic') {
          setNameModeState(parsed.nameMode)
        }
        if (typeof parsed?.nodeScale === 'number') {
          setNodeScaleState(Math.min(2, Math.max(0.1, parsed.nodeScale)))
        }
        if (typeof parsed?.edgeScale === 'number') {
          setEdgeScaleState(Math.min(2, Math.max(0.1, parsed.edgeScale)))
        }
        if (typeof parsed?.selectedBorderWidth === 'number') {
          setSelectedBorderWidthState(Math.min(20, Math.max(0, parsed.selectedBorderWidth)))
        }
        if (typeof parsed?.enableHoverInfo === 'boolean') {
          setEnableHoverInfoState(parsed.enableHoverInfo)
        }
        if (typeof parsed?.filterComponentsByProteins === 'boolean') {
          setFilterComponentsByProteinsState(parsed.filterComponentsByProteins)
        }
        if (parsed?.highlightMode === 'OR' || parsed?.highlightMode === 'AND') {
          setHighlightModeState(parsed.highlightMode)
        }
        if (typeof parsed?.hoverLabelScale === 'number') {
          setHoverLabelScaleState(Math.min(3, Math.max(0.5, parsed.hoverLabelScale)))
        }
      } catch (error) {
        // Log error for debugging but don't throw
        console.warn('Failed to sync style changes:', error)
      }
    }

    // Listen for changes from other components in the same tab
    window.addEventListener('network-style-changed', handleStyleChange)
    // Listen for changes from other tabs
    window.addEventListener('storage', handleStyleChange)

    return () => {
      window.removeEventListener('network-style-changed', handleStyleChange)
      window.removeEventListener('storage', handleStyleChange)
    }
  }, [])

  // Memoized style object
  const style = useMemo<StyleState>(() => ({
    showLabels,
    nameMode,
    nodeScale,
    edgeScale,
    selectedBorderWidth,
    enableHoverInfo,
    filterComponentsByProteins,
    highlightMode,
    hoverLabelScale,
  }), [
    showLabels,
    nameMode,
    nodeScale,
    edgeScale,
    selectedBorderWidth,
    enableHoverInfo,
    filterComponentsByProteins,
    highlightMode,
    hoverLabelScale,
  ])

  // Memoized actions object
  const actions = useMemo<StyleActions>(() => ({
    setShowLabels,
    setNameMode,
    setNodeScale,
    setEdgeScale,
    setSelectedBorderWidth,
    setEnableHoverInfo,
    setFilterComponentsByProteins,
    setHighlightMode,
    setHoverLabelScale,
  }), [
    setShowLabels,
    setNameMode,
    setNodeScale,
    setEdgeScale,
    setSelectedBorderWidth,
    setEnableHoverInfo,
    setFilterComponentsByProteins,
    setHighlightMode,
    setHoverLabelScale,
  ])

  return { style, actions }
}