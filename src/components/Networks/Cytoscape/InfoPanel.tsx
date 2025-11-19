import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react"
import type { NetworkStats } from './types'

interface InfoPanelProps {
  isOpen: boolean
  onClose: () => void
  networkStats: NetworkStats
  nodeTypeColors: Record<string, string>
  cy: any | null
}

export default function InfoPanel({
  isOpen,
  onClose,
  networkStats,
  nodeTypeColors,
  cy,
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
        
        {/* Stacked bars for Predictions and References */}
        {networkStats.typeCounts.length > 0 && (
          <Box>
            <Text fontSize="xs" mb={2} opacity={0.8}>Matched vs Unmatched</Text>
            <Stack gap={3} fontSize="sm">
              {(() => {
                // Calculate predictions (matched + unmatched)
                const matchedPred = networkStats.typeCounts.find(t => t.type === 'matched_prediction')?.count || 0
                const unmatchedPred = networkStats.typeCounts.find(t => t.type === 'prediction')?.count || 0
                const totalPred = matchedPred + unmatchedPred
                
                // Calculate references (matched + unmatched)
                const matchedRef = networkStats.typeCounts.find(t => t.type === 'matched_reference')?.count || 0
                const unmatchedRef = networkStats.typeCounts.find(t => t.type === 'reference')?.count || 0
                const totalRef = matchedRef + unmatchedRef
                
                return (
                  <>
                    {/* Predictions stacked bar */}
                    {totalPred > 0 && (
                      <Box>
                        <HStack justify="space-between" mb={1}>
                          <Text>Predictions</Text>
                          <Text>{totalPred}</Text>
                        </HStack>
                        <HStack gap={0} h="20px" rounded="sm" overflow="hidden">
                          {matchedPred > 0 && (
                            <Box
                              bg={nodeTypeColors.matched_prediction}
                              h="100%"
                              width={`${(matchedPred / totalPred) * 100}%`}
                              title={`Matched: ${matchedPred} (${Math.round((matchedPred / totalPred) * 100)}%)`}
                            />
                          )}
                          {unmatchedPred > 0 && (
                            <Box
                              bg={nodeTypeColors.prediction}
                              h="100%"
                              width={`${(unmatchedPred / totalPred) * 100}%`}
                              title={`Unmatched: ${unmatchedPred} (${Math.round((unmatchedPred / totalPred) * 100)}%)`}
                            />
                          )}
                        </HStack>
                        <HStack justify="space-between" mt={1} fontSize="xs" opacity={0.7}>
                          <Text>Matched: {matchedPred} ({Math.round((matchedPred / totalPred) * 100)}%)</Text>
                          <Text>Unmatched: {unmatchedPred} ({Math.round((unmatchedPred / totalPred) * 100)}%)</Text>
                        </HStack>
                      </Box>
                    )}
                    
                    {/* References stacked bar */}
                    {totalRef > 0 && (
                      <Box>
                        <HStack justify="space-between" mb={1}>
                          <Text>References</Text>
                          <Text>{totalRef}</Text>
                        </HStack>
                        <HStack gap={0} h="20px" rounded="sm" overflow="hidden">
                          {matchedRef > 0 && (
                            <Box
                              bg={nodeTypeColors.matched_reference}
                              h="100%"
                              width={`${(matchedRef / totalRef) * 100}%`}
                              title={`Matched: ${matchedRef} (${Math.round((matchedRef / totalRef) * 100)}%)`}
                            />
                          )}
                          {unmatchedRef > 0 && (
                            <Box
                              bg={nodeTypeColors.reference}
                              h="100%"
                              width={`${(unmatchedRef / totalRef) * 100}%`}
                              title={`Unmatched: ${unmatchedRef} (${Math.round((unmatchedRef / totalRef) * 100)}%)`}
                            />
                          )}
                        </HStack>
                        <HStack justify="space-between" mt={1} fontSize="xs" opacity={0.7}>
                          <Text>Matched: {matchedRef} ({Math.round((matchedRef / totalRef) * 100)}%)</Text>
                          <Text>Unmatched: {unmatchedRef} ({Math.round((unmatchedRef / totalRef) * 100)}%)</Text>
                        </HStack>
                      </Box>
                    )}
                  </>
                )
              })()}
            </Stack>
          </Box>
        )}
        
        {/* Component Size Distribution */}
        {cy && (
          <Box>
            <Text fontSize="xs" mb={2} opacity={0.8}>Component size distribution</Text>
            <Stack gap={1} fontSize="sm">
              {(() => {
                // Compute component sizes from cy
                const nodeIds = new Set<string>()
                const adjacency = new Map<string, Set<string>>()
                
                try {
                  cy.nodes().forEach((n: any) => {
                    const id = String(n.id())
                    nodeIds.add(id)
                    adjacency.set(id, new Set())
                  })
                  
                  cy.edges().forEach((e: any) => {
                    const source = String(e.data("source"))
                    const target = String(e.data("target"))
                    adjacency.get(source)?.add(target)
                    adjacency.get(target)?.add(source)
                  })
                  
                  const visited = new Set<string>()
                  const sizes: number[] = []
                  
                  nodeIds.forEach(startId => {
                    if (visited.has(startId)) return
                    const queue = [startId]
                    let componentSize = 0
                    while (queue.length > 0) {
                      const id = queue.shift()!
                      if (visited.has(id)) continue
                      visited.add(id)
                      componentSize++
                      const neighbors = adjacency.get(id) || new Set()
                      neighbors.forEach(neighbor => {
                        if (!visited.has(neighbor)) queue.push(neighbor)
                      })
                    }
                    sizes.push(componentSize)
                  })
                  
                  sizes.sort((a, b) => b - a)
                  
                  // Group into buckets
                  const buckets = [
                    { label: '1-5', min: 1, max: 5 },
                    { label: '6-10', min: 6, max: 10 },
                    { label: '11-20', min: 11, max: 20 },
                    { label: '21-50', min: 21, max: 50 },
                    { label: '51-100', min: 51, max: 100 },
                    { label: '100+', min: 101, max: Infinity },
                  ]
                  
                  const counts = buckets.map(bucket => ({
                    ...bucket,
                    count: sizes.filter(s => s >= bucket.min && s <= bucket.max).length
                  })).filter(b => b.count > 0)
                  
                  const maxCount = Math.max(...counts.map(b => b.count), 1)
                  
                  return (
                    <>
                      {counts.map(bucket => {
                        const pct = Math.max(4, Math.round((bucket.count / maxCount) * 100))
                        return (
                          <Box key={bucket.label}>
                            <HStack justify="space-between" fontSize="xs">
                              <Text>{bucket.label} nodes</Text>
                              <Text>{bucket.count}</Text>
                            </HStack>
                            <Box bg="blackAlpha.200" _dark={{ bg: 'whiteAlpha.200' }} h="4px" rounded="sm">
                              <Box bg="blue.500" h="100%" width={`${pct}%`} rounded="sm" />
                            </Box>
                          </Box>
                        )
                      })}
                      <Text fontSize="xs" opacity={0.6}>
                        {sizes.length} components, largest: {Math.max(...sizes)} nodes
                      </Text>
                    </>
                  )
                } catch (error) {
                  return <Text fontSize="xs" opacity={0.6}>Unable to compute</Text>
                }
              })()}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  )
}