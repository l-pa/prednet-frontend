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
  onDismiss,
  onApplyRecommendation,
}: PerformanceWarningProps) {
  // Only show warning for large and extreme tiers
  if (tier.name === 'optimal' || tier.name === 'moderate') {
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
          "Network will be very slow - filtering is strongly recommended",
          "Filter by edge weight, view components separately, or focus on specific proteins",
          "Use grid layout for best performance (force-directed layouts may freeze)",
          "Layout computation may take 30+ seconds or freeze the browser",
        ]
      default:
        return []
    }
  }

  const recommendations = getRecommendations()

  // Get warning title based on tier
  const getTitle = (): string => {
    switch (tier.name) {
      case 'moderate':
        return "Moderate Network Size"
      case 'large':
        return "Large Network Detected"
      case 'extreme':
        return "Very Large Network"
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
          {(tier.name === 'large' || tier.name === 'extreme') && onApplyRecommendation && (
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
        </Stack>
      </HStack>
    </Box>
  )
}
