import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react"
import { FiX, FiAlertTriangle, FiZap } from "react-icons/fi"
import type { PerformanceWarningProps } from "./types"

/**
 * PerformanceWarning Component
 * 
 * Displays a dismissible alert for moderate/large/extreme performance tiers.
 * Shows tier-specific recommendations with actionable suggestions.
 * Includes one-click layout switch for large networks.
 * Persists dismissal to session storage.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 6.2
 */
export default function PerformanceWarning({
  tier,
  nodeCount,
  edgeCount,
  currentLayout,
  onDismiss,
  onApplyRecommendation,
}: PerformanceWarningProps) {
  // Show warning for large/extreme/massive tiers OR when cola is selected for networks >1000 nodes
  const showColaWarning = currentLayout === 'cola' && nodeCount > 1000
  
  if (!showColaWarning && (tier.name === 'optimal' || tier.name === 'moderate')) {
    return null
  }

  // Get tier-specific styling
  const getTierStyles = () => {
    switch (tier.name) {
      case 'moderate':
        return {
          bg: 'yellow.50',
          darkBg: 'yellow.900/20',
          borderColor: 'yellow.300',
          darkBorderColor: 'yellow.700',
          iconColor: 'yellow.600',
          darkIconColor: 'yellow.400',
        }
      case 'large':
        return {
          bg: 'orange.50',
          darkBg: 'orange.900/20',
          borderColor: 'orange.300',
          darkBorderColor: 'orange.700',
          iconColor: 'orange.600',
          darkIconColor: 'orange.400',
        }
      case 'extreme':
        return {
          bg: 'red.50',
          darkBg: 'red.900/20',
          borderColor: 'red.300',
          darkBorderColor: 'red.700',
          iconColor: 'red.600',
          darkIconColor: 'red.400',
        }
      case 'massive':
        return {
          bg: 'purple.50',
          darkBg: 'purple.900/20',
          borderColor: 'purple.300',
          darkBorderColor: 'purple.700',
          iconColor: 'purple.600',
          darkIconColor: 'purple.400',
        }
      default:
        return {
          bg: 'gray.50',
          darkBg: 'gray.900/20',
          borderColor: 'gray.300',
          darkBorderColor: 'gray.700',
          iconColor: 'gray.600',
          darkIconColor: 'gray.400',
        }
    }
  }

  const styles = getTierStyles()

  // Get tier-specific recommendations
  const getRecommendations = (): string[] => {
    // Special case: cola layout warning for large networks
    if (showColaWarning) {
      return [
        "Cola layout is not recommended for networks with more than 1,000 nodes",
        "Cola has O(n²) complexity and may take a very long time or freeze the browser",
        "Switch to fcose or cose-bilkent for better performance with large networks",
        "For fastest results, use grid layout instead",
      ]
    }
    
    switch (tier.name) {
      case 'moderate':
        return [
          "Network may be slow with complex layouts",
          "Consider using grid or circle layout for faster rendering",
          "Edge hover effects may impact performance",
        ]
      case 'large':
        return [
          "Network will be slow with force-directed layouts",
          "Switch to grid layout for significantly faster rendering",
          "Try filtering by edge weight threshold or viewing individual components",
          "Layout computation may take several seconds",
        ]
      case 'extreme':
        return [
          "Very large network detected (2,000+ nodes) - filtering is strongly recommended",
          "Progressive rendering will be used to improve load times",
          "Labels and edge arrows will be hidden by default for performance",
          "Only grid layout is recommended - force-directed layouts will be extremely slow",
          "Filter by edge weight, view components separately, or focus on specific proteins",
        ]
      case 'massive':
        return [
          "Extremely large network detected (5,000+ nodes) - data filtering is essential",
          "Only grid layout will be available for networks this size",
          "All visual features will be simplified to maintain browser responsiveness",
          "Progressive rendering and viewport culling will be enabled automatically",
          "Strongly consider filtering to reduce network size below 2,000 nodes for better experience",
        ]
      default:
        return []
    }
  }

  const recommendations = getRecommendations()

  // Get warning title based on tier or cola warning
  const getTitle = (): string => {
    if (showColaWarning) {
      return "Cola Layout Not Recommended"
    }
    
    switch (tier.name) {
      case 'moderate':
        return "Moderate Network Size"
      case 'large':
        return "Large Network Detected"
      case 'extreme':
        return "Very Large Network (2,000+ nodes)"
      case 'massive':
        return "Extremely Large Network (5,000+ nodes)"
      default:
        return "Performance Notice"
    }
  }

  // Handle one-click layout switch
  const handleSwitchToGrid = () => {
    if (onApplyRecommendation) {
      onApplyRecommendation({
        type: 'switch-layout',
        payload: { layoutName: 'grid' }
      })
    }
  }
  
  // Handle switch to fcose (recommended alternative to cola for large networks)
  const handleSwitchToFcose = () => {
    if (onApplyRecommendation) {
      onApplyRecommendation({
        type: 'switch-layout',
        payload: { layoutName: 'fcose' }
      })
    }
  }

  return (
    <Box
      position="relative"
      bg={styles.bg}
      borderWidth="1px"
      borderColor={styles.borderColor}
      rounded="md"
      p={4}
      mb={4}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      aria-labelledby="performance-warning-title"
      _dark={{
        bg: styles.darkBg,
        borderColor: styles.darkBorderColor,
      }}
    >
      <HStack align="flex-start" gap={3}>
        {/* Warning Icon */}
        <Box
          as={FiAlertTriangle}
          flexShrink={0}
          mt={0.5}
          fontSize="xl"
          color={styles.iconColor}
          _dark={{ color: styles.darkIconColor }}
          aria-hidden="true"
        />

        {/* Content */}
        <Stack flex={1} gap={2}>
          {/* Title */}
          <HStack justify="space-between" align="flex-start">
            <Text
              id="performance-warning-title"
              fontSize="sm"
              fontWeight="bold"
              color="gray.900"
              _dark={{ color: "gray.100" }}
            >
              {getTitle()}
            </Text>

            {/* Dismiss Button */}
            <Button
              size="xs"
              variant="ghost"
              onClick={onDismiss}
              aria-label={`Dismiss ${getTitle()} warning`}
              colorPalette="gray"
              _focus={{
                outline: "2px solid",
                outlineColor: "blue.500",
                outlineOffset: "2px"
              }}
            >
              <FiX aria-hidden="true" />
            </Button>
          </HStack>

          {/* Network Size Info */}
          <Text 
            fontSize="xs" 
            color="gray.700" 
            _dark={{ color: "gray.300" }}
            aria-label={`Network contains ${nodeCount.toLocaleString()} nodes and ${edgeCount.toLocaleString()} edges`}
          >
            {nodeCount.toLocaleString()} nodes, {edgeCount.toLocaleString()} edges
          </Text>

          {/* Recommendations */}
          <Box>
            <Text
              id="recommendations-heading"
              fontSize="xs"
              fontWeight="semibold"
              color="gray.800"
              _dark={{ color: "gray.200" }}
              mb={1}
            >
              Recommendations:
            </Text>
            <Box 
              as="ul" 
              pl={4} 
              fontSize="xs" 
              color="gray.700" 
              _dark={{ color: "gray.300" }}
              aria-labelledby="recommendations-heading"
            >
              {recommendations.map((rec, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  {rec}
                </li>
              ))}
            </Box>
          </Box>

          {/* Action Buttons for Large Networks */}
          {(tier.name === 'large' || tier.name === 'extreme' || tier.name === 'massive') && onApplyRecommendation && !showColaWarning && (
            <HStack gap={2} mt={2}>
              <Button
                size="xs"
                colorPalette="blue"
                onClick={handleSwitchToGrid}
                aria-label="Switch to grid layout for better performance"
                _focus={{
                  outline: "2px solid",
                  outlineColor: "blue.500",
                  outlineOffset: "2px"
                }}
              >
                <HStack gap={1}>
                  <FiZap aria-hidden="true" />
                  <span>Switch to Grid Layout</span>
                </HStack>
              </Button>
            </HStack>
          )}
          
          {/* Action Buttons for Cola Warning */}
          {showColaWarning && onApplyRecommendation && (
            <HStack gap={2} mt={2} flexWrap="wrap">
              <Button
                size="xs"
                colorPalette="blue"
                onClick={handleSwitchToFcose}
                aria-label="Switch to fcose layout for better performance"
                _focus={{
                  outline: "2px solid",
                  outlineColor: "blue.500",
                  outlineOffset: "2px"
                }}
              >
                <HStack gap={1}>
                  <FiZap aria-hidden="true" />
                  <span>Switch to Fcose</span>
                </HStack>
              </Button>
              <Button
                size="xs"
                variant="outline"
                colorPalette="blue"
                onClick={handleSwitchToGrid}
                aria-label="Switch to grid layout for fastest performance"
                _focus={{
                  outline: "2px solid",
                  outlineColor: "blue.500",
                  outlineOffset: "2px"
                }}
              >
                <HStack gap={1}>
                  <FiZap aria-hidden="true" />
                  <span>Switch to Grid</span>
                </HStack>
              </Button>
            </HStack>
          )}
        </Stack>
      </HStack>
    </Box>
  )
}
