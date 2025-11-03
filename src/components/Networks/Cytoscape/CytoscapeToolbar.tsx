import { HStack, Box, Button, Text, Tooltip } from "@chakra-ui/react"
import { FiPlay, FiRefreshCw } from "react-icons/fi"
import React from "react"

interface CytoscapeToolbarProps {
  showControls: boolean
  selectedLayout: string
  onChangeSelectedLayout: (value: string) => void
  onToggleStylePanel: () => void
  onToggleInfoPanel: () => void
  onRunLayout: () => void
  onResetView: () => void
}

const availableLayouts = [
  "grid",
  "circle",
  "concentric",
  "breadthfirst",
  "cose",
  "fcose",
  "cose-bilkent",
  "concentric-attribute",
]

export default function CytoscapeToolbar({
  showControls,
  selectedLayout,
  onChangeSelectedLayout,
  onToggleStylePanel,
  onToggleInfoPanel,
  onRunLayout,
  onResetView,
}: CytoscapeToolbarProps) {
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
    >
      <HStack gap={1}>
        <Text fontSize="xs">Layout</Text>
        <select
          value={selectedLayout}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChangeSelectedLayout(e.target.value)}
          style={{
            fontSize: "12px",
            padding: "2px 6px",
            borderRadius: 6,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "transparent",
          }}
        >
          {availableLayouts.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </HStack>
      <HStack gap={1}>
        <Button size="xs" variant="outline" onClick={onToggleStylePanel}>Style</Button>
        <Button size="xs" variant="outline" onClick={onToggleInfoPanel}>Info</Button>
      </HStack>
      <Tooltip.Root openDelay={200}>
        <Tooltip.Trigger>
          <Button size="xs" onClick={onRunLayout}>
            <HStack gap={1}>
              <FiPlay />
              <span>Run layout</span>
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
      <Button size="xs" onClick={onResetView} variant="outline">
        <HStack gap={1}>
          <FiRefreshCw />
          <span>Reset view</span>
        </HStack>
      </Button>
    </HStack>
  )
}


