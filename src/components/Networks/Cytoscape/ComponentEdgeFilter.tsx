import { Box, HStack, Stack, Text, Button } from "@chakra-ui/react"
import { useState } from "react"

interface ComponentEdgeFilterProps {
  onApplyFilter: (filter: EdgeTypeFilter) => void
  onClearFilter: () => void
}

export interface EdgeTypeFilter {
  minMatchedPredictionRatio?: number
  maxMatchedPredictionRatio?: number
  minUnmatchedPredictionRatio?: number
  maxUnmatchedPredictionRatio?: number
  minMatchedReferenceRatio?: number
  maxMatchedReferenceRatio?: number
  minUnmatchedReferenceRatio?: number
  maxUnmatchedReferenceRatio?: number
}

export default function ComponentEdgeFilter({
  onApplyFilter,
  onClearFilter,
}: ComponentEdgeFilterProps) {
  const [matchedPredRange, setMatchedPredRange] = useState<number[]>([0, 100])
  const [unmatchedPredRange, setUnmatchedPredRange] = useState<number[]>([0, 100])
  const [matchedRefRange, setMatchedRefRange] = useState<number[]>([0, 100])
  const [unmatchedRefRange, setUnmatchedRefRange] = useState<number[]>([0, 100])

  const handleApply = () => {
    const filter: EdgeTypeFilter = {}
    
    // Only apply filter if range is not the default [0, 100]
    if (matchedPredRange[0] > 0 || matchedPredRange[1] < 100) {
      filter.minMatchedPredictionRatio = matchedPredRange[0] / 100
      filter.maxMatchedPredictionRatio = matchedPredRange[1] / 100
    }
    if (unmatchedPredRange[0] > 0 || unmatchedPredRange[1] < 100) {
      filter.minUnmatchedPredictionRatio = unmatchedPredRange[0] / 100
      filter.maxUnmatchedPredictionRatio = unmatchedPredRange[1] / 100
    }
    if (matchedRefRange[0] > 0 || matchedRefRange[1] < 100) {
      filter.minMatchedReferenceRatio = matchedRefRange[0] / 100
      filter.maxMatchedReferenceRatio = matchedRefRange[1] / 100
    }
    if (unmatchedRefRange[0] > 0 || unmatchedRefRange[1] < 100) {
      filter.minUnmatchedReferenceRatio = unmatchedRefRange[0] / 100
      filter.maxUnmatchedReferenceRatio = unmatchedRefRange[1] / 100
    }
    
    onApplyFilter(filter)
  }

  const handleClear = () => {
    setMatchedPredRange([0, 100])
    setUnmatchedPredRange([0, 100])
    setMatchedRefRange([0, 100])
    setUnmatchedRefRange([0, 100])
    onClearFilter()
  }

  return (
    <Box
      bg="whiteAlpha.900"
      _dark={{ bg: "blackAlpha.700" }}
      px={3}
      py={2}
      rounded="md"
      boxShadow="lg"
      minW="320px"
      maxW="400px"
    >
      <Stack gap={3}>
        <Text fontSize="sm" fontWeight="semibold">Filter Components by Node Types</Text>
        
        {/* Predictions Section */}
        <Box>
          <Text fontSize="xs" mb={3} opacity={0.8} fontWeight="semibold">Predictions</Text>
          <Stack gap={3}>
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" opacity={0.8}>Matched %</Text>
                <Text fontSize="xs" fontWeight="semibold">
                  {matchedPredRange[0]}% - {matchedPredRange[1]}%
                </Text>
              </HStack>
              <Stack gap={1}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={matchedPredRange[0]}
                  onChange={(e) => setMatchedPredRange([Number(e.target.value), matchedPredRange[1]])}
                  style={{ width: "100%" }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={matchedPredRange[1]}
                  onChange={(e) => setMatchedPredRange([matchedPredRange[0], Number(e.target.value)])}
                  style={{ width: "100%" }}
                />
              </Stack>
            </Box>
            
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" opacity={0.8}>Unmatched %</Text>
                <Text fontSize="xs" fontWeight="semibold">
                  {unmatchedPredRange[0]}% - {unmatchedPredRange[1]}%
                </Text>
              </HStack>
              <Stack gap={1}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={unmatchedPredRange[0]}
                  onChange={(e) => setUnmatchedPredRange([Number(e.target.value), unmatchedPredRange[1]])}
                  style={{ width: "100%" }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={unmatchedPredRange[1]}
                  onChange={(e) => setUnmatchedPredRange([unmatchedPredRange[0], Number(e.target.value)])}
                  style={{ width: "100%" }}
                />
              </Stack>
            </Box>
          </Stack>
        </Box>
        
        {/* References Section */}
        <Box>
          <Text fontSize="xs" mb={3} opacity={0.8} fontWeight="semibold">References</Text>
          <Stack gap={3}>
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" opacity={0.8}>Matched %</Text>
                <Text fontSize="xs" fontWeight="semibold">
                  {matchedRefRange[0]}% - {matchedRefRange[1]}%
                </Text>
              </HStack>
              <Stack gap={1}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={matchedRefRange[0]}
                  onChange={(e) => setMatchedRefRange([Number(e.target.value), matchedRefRange[1]])}
                  style={{ width: "100%" }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={matchedRefRange[1]}
                  onChange={(e) => setMatchedRefRange([matchedRefRange[0], Number(e.target.value)])}
                  style={{ width: "100%" }}
                />
              </Stack>
            </Box>
            
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" opacity={0.8}>Unmatched %</Text>
                <Text fontSize="xs" fontWeight="semibold">
                  {unmatchedRefRange[0]}% - {unmatchedRefRange[1]}%
                </Text>
              </HStack>
              <Stack gap={1}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={unmatchedRefRange[0]}
                  onChange={(e) => setUnmatchedRefRange([Number(e.target.value), unmatchedRefRange[1]])}
                  style={{ width: "100%" }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={unmatchedRefRange[1]}
                  onChange={(e) => setUnmatchedRefRange([unmatchedRefRange[0], Number(e.target.value)])}
                  style={{ width: "100%" }}
                />
              </Stack>
            </Box>
          </Stack>
        </Box>
        
        {/* Action Buttons */}
        <HStack gap={2} justify="flex-end">
          <Button size="xs" variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button size="xs" onClick={handleApply}>
            Apply Filter
          </Button>
        </HStack>
        
        <Text fontSize="xs" opacity={0.6}>
          Drag sliders to set percentage ranges for node types. Default (0-100%) means no filter applied.
        </Text>
      </Stack>
    </Box>
  )
}
