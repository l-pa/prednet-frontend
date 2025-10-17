import { Box, HStack, Stack, Text, Badge } from "@chakra-ui/react"

export type ProteinDistributionItem = {
  protein: string
  count: number
  type_counts?: Record<string, number>
  type_ratios?: Record<string, number>
  ratio?: number
}

interface ProteinDistributionListProps {
  items: ProteinDistributionItem[]
}

const defaultTypeColors: Record<string, string> = {
  matched_prediction: '#74C476',
  matched_reference: '#67A9CF',
  prediction: '#A1D99B',
  reference: '#9ECAE1',
  unknown: '#BDBDBD',
}

export default function ProteinDistributionList({ items }: ProteinDistributionListProps) {
  const maxCount = Math.max(1, ...items.map((i) => i.count))
  return (
    <Stack gap={3}>
      {items.map(({ protein, count, type_counts, type_ratios, ratio }) => {
        const totalPct = Math.max(4, Math.round((count / (maxCount || 1)) * 100))
        const parts = Object.entries(type_counts || {}).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
        const sum = parts.reduce((acc, [, c]) => acc + c, 0) || 1
        return (
          <Box key={`pd-${protein}`} p={3} borderWidth="1px" rounded="md" bg="white" _dark={{ bg: 'blackAlpha.600' }}>
            <Stack gap={1} mb={2}>
              <HStack gap={2} align="center">
                <Text fontSize="xs" opacity={0.8}>Protein</Text>
              </HStack>
              <Text fontWeight="semibold">{protein}</Text>
            </Stack>
            <HStack gap={6} mb={2} align="flex-end">
              <Stack gap={0} minW="120px">
                <HStack gap={2} align="center">
                  <Text fontSize="xs" opacity={0.8}>Share of component</Text>
                </HStack>
                <HStack gap={1} opacity={0.9}>
                  <Text fontSize="xs">{typeof ratio === 'number' ? `${Math.round(ratio * 100)}%` : '-'}</Text>
                </HStack>
              </Stack>
              <Stack gap={0} minW="120px">
                <HStack gap={2} align="center">
                  <Text fontSize="xs" opacity={0.8}>Count</Text>
                </HStack>
                <Badge variant="subtle" w="fit-content">{count}</Badge>
              </Stack>
            </HStack>
            <Stack gap={1}>
              <HStack gap={2} align="center">
                <Text fontSize="xs" opacity={0.8}>Type distribution</Text>
              </HStack>
              <Box bg="blackAlpha.200" _dark={{ bg: 'whiteAlpha.200' }} h="8px" rounded="sm" position="relative">
                <HStack gap={0} w={`${totalPct}%`} h="100%">
                  {parts.length === 0 ? (
                    <Box bg="#4A90E2" h="100%" w="100%" rounded="sm" />
                  ) : (
                    parts.map(([t, c], idx) => {
                      const frac = c / sum
                      const w = `${Math.max(2, Math.round(frac * 100))}%`
                      const color = defaultTypeColors[t] || defaultTypeColors.unknown
                      const leftRadius = idx === 0 ? 6 : 0
                      const rightRadius = idx === parts.length - 1 ? 6 : 0
                      return (
                        <Box key={`${protein}-${t}`} bg={color} h="100%" w={w} borderTopLeftRadius={leftRadius} borderBottomLeftRadius={leftRadius} borderTopRightRadius={rightRadius} borderBottomRightRadius={rightRadius} />
                      )
                    })
                  )}
                </HStack>
              </Box>
              {parts.length > 0 && (
                <HStack gap={2} wrap="wrap">
                  {parts.map(([t, c]) => (
                    <Badge key={`${protein}-legend-${t}`} colorScheme="gray" variant="outline">
                      {t}: {c}{typeof type_ratios?.[t] === 'number' ? ` (${Math.round(type_ratios[t] * 100)}%)` : ''}
                    </Badge>
                  ))}
                </HStack>
              )}
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}


