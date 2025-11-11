import { useState, useMemo, useEffect, useRef, useCallback, memo } from "react"
import { Box, Stack, Text, Skeleton } from "@chakra-ui/react"
import type { ProteinFeatureData } from "./types"
import type { ComparisonMode, GODomain } from "@/utils/goTermsUtils"
import {
  computeGOTermIntersection,
  computeGOTermUnion,
  filterGOTerms,
} from "@/utils/goTermsUtils"
import GOTermsToolbar from "./GOTermsToolbar"
import GODomainSection from "./GODomainSection"
import GOTermsLegend from "./GOTermsLegend"

interface GOTermsPanelProps {
  proteinData: ProteinFeatureData[] | null
  isLoading?: boolean
  error?: string | null
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const GOTermsPanel = memo(function GOTermsPanel({
  proteinData,
  isLoading = false,
  error = null,
  isCollapsed = false,
  onToggleCollapse,
}: GOTermsPanelProps) {
  // State management
  const [mode, setMode] = useState<ComparisonMode>("intersection")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set())
  const [expandedDomains, setExpandedDomains] = useState<Set<GODomain>>(
    new Set(["biological_process", "cellular_component", "molecular_function"])
  )

  // Screen reader announcements
  const announcementRef = useRef<HTMLDivElement>(null)

  // Extract protein names and GO terms (handle null proteinData)
  // Memoize to prevent unnecessary recalculations
  const proteinNames = useMemo(() => proteinData?.map((p) => p.protein) || [], [proteinData])
  const proteinGoTerms = useMemo(() => proteinData?.map((p) => p.go_terms) || [], [proteinData])

  // Check if any proteins have GO terms
  const hasAnyGOTerms = useMemo(() => 
    proteinGoTerms.some(
      (terms) =>
        terms &&
        (terms.biological_process.length > 0 ||
          terms.cellular_component.length > 0 ||
          terms.molecular_function.length > 0)
    ),
    [proteinGoTerms]
  )

  // Compute GO terms for each domain based on mode
  const domains: GODomain[] = useMemo(() => [
    "biological_process",
    "cellular_component",
    "molecular_function",
  ], [])

  // Memoize the processed terms computation
  const processedTermsByDomain = useMemo(() => {
    // Skip computation if collapsed (lazy loading optimization)
    if (isCollapsed) {
      return {
        biological_process: [],
        cellular_component: [],
        molecular_function: [],
      }
    }

    const result: Record<GODomain, any[]> = {
      biological_process: [],
      cellular_component: [],
      molecular_function: [],
    }

    for (const domain of domains) {
      const terms =
        mode === "intersection"
          ? computeGOTermIntersection(proteinGoTerms, proteinNames, domain)
          : computeGOTermUnion(proteinGoTerms, proteinNames, domain)

      result[domain] = filterGOTerms(terms, searchQuery)
    }

    return result
  }, [mode, searchQuery, proteinGoTerms, proteinNames, domains, isCollapsed])

  // Count total terms across all domains
  const totalTermCount = useMemo(() => {
    return domains.reduce(
      (sum, domain) => sum + processedTermsByDomain[domain].length,
      0
    )
  }, [processedTermsByDomain])

  // Check if we have a large number of terms (100+) for performance warning
  const hasLargeTermCount = totalTermCount > 100
  const shouldShowPerformanceWarning = hasLargeTermCount && !searchQuery

  // Handle toggle expand for individual terms (memoized)
  const handleToggleExpand = useCallback((termId: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev)
      if (next.has(termId)) {
        next.delete(termId)
      } else {
        next.add(termId)
      }
      return next
    })
  }, [])

  // Handle toggle expand for domains (memoized)
  const handleToggleDomain = useCallback((domain: GODomain) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev)
      if (next.has(domain)) {
        next.delete(domain)
      } else {
        next.add(domain)
      }
      return next
    })
  }, [])

  // Announce to screen reader (memoized)
  const announceToScreenReader = useCallback((message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message
    }
  }, [])

  // Handle mode change with screen reader announcement (memoized)
  const handleModeChange = useCallback((newMode: ComparisonMode) => {
    setMode(newMode)
    announceToScreenReader(
      `Switched to ${newMode} mode. ${
        newMode === "intersection"
          ? "Showing only GO terms shared by all proteins."
          : "Showing all GO terms from any protein."
      }`
    )
  }, [announceToScreenReader])

  // Announce search results
  useEffect(() => {
    if (searchQuery && hasAnyGOTerms) {
      const message =
        totalTermCount === 0
          ? "No GO terms match your search"
          : `Found ${totalTermCount} matching GO term${totalTermCount !== 1 ? "s" : ""}`
      announceToScreenReader(message)
    }
  }, [searchQuery, totalTermCount, hasAnyGOTerms])

  // Announce when no intersection found
  useEffect(() => {
    if (mode === "intersection" && totalTermCount === 0 && !searchQuery && hasAnyGOTerms) {
      announceToScreenReader("No shared GO terms across selected proteins")
    }
  }, [mode, totalTermCount, searchQuery, hasAnyGOTerms])

  return (
    <>
      {/* Screen reader announcements - visually hidden */}
      <Box
        ref={announcementRef}
        position="absolute"
        left="-10000px"
        width="1px"
        height="1px"
        overflow="hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      <Box
        borderWidth="1px"
        borderRadius="md"
        borderColor="gray.200"
        _dark={{ borderColor: "gray.700" }}
        mt={4}
        role="region"
        aria-labelledby="go-terms-panel-title"
        aria-label="Gene Ontology terms comparison panel"
      >
        {/* Panel Header */}
        <Box
          as="button"
          w="full"
          p={3}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          cursor="pointer"
          bg="gray.50"
          _dark={{ bg: "gray.800" }}
          borderTopRadius="md"
          _hover={{
            bg: "gray.100",
            _dark: { bg: "gray.750" },
          }}
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          aria-controls="go-terms-panel-content"
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} GO terms panel`}
        >
        <Stack direction="row" align="center" gap={2}>
          <Text
            id="go-terms-panel-title"
            fontSize="md"
            fontWeight="semibold"
          >
            GO Term Annotations
          </Text>
          {hasAnyGOTerms && (
            <Text fontSize="sm" opacity={0.7}>
              ({totalTermCount} term{totalTermCount !== 1 ? "s" : ""})
            </Text>
          )}
        </Stack>
        <Text fontSize="sm" opacity={0.7}>
          {isCollapsed ? "▶" : "▼"}
        </Text>
      </Box>

      {/* Panel Content */}
      {!isCollapsed && (
        <Box id="go-terms-panel-content" p={4}>
            {/* Loading state */}
            {isLoading && (
              <Stack gap={3}>
                <Skeleton height="40px" borderRadius="md" />
                <Skeleton height="200px" borderRadius="md" />
                <Skeleton height="200px" borderRadius="md" />
                <Skeleton height="200px" borderRadius="md" />
              </Stack>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <Stack gap={2} align="center" justify="center" minH="100px" role="alert" aria-live="polite">
                <Text fontSize="sm" color="red.500" textAlign="center">
                  Failed to load GO term data
                </Text>
                <Text fontSize="xs" opacity={0.5} textAlign="center" maxW="400px">
                  {error}
                </Text>
                <Text fontSize="xs" opacity={0.5} textAlign="center">
                  Sequence features are still available above
                </Text>
              </Stack>
            )}
            
            {/* No GO terms available */}
            {!isLoading && !error && !hasAnyGOTerms && proteinData && (
              <Stack gap={2} align="center" justify="center" minH="100px">
                <Text fontSize="sm" opacity={0.7} textAlign="center">
                  No GO term annotations available
                </Text>
                <Text fontSize="xs" opacity={0.5} textAlign="center" maxW="400px">
                  The selected proteins do not have Gene Ontology annotations in the database
                </Text>
                {/* Debug info */}
                <Box mt={4} p={3} bg="gray.100" _dark={{ bg: "gray.800" }} borderRadius="md" fontSize="xs" fontFamily="mono">
                  <Text fontWeight="bold" mb={2}>Debug Info:</Text>
                  <Text>Proteins: {proteinData?.length || 0}</Text>
                  <Text>Has GO terms check: {String(hasAnyGOTerms)}</Text>
                  {proteinData?.map((p, i) => (
                    <Box key={i} mt={2} pl={2} borderLeftWidth="2px" borderColor="gray.400">
                      <Text>{p.protein}</Text>
                      <Text>go_terms exists: {String(!!p.go_terms)}</Text>
                      {p.go_terms && (
                        <>
                          <Text>BP: {p.go_terms.biological_process?.length || 0}</Text>
                          <Text>CC: {p.go_terms.cellular_component?.length || 0}</Text>
                          <Text>MF: {p.go_terms.molecular_function?.length || 0}</Text>
                        </>
                      )}
                    </Box>
                  ))}
                </Box>
              </Stack>
            )}

            {/* GO terms content */}
            {!isLoading && !error && hasAnyGOTerms && (
              <Stack gap={4}>
                {/* Performance warning for large datasets */}
                {shouldShowPerformanceWarning && (
                  <Box 
                    p={3} 
                    bg="blue.50" 
                    _dark={{ bg: "blue.900", borderColor: "blue.700" }} 
                    borderRadius="md" 
                    borderWidth="1px" 
                    borderColor="blue.200"
                    role="status"
                    aria-live="polite"
                  >
                    <Text fontSize="sm" color="blue.700" _dark={{ color: "blue.200" }}>
                      ℹ️ Large dataset ({totalTermCount} GO terms). Use search to filter results for better performance.
                    </Text>
                  </Box>
                )}

                {/* Toolbar */}
                <GOTermsToolbar
                  mode={mode}
                  onModeChange={handleModeChange}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  matchCount={searchQuery ? totalTermCount : undefined}
                />

                {/* Domain sections */}
                {domains.map((domain) => (
                  <GODomainSection
                    key={domain}
                    domain={domain}
                    terms={processedTermsByDomain[domain]}
                    mode={mode}
                    allProteins={proteinNames}
                    searchQuery={searchQuery}
                    expandedTerms={expandedTerms}
                    onToggleExpand={handleToggleExpand}
                    isExpanded={expandedDomains.has(domain)}
                    onToggleSection={() => handleToggleDomain(domain)}
                  />
                ))}

                {/* Legend */}
                <GOTermsLegend proteins={proteinNames} mode={mode} />

                {/* No results from search/filter */}
                {searchQuery && totalTermCount === 0 && (
                  <Stack gap={2} align="center" justify="center" minH="100px">
                    <Text fontSize="sm" opacity={0.7} textAlign="center">
                      No GO terms match your search
                    </Text>
                    <Text fontSize="xs" opacity={0.5} textAlign="center">
                      Try a different search term or clear the filter
                    </Text>
                  </Stack>
                )}

                {/* No intersection */}
                {mode === "intersection" && totalTermCount === 0 && !searchQuery && hasAnyGOTerms && (
                  <Stack gap={2} align="center" justify="center" minH="100px">
                    <Text fontSize="sm" opacity={0.7} textAlign="center">
                      No shared GO terms across selected proteins
                    </Text>
                    <Text fontSize="xs" opacity={0.5} textAlign="center">
                      Try switching to Union mode to see all GO terms
                    </Text>
                  </Stack>
                )}
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </>
  )
})

export default GOTermsPanel
