# LayoutProgressOverlay Integration Example

This document shows how to integrate the LayoutProgressOverlay component into CytoscapeNetwork.tsx (Task 7).

## Step 1: Import the Component

```tsx
import LayoutProgressOverlay from '@/components/Networks/Cytoscape/LayoutProgressOverlay'
import { useLayoutCancellation } from '@/hooks/useLayoutCancellation'
import { estimateLayoutTime } from '@/utils/performanceUtils'
```

## Step 2: Add State for Layout Tracking

```tsx
const [layoutStartTime, setLayoutStartTime] = useState(Date.now())
```

## Step 3: Initialize useLayoutCancellation Hook

```tsx
const { cancelLayout } = useLayoutCancellation(
  cyRef.current,
  () => {
    networkActions.setIsLayoutRunning(false)
  }
)
```

## Step 4: Update Layout Start Handler

When starting a layout, capture the start time:

```tsx
const handleRunLayout = useCallback(() => {
  const cy = cyRef.current
  if (!cy) return
  
  // Capture start time
  setLayoutStartTime(Date.now())
  networkActions.setIsLayoutRunning(true)
  
  // ... rest of layout logic
}, [networkState.selectedLayout, networkActions])
```

## Step 5: Replace Existing Overlay

Replace the existing simple overlay:

```tsx
{/* OLD CODE - Remove this:
{networkState.isLayoutRunning && !networkState.runningBackend && (
  <Box position="absolute" ...>
    <Stack align="center" gap={2}>
      <Spinner size="sm" />
      <Text fontSize="sm">Arranging layout…</Text>
    </Stack>
  </Box>
)}
*/}

{/* NEW CODE - Add this: */}
{networkState.isLayoutRunning && !networkState.runningBackend && (
  <LayoutProgressOverlay
    isRunning={networkState.isLayoutRunning}
    layoutName={networkState.selectedLayout}
    nodeCount={(data.nodes || []).length}
    edgeCount={(data.edges || []).length}
    startTime={layoutStartTime}
    estimatedTime={estimateLayoutTime(
      networkState.selectedLayout,
      (data.nodes || []).length,
      (data.edges || []).length
    )}
    onCancel={cancelLayout}
  />
)}
```

## Step 6: Optional - Add Initial Loading State

If you want to show a loading state before Cytoscape initializes:

```tsx
const [isInitialLoading, setIsInitialLoading] = useState(true)

// In useEffect when Cytoscape initializes:
useEffect(() => {
  // ... Cytoscape initialization
  setIsInitialLoading(false)
}, [data])

// Then use the isLoading prop:
<LayoutProgressOverlay
  isRunning={networkState.isLayoutRunning}
  isLoading={isInitialLoading}
  // ... other props
/>
```

## Complete Example

```tsx
function CytoscapeNetwork({ data, ... }: CytoscapeNetworkProps) {
  const [layoutStartTime, setLayoutStartTime] = useState(Date.now())
  
  const { cancelLayout } = useLayoutCancellation(
    cyRef.current,
    () => networkActions.setIsLayoutRunning(false)
  )
  
  const handleRunLayout = useCallback(() => {
    const cy = cyRef.current
    if (!cy) return
    
    setLayoutStartTime(Date.now())
    networkActions.setIsLayoutRunning(true)
    
    const onStop = () => {
      cy.off('layoutstop', onStop)
      networkActions.setIsLayoutRunning(false)
      cy.fit(undefined, 20)
    }
    cy.one('layoutstop', onStop)
    
    // Run layout...
  }, [networkState.selectedLayout, networkActions])
  
  return (
    <Box position="relative" width="100%" height={height}>
      {/* ... other components ... */}
      
      {networkState.isLayoutRunning && !networkState.runningBackend && (
        <LayoutProgressOverlay
          isRunning={networkState.isLayoutRunning}
          layoutName={networkState.selectedLayout}
          nodeCount={(data.nodes || []).length}
          edgeCount={(data.edges || []).length}
          startTime={layoutStartTime}
          estimatedTime={estimateLayoutTime(
            networkState.selectedLayout,
            (data.nodes || []).length,
            (data.edges || []).length
          )}
          onCancel={cancelLayout}
        />
      )}
    </Box>
  )
}
```

## Testing

After integration, test the following scenarios:

1. **Small network (< 200 nodes)**: Should show basic progress without warnings
2. **Medium network (200-500 nodes)**: Should show elapsed time after 1s
3. **Large network (> 500 nodes)**: Should show cancel button after 2s and estimate after 3s
4. **Very slow layout**: Should show "This may take a while..." after 5s
5. **Cancel action**: Click cancel button and verify fallback grid layout is applied
6. **Dark mode**: Verify styling looks good in both light and dark themes

## Notes

- The component automatically hides when `isRunning` is false
- The cancel button only appears after 2 seconds to avoid accidental clicks
- The overlay blocks canvas interaction but allows other UI elements to remain interactive
- Estimated time is optional - component works without it
