import { useState, useEffect, useCallback, useRef, memo } from "react"
import { Box, Input, Stack, Text, HStack } from "@chakra-ui/react"
import { Radio, RadioGroup } from "@/components/ui/radio"
import { CloseButton } from "@/components/ui/close-button"
import type { ComparisonMode, GODomain } from "@/utils/goTermsUtils"

interface GOTermsToolbarProps {
  mode: ComparisonMode
  onModeChange: (mode: ComparisonMode) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  matchCount?: number
  viewMode?: "tree" | "dag"
  onViewModeChange?: (mode: "tree" | "dag") => void
  selectedDomain?: GODomain
  onDomainChange?: (domain: GODomain) => void
}

const GOTermsToolbar = memo(function GOTermsToolbar({
  mode,
  onModeChange,
  searchQuery,
  onSearchChange,
  matchCount,
  viewMode = "tree",
  onViewModeChange,
  selectedDomain = "biological_process",
  onDomainChange,
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
    <Stack gap={3}>
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

      {/* View Mode and Domain Selection (for DAG view) */}
      {onViewModeChange && (
        <HStack
          gap={4}
          p={3}
          bg="gray.50"
          _dark={{ bg: "gray.800" }}
          borderRadius="md"
          justify="space-between"
        >
          {/* View Mode Toggle */}
          <RadioGroup
            value={viewMode}
            onValueChange={(e) => onViewModeChange(e.value as "tree" | "dag")}
            aria-label="View mode: choose between tree list or DAG visualization"
          >
            <Stack direction="row" gap={4}>
              <Radio value="tree">
                <Text fontSize="sm">Tree View</Text>
              </Radio>
              <Radio value="dag">
                <Text fontSize="sm">DAG View</Text>
              </Radio>
            </Stack>
          </RadioGroup>

          {/* Domain Selection (only for DAG view) */}
          {viewMode === "dag" && onDomainChange && (
            <RadioGroup
              value={selectedDomain}
              onValueChange={(e) => onDomainChange(e.value as GODomain)}
              aria-label="Select GO domain for DAG visualization"
            >
              <Stack direction="row" gap={3}>
                <Radio value="biological_process">
                  <Text fontSize="sm">BP</Text>
                </Radio>
                <Radio value="cellular_component">
                  <Text fontSize="sm">CC</Text>
                </Radio>
                <Radio value="molecular_function">
                  <Text fontSize="sm">MF</Text>
                </Radio>
              </Stack>
            </RadioGroup>
          )}
        </HStack>
      )}
    </Stack>
  )
})

export default GOTermsToolbar
