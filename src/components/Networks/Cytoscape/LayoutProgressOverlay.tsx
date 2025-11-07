import { useEffect, useState } from 'react'
import { Box, Button, Spinner, Stack, Text } from '@chakra-ui/react'
import type { LayoutProgressOverlayProps } from './types'

/**
 * Enhanced overlay component that displays progress during network loading and layout computation
 * 
 * Features:
 * - Shows immediate feedback when network data is received
 * - Displays node and edge count during initial loading
 * - Shows elapsed time after 1 second of computation
 * - Displays estimated time after 3 seconds
 * - Provides cancel button after 2 seconds
 * - Blocks interaction with canvas but not other UI elements
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.2, 3.3, 6.1
 */
export default function LayoutProgressOverlay({
  isRunning,
  isLoading = false,
  layoutName,
  nodeCount,
  edgeCount,
  startTime,
  estimatedTime,
  onCancel,
}: LayoutProgressOverlayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showElapsed, setShowElapsed] = useState(false)
  const [showEstimate, setShowEstimate] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  // Update elapsed time every second while layout is running
  useEffect(() => {
    if (!isRunning || isLoading) {
      setElapsedSeconds(0)
      setShowElapsed(false)
      setShowEstimate(false)
      setShowCancel(false)
      return
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedSeconds(elapsed)

      // Show elapsed time after 1 second
      if (elapsed >= 1) {
        setShowElapsed(true)
      }

      // Show estimated time after 3 seconds
      if (elapsed >= 3) {
        setShowEstimate(true)
      }

      // Show cancel button after 2 seconds
      if (elapsed >= 2) {
        setShowCancel(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, isLoading, startTime])

  // Don't render if neither loading nor running
  if (!isLoading && !isRunning) {
    return null
  }

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format estimated time remaining
  const getEstimateText = (): string => {
    if (!estimatedTime) return ''
    
    const remainingMs = Math.max(0, estimatedTime - (elapsedSeconds * 1000))
    const remainingSecs = Math.ceil(remainingMs / 1000)
    
    if (remainingSecs < 5) {
      return 'Almost done...'
    } else if (remainingSecs < 60) {
      return `~${remainingSecs}s remaining`
    } else {
      const mins = Math.ceil(remainingSecs / 60)
      return `~${mins}m remaining`
    }
  }

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="whiteAlpha.600"
      _dark={{ bg: "blackAlpha.400" }}
      zIndex={2}
      // Allow pointer events to pass through to UI outside the canvas
      pointerEvents="none"
      role="dialog"
      aria-modal="false"
      aria-labelledby="layout-progress-title"
      aria-describedby="layout-progress-description"
    >
      <Stack
        align="center"
        gap={3}
        bg="white"
        _dark={{ bg: "gray.800" }}
        p={6}
        borderRadius="md"
        boxShadow="lg"
        // Re-enable pointer events for the content box
        pointerEvents="auto"
        minW="280px"
      >
        <Spinner 
          size="lg" 
          color="blue.500"
          aria-label={isLoading ? "Loading network" : "Computing layout"}
        />
        
        {isLoading ? (
          // Initial loading state (before Cytoscape initializes)
          <>
            <Text 
              id="layout-progress-title"
              fontSize="md" 
              fontWeight="medium"
              role="status"
              aria-live="polite"
            >
              Loading network...
            </Text>
            <Text 
              id="layout-progress-description"
              fontSize="sm" 
              color="gray.600" 
              _dark={{ color: "gray.400" }}
              aria-label={`Loading ${nodeCount} nodes and ${edgeCount} edges`}
            >
              {nodeCount} nodes, {edgeCount} edges
            </Text>
          </>
        ) : (
          // Layout computation state
          <>
            <Text 
              id="layout-progress-title"
              fontSize="md" 
              fontWeight="medium"
              role="status"
              aria-live="polite"
            >
              Computing network layout...
            </Text>
            
            <Text 
              id="layout-progress-description"
              fontSize="sm" 
              color="gray.600" 
              _dark={{ color: "gray.400" }}
            >
              {layoutName} algorithm
            </Text>

            {showElapsed && (
              <Text 
                fontSize="sm" 
                color="gray.500" 
                _dark={{ color: "gray.500" }}
                aria-live="polite"
                aria-atomic="true"
              >
                Elapsed: {formatTime(elapsedSeconds)}
              </Text>
            )}

            {showEstimate && estimatedTime && elapsedSeconds >= 3 && (
              <Text 
                fontSize="sm" 
                color="blue.600" 
                _dark={{ color: "blue.400" }}
                aria-live="polite"
                aria-atomic="true"
              >
                {getEstimateText()}
              </Text>
            )}

            {elapsedSeconds >= 5 && (
              <Text 
                fontSize="xs" 
                color="orange.600" 
                _dark={{ color: "orange.400" }}
                textAlign="center"
                maxW="240px"
                role="status"
                aria-live="polite"
              >
                This may take a while for large networks...
              </Text>
            )}

            {showCancel && (
              <Button
                size="sm"
                colorScheme="red"
                variant="outline"
                onClick={onCancel}
                mt={2}
                aria-label="Cancel layout computation and apply grid layout"
                _focus={{
                  outline: "2px solid",
                  outlineColor: "red.500",
                  outlineOffset: "2px"
                }}
              >
                Cancel Layout
              </Button>
            )}
          </>
        )}
      </Stack>
    </Box>
  )
}
