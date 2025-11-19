import { Box, Text, Tooltip } from "@chakra-ui/react"
import type { PerformanceIndicatorProps } from "./types"

/**
 * PerformanceIndicator Component
 * 
 * Displays a circular badge showing the current performance tier with color coding.
 * Provides detailed information in a tooltip including node/edge counts,
 * performance recommendations, and estimated layout time.
 * 
 * Requirements: 5.1, 5.2, 5.3
 */
export default function PerformanceIndicator({
  nodeCount,
  edgeCount,
  currentTier,
  estimatedLayoutTime,
}: PerformanceIndicatorProps) {
  // Map tier colors to Chakra UI color tokens
  const colorMap: Record<string, string> = {
    green: "green.500",
    yellow: "yellow.500",
    orange: "orange.500",
    red: "red.500",
    purple: "purple.500",
  }

  const badgeColor = colorMap[currentTier.color] || "gray.500"

  // Generate performance recommendations based on tier
  const getRecommendations = (): string[] => {
    switch (currentTier.name) {
      case 'optimal':
        return [
          "Network size is optimal for smooth rendering",
          "All features are enabled",
          "Layout computation should be fast"
        ]
      case 'moderate':
        return [
          "Network may be slow with complex layouts",
          "Consider using grid or circle layout for faster rendering",
          "Edge hover effects may impact performance"
        ]
      case 'large':
        return [
          "Network will be slow with force-directed layouts",
          "Switch to grid layout for better performance",
          "Try filtering by edge weight or viewing components separately",
          "Layout computation may take several seconds"
        ]
      case 'extreme':
        return [
          "Very large network - filtering strongly recommended",
          "Progressive rendering will be used to improve load times",
          "Labels and edge arrows will be hidden by default",
          "Use grid layout only - force-directed layouts will be very slow",
          "Consider filtering by edge weight, components, or specific proteins"
        ]
      case 'massive':
        return [
          "Extremely large network - data filtering is essential",
          "Only grid layout is recommended for networks this size",
          "All visual features will be simplified for performance",
          "Progressive rendering and viewport culling will be enabled",
          "Strongly consider filtering to reduce network size below 2000 nodes"
        ]
      default:
        return []
    }
  }

  const recommendations = getRecommendations()

  // Format estimated time for display
  const formatEstimatedTime = (ms: number): string => {
    if (ms < 1000) {
      return `~${Math.round(ms)}ms`
    }
    if (ms < 60000) {
      return `~${Math.round(ms / 1000)}s`
    }
    return `~${Math.round(ms / 60000)}m`
  }

  // Get tier label for display
  const getTierLabel = (): string => {
    return currentTier.name.charAt(0).toUpperCase() + currentTier.name.slice(1)
  }

  return (
    <Tooltip.Root 
      openDelay={200} 
      closeDelay={500}
      positioning={{ placement: "bottom" }}
      lazyMount
      unmountOnExit={false}
    >
      <Tooltip.Trigger asChild>
        <Box
          as="button"
          aria-label={`Performance tier: ${getTierLabel()}. ${nodeCount} nodes, ${edgeCount} edges. Press Enter or Space to view details.`}
          role="status"
          aria-live="polite"
          tabIndex={0}
          cursor="pointer"
          p={1}
          _hover={{ opacity: 0.8 }}
          _focus={{
            outline: "2px solid",
            outlineColor: "blue.500",
            outlineOffset: "2px",
            borderRadius: "md"
          }}
          transition="opacity 0.2s"
        >
          {/* Circular badge with tier color - no text label */}
          <Box
            width="14px"
            height="14px"
            borderRadius="full"
            bg={badgeColor}
            border="2px solid"
            borderColor="white"
            _dark={{ borderColor: "gray.800" }}
            boxShadow="sm"
            aria-hidden="true"
          />
        </Box>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content 
          maxW="300px"
          role="tooltip"
          aria-label="Performance information and recommendations"
        >
          <Tooltip.Arrow />
          <Box p={2}>
            {/* Performance Tier */}
            <Text fontSize="sm" fontWeight="bold" mb={2}>
              Performance: {getTierLabel()}
            </Text>

            {/* Network size information */}
            <Text fontSize="sm" fontWeight="bold" mb={2} id="network-size-heading">
              Network Size
            </Text>
            <Text fontSize="xs" mb={1} aria-labelledby="network-size-heading">
              Nodes: {nodeCount.toLocaleString()}
            </Text>
            <Text fontSize="xs" mb={3} aria-labelledby="network-size-heading">
              Edges: {edgeCount.toLocaleString()}
            </Text>

            {/* Estimated layout time */}
            {estimatedLayoutTime !== undefined && estimatedLayoutTime > 0 && (
              <>
                <Text fontSize="sm" fontWeight="bold" mb={2} id="layout-time-heading">
                  Estimated Layout Time
                </Text>
                <Text fontSize="xs" mb={3} aria-labelledby="layout-time-heading">
                  {formatEstimatedTime(estimatedLayoutTime)}
                </Text>
              </>
            )}

            {/* Performance recommendations */}
            <Text fontSize="sm" fontWeight="bold" mb={2} id="performance-tips-heading">
              Performance Tips
            </Text>
            <Box 
              as="ul" 
              pl={4} 
              fontSize="xs" 
              spaceY={1}
              aria-labelledby="performance-tips-heading"
            >
              {recommendations.map((rec, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  {rec}
                </li>
              ))}
            </Box>
          </Box>
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}
