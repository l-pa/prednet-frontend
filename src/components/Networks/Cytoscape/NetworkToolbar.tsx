import { HStack, Button, Text, Tooltip } from "@chakra-ui/react"
import { FiPlay, FiRefreshCw } from "react-icons/fi"
import type { ReactNode } from "react"

interface NetworkToolbarProps {
  showControls: boolean
  selectedLayout: string
  isLayoutRunning: boolean
  onLayoutChange: (layout: string) => void
  onRunLayout: () => void
  onResetView: () => void
  onToggleStylePanel: () => void
  onToggleInfoPanel: () => void
  performanceIndicator?: ReactNode
}

const availableLayouts = [
  "grid",
  "circle",
  "concentric",
  "breadthfirst",
  "fcose",
  "cose-bilkent",
  "elk",
  "concentric-attribute",
]

export default function NetworkToolbar({
  showControls,
  selectedLayout,
  isLayoutRunning,
  onLayoutChange,
  onToggleStylePanel,
  onToggleInfoPanel,
  onRunLayout,
  onResetView,
  performanceIndicator,
}: NetworkToolbarProps) {
  if (!showControls) return null
  return (
    <HStack
      gap={2}
      position="absolute"
      top={2}
      right={2}
      zIndex={1}
      bg="whiteAlpha.800"
      _dark={{ bg: "blackAlpha.600" }}
      px={2}
      py={1}
      rounded="md"
      boxShadow="md"
      flexWrap="wrap"
      maxW={{ base: "calc(100vw - 16px)", md: "auto" }}
    >
      {performanceIndicator && (
        <HStack 
          gap={1} 
          borderRight="1px solid" 
          borderColor="gray.300" 
          _dark={{ borderColor: "gray.600" }} 
          pr={2}
          flexShrink={0}
        >
          {performanceIndicator}
        </HStack>
      )}
      <HStack gap={1} flexShrink={0}>
        <Text fontSize="xs" display={{ base: "none", sm: "block" }}>Layout</Text>
        <select
          value={selectedLayout}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onLayoutChange(e.target.value)}
          style={{
            fontSize: "12px",
            padding: "2px 6px",
            borderRadius: 6,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "transparent",
          }}
          aria-label="Select layout algorithm"
        >
          {availableLayouts.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </HStack>
      <HStack gap={1} flexShrink={0}>
        <Button size="xs" variant="outline" onClick={onToggleStylePanel}>Style</Button>
        <Button size="xs" variant="outline" onClick={onToggleInfoPanel}>Info</Button>
      </HStack>
      <Tooltip.Root openDelay={200}>
        <Tooltip.Trigger>
          <Button size="xs" onClick={onRunLayout} disabled={isLayoutRunning} flexShrink={0}>
            <HStack gap={1}>
              <FiPlay />
              <span>{isLayoutRunning ? "Running..." : "Run layout"}</span>
            </HStack>
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content>
            <Tooltip.Arrow />
            <Text fontSize="xs">Calculated in your browser. Large graphs may be slow and could freeze the tab.</Text>
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>
      <Button size="xs" onClick={onResetView} variant="outline" flexShrink={0}>
        <HStack gap={1}>
          <FiRefreshCw />
          <span>Reset view</span>
        </HStack>
      </Button>
    </HStack>
  )
}


