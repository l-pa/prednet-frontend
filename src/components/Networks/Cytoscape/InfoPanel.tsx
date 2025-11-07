import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react"
import type { NetworkStats } from './types'

interface InfoPanelProps {
  isOpen: boolean
  onClose: () => void
  networkStats: NetworkStats
  nodeTypeColors: Record<string, string>
}

export default function InfoPanel({
  isOpen,
  onClose,
  networkStats,
  nodeTypeColors,
}: InfoPanelProps) {
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
      minW="260px"
    >
      <Stack gap={3}>
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="semibold">Info</Text>
          <Button size="xs" variant="ghost" onClick={onClose}>Close</Button>
        </HStack>
        
        <Stack gap={1} fontSize="sm">
          <HStack justify="space-between">
            <Text>Nodes</Text>
            <Text>{networkStats.nodeCount}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text>Edges</Text>
            <Text>{networkStats.edgeCount}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text>Weight range</Text>
            <Text>
              {Number.isFinite(networkStats.weightRange.min) ? networkStats.weightRange.min.toFixed(2) : '-'} – {Number.isFinite(networkStats.weightRange.max) ? networkStats.weightRange.max.toFixed(2) : '-'}
            </Text>
          </HStack>
          <HStack justify="space-between">
            <Text>Similarity range</Text>
            <Text>
              {Number.isFinite(networkStats.similarityRange.min) ? networkStats.similarityRange.min.toFixed(2) : '-'} – {Number.isFinite(networkStats.similarityRange.max) ? networkStats.similarityRange.max.toFixed(2) : '-'}
            </Text>
          </HStack>
        </Stack>
        
        {networkStats.typeCounts.length > 0 && (
          <Box>
            <Text fontSize="xs" mb={2} opacity={0.8}>Nodes by type</Text>
            <Stack gap={2} fontSize="sm">
              {(() => {
                const maxCount = Math.max(
                  ...networkStats.typeCounts.map((t) => t.count),
                  1
                )
                return networkStats.typeCounts.map(({ type, count }) => {
                  const pct = Math.max(4, Math.round((count / maxCount) * 100))
                  const color = nodeTypeColors[type] || nodeTypeColors.unknown
                  return (
                    <Box key={type}>
                      <HStack justify="space-between" mb={1}>
                        <Text>{type}</Text>
                        <Text>{count}</Text>
                      </HStack>
                      <Box bg="blackAlpha.200" _dark={{ bg: 'whiteAlpha.200' }} h="6px" rounded="sm">
                        <Box bg={color} h="100%" width={`${pct}%`} rounded="sm" />
                      </Box>
                    </Box>
                  )
                })
              })()}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  )
}