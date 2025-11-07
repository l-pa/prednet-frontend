import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react"
import { Checkbox } from "@/components/ui/checkbox"
import type { NameMode } from './types'

interface StylePanelProps {
  isOpen: boolean
  onClose: () => void
  showLabels: boolean
  onShowLabelsChange: (show: boolean) => void
  nameMode: NameMode
  onNameModeChange: (mode: NameMode) => void
  nodeScale: number
  onNodeScaleChange: (scale: number) => void
  edgeScale: number
  onEdgeScaleChange: (scale: number) => void
  selectedBorderWidth: number
  onSelectedBorderWidthChange: (width: number) => void
  enableHoverInfo: boolean
  onEnableHoverInfoChange: (enable: boolean) => void
  hoverLabelScale: number
  onHoverLabelScaleChange: (scale: number) => void
}

export default function StylePanel({
  isOpen,
  onClose,
  showLabels,
  onShowLabelsChange,
  nameMode,
  onNameModeChange,
  nodeScale,
  onNodeScaleChange,
  edgeScale,
  onEdgeScaleChange,
  selectedBorderWidth,
  onSelectedBorderWidthChange,
  enableHoverInfo,
  onEnableHoverInfoChange,
  hoverLabelScale,
  onHoverLabelScaleChange,
}: StylePanelProps) {
  if (!isOpen) return null

  return (
    <Box
      position="absolute"
      top={10}
      right={2}
      zIndex={2}
      bg="whiteAlpha.900"
      _dark={{ bg: "blackAlpha.700" }}
      px={3}
      py={2}
      rounded="md"
      boxShadow="lg"
      minW="240px"
    >
      <Stack gap={3}>
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="semibold">Style</Text>
          <Button size="xs" variant="ghost" onClick={onClose}>Close</Button>
        </HStack>
        
        <HStack gap={2} align="center">
          <Text fontSize="xs" opacity={0.8}>Names:</Text>
          <select
            value={nameMode}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              onNameModeChange(e.target.value === 'gene' ? 'gene' : 'systematic')
            }
            style={{ 
              fontSize: '12px', 
              padding: '2px 6px', 
              borderRadius: 6, 
              border: '1px solid rgba(0,0,0,0.1)', 
              background: 'transparent' 
            }}
          >
            <option value="systematic">Systematic</option>
            <option value="gene">Gene</option>
          </select>
        </HStack>
        
        <Checkbox
          checked={showLabels}
          onCheckedChange={({ checked }) => onShowLabelsChange(!!checked)}
        >
          <Text fontSize="sm">Show labels</Text>
        </Checkbox>

        <Checkbox
          checked={enableHoverInfo}
          onCheckedChange={({ checked }) => onEnableHoverInfoChange(!!checked)}
        >
          <Text fontSize="sm">Hover info (labels & overlaps)</Text>
        </Checkbox>

        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs">Node size</Text>
            <Text fontSize="xs">{Math.round(nodeScale * 100)}%</Text>
          </HStack>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={Math.round(nodeScale * 100)}
            onChange={(e) => onNodeScaleChange(Number(e.target.value) / 100)}
            style={{ width: "100%" }}
          />
        </Box>

        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs">Edge width</Text>
            <Text fontSize="xs">{Math.round(edgeScale * 100)}%</Text>
          </HStack>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={Math.round(edgeScale * 100)}
            onChange={(e) => onEdgeScaleChange(Number(e.target.value) / 100)}
            style={{ width: "100%" }}
          />
        </Box>

        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs">Selected border width</Text>
            <Text fontSize="xs">{selectedBorderWidth}px</Text>
          </HStack>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={selectedBorderWidth}
            onChange={(e) => onSelectedBorderWidthChange(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </Box>

        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs">Hover label size</Text>
            <Text fontSize="xs">{Math.round(hoverLabelScale * 100)}%</Text>
          </HStack>
          <input
            type="range"
            min={50}
            max={300}
            step={10}
            value={Math.round(hoverLabelScale * 100)}
            onChange={(e) => onHoverLabelScaleChange(Number(e.target.value) / 100)}
            style={{ width: "100%" }}
          />
        </Box>
      </Stack>
    </Box>
  )
}