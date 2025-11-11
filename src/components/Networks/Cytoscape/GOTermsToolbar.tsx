import { useState, useEffect, useCallback, useRef, memo } from "react"
import { Box, Input, Stack, Text } from "@chakra-ui/react"
import { Radio, RadioGroup } from "@/components/ui/radio"
import { CloseButton } from "@/components/ui/close-button"
import type { ComparisonMode } from "@/utils/goTermsUtils"

interface GOTermsToolbarProps {
  mode: ComparisonMode
  onModeChange: (mode: ComparisonMode) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  matchCount?: number
}

const GOTermsToolbar = memo(function GOTermsToolbar({
  mode,
  onModeChange,
  searchQuery,
  onSearchChange,
  matchCount,
}: GOTermsToolbarProps) {
  // Local state for immediate input feedback
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync local state with prop when it changes externally
  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  // Debounced search handler with 300ms delay
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      if (localQuery !== searchQuery) {
        onSearchChange(localQuery)
      }
    }, 300)

    // Cleanup on unmount or when dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [localQuery, searchQuery, onSearchChange])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value)
  }, [])

  const handleClearSearch = useCallback(() => {
    setLocalQuery("")
    onSearchChange("")
  }, [onSearchChange])

  return (
    <Stack
      direction={{ base: "column", md: "row" }}
      gap={4}
      p={3}
      bg="gray.50"
      _dark={{ bg: "gray.800" }}
      borderRadius="md"
      align={{ base: "stretch", md: "center" }}
      justify="space-between"
      role="toolbar"
      aria-label="GO terms filtering and search controls"
    >
      {/* Mode Toggle */}
      <Box flex="0 0 auto">
        <RadioGroup
          value={mode}
          onValueChange={(e) => onModeChange(e.value as ComparisonMode)}
          aria-label="Comparison mode: choose between intersection or union view"
        >
          <Stack direction="row" gap={4}>
            <Radio 
              value="intersection"
              aria-describedby="mode-intersection-desc"
            >
              <Text fontSize="sm">Intersection</Text>
            </Radio>
            <Radio 
              value="union"
              aria-describedby="mode-union-desc"
            >
              <Text fontSize="sm">Union</Text>
            </Radio>
          </Stack>
        </RadioGroup>
        {/* Hidden descriptions for screen readers */}
        <Box position="absolute" left="-10000px" width="1px" height="1px" overflow="hidden">
          <span id="mode-intersection-desc">Show only GO terms shared by all proteins</span>
          <span id="mode-union-desc">Show all GO terms from any protein</span>
        </Box>
      </Box>

      {/* Search Input */}
      <Box flex="1" position="relative">
        <Input
          placeholder="Search GO terms by ID or name..."
          value={localQuery}
          onChange={handleInputChange}
          size="sm"
          pr={localQuery ? "8" : "3"}
          aria-label="Search GO terms by ID or name"
          aria-describedby={searchQuery && matchCount !== undefined ? "search-results-count" : undefined}
          bg="white"
          _dark={{ bg: "gray.900" }}
        />
        {localQuery && (
          <CloseButton
            position="absolute"
            right="2"
            top="50%"
            transform="translateY(-50%)"
            size="sm"
            onClick={handleClearSearch}
            aria-label="Clear search query"
          />
        )}
      </Box>

      {/* Match Count */}
      {searchQuery && matchCount !== undefined && (
        <Box flex="0 0 auto">
          <Text 
            id="search-results-count"
            fontSize="sm" 
            opacity={0.7} 
            whiteSpace="nowrap"
            role="status"
            aria-live="polite"
          >
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </Text>
        </Box>
      )}
    </Stack>
  )
})

export default GOTermsToolbar
