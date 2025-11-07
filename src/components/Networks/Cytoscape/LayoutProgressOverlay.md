# LayoutProgressOverlay Component

## Overview
Enhanced overlay component for displaying progress during network loading and layout computation.

## Features
- **Immediate Feedback**: Shows spinner and message as soon as layout starts
- **Progressive Information**: Reveals more details as time passes
  - Elapsed time after 1 second
  - Estimated time remaining after 3 seconds
  - Cancel button after 2 seconds
  - "This may take a while..." warning after 5 seconds
- **Dual Mode**: Supports both initial loading and layout computation states
- **Non-blocking UI**: Blocks canvas interaction but allows other UI elements to remain interactive

## Props

```typescript
interface LayoutProgressOverlayProps {
  isRunning: boolean          // Layout computation in progress
  isLoading?: boolean         // Initial network loading (before Cytoscape init)
  layoutName: string          // Algorithm name (e.g., "cose", "fcose")
  nodeCount: number           // Number of nodes
  edgeCount: number           // Number of edges
  startTime: number           // Timestamp when layout started
  estimatedTime?: number      // Estimated completion time in ms
  onCancel: () => void        // Callback to cancel layout
}
```

## Usage Example

```tsx
import LayoutProgressOverlay from './LayoutProgressOverlay'
import { useLayoutCancellation } from '@/hooks/useLayoutCancellation'

function MyComponent() {
  const [isLayoutRunning, setIsLayoutRunning] = useState(false)
  const [layoutStartTime, setLayoutStartTime] = useState(Date.now())
  const { cancelLayout } = useLayoutCancellation(cyRef.current, () => {
    setIsLayoutRunning(false)
  })

  return (
    <>
      {/* Your network visualization */}
      
      <LayoutProgressOverlay
        isRunning={isLayoutRunning}
        layoutName="cose"
        nodeCount={500}
        edgeCount={1200}
        startTime={layoutStartTime}
        estimatedTime={8000}
        onCancel={cancelLayout}
      />
    </>
  )
}
```

## Integration Notes

To integrate this component into CytoscapeNetwork.tsx:

1. Import the component and useLayoutCancellation hook
2. Add state for tracking layout start time
3. Replace the existing simple overlay with LayoutProgressOverlay
4. Pass the cancelLayout function from useLayoutCancellation hook
5. Optionally add isLoading state for initial network loading

See task 7 in the implementation plan for detailed integration steps.

## Requirements Satisfied

- **1.1, 1.2**: Immediate visual feedback with spinner and message
- **1.3**: Estimated time display after 3 seconds
- **1.4**: Loading indicators removed when layout completes
- **3.2**: Non-blocking overlay (pointerEvents: 'none' on backdrop)
- **3.3**: Cancel button provided after 2 seconds
- **6.1**: Initial loading state with node/edge count display
