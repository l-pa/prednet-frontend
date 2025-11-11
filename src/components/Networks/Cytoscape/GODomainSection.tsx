import { memo } from "react"
import { Box, Stack, Text } from "@chakra-ui/react"
import { LuFlaskConical, LuBox, LuZap } from "react-icons/lu"
import type { GODomain, GOTermWithProteins, ComparisonMode } from "@/utils/goTermsUtils"
import { getGODomainLabel } from "@/utils/goTermsUtils"
import GOTermTree from "./GOTermTree"

interface GODomainSectionProps {
  domain: GODomain
  terms: GOTermWithProteins[]
  mode: ComparisonMode
  allProteins: string[]
  searchQuery: string
  expandedTerms: Set<string>
  onToggleExpand: (termId: string) => void
  isExpanded: boolean
  onToggleSection: () => void
}

// Domain-specific icons and colors
const DOMAIN_CONFIG: Record<GODomain, { icon: React.ElementType; color: string }> = {
  biological_process: {
    icon: LuFlaskConical,
    color: "#4299e1", // Blue
  },
  cellular_component: {
    icon: LuBox,
    color: "#48bb78", // Green
  },
  molecular_function: {
    icon: LuZap,
    color: "#ed8936", // Orange
  },
}

const GODomainSection = memo(function GODomainSection({
  domain,
  terms,
  mode,
  allProteins,
  searchQuery,
  expandedTerms,
  onToggleExpand,
  isExpanded,
  onToggleSection,
}: GODomainSectionProps) {
  const config = DOMAIN_CONFIG[domain]
  const domainLabel = getGODomainLabel(domain)

  // Performance optimization: limit rendering for very large lists
  // Virtual scrolling alternative - only render first 100 terms if no search
  const hasLargeTermCount = terms.length > 100
  const displayTerms = hasLargeTermCount && !searchQuery ? terms.slice(0, 100) : terms
  const hiddenTermCount = hasLargeTermCount && !searchQuery ? terms.length - 100 : 0

  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      borderColor="gray.200"
      _dark={{ borderColor: "gray.700" }}
      overflow="hidden"
      role="region"
      aria-labelledby={`go-domain-${domain}-header`}
      aria-label={`${domainLabel} GO terms section`}
    >
      {/* Domain Header */}
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
        _hover={{
          bg: "gray.100",
          _dark: { bg: "gray.750" },
        }}
        onClick={onToggleSection}
        aria-expanded={isExpanded}
        aria-controls={`go-domain-${domain}-content`}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${domainLabel} section with ${terms.length} term${terms.length !== 1 ? "s" : ""}`}
      >
        <Stack direction="row" align="center" gap={2}>
          <Box color={config.color} display="flex" alignItems="center">
            {domain === "biological_process" && <LuFlaskConical />}
            {domain === "cellular_component" && <LuBox />}
            {domain === "molecular_function" && <LuZap />}
          </Box>
          <Text
            id={`go-domain-${domain}-header`}
            fontSize="sm"
            fontWeight="semibold"
            color={config.color}
          >
            {domainLabel}
          </Text>
          <Text fontSize="xs" opacity={0.7}>
            ({terms.length} term{terms.length !== 1 ? "s" : ""})
          </Text>
        </Stack>
        <Text fontSize="sm" opacity={0.7}>
          {isExpanded ? "▼" : "▶"}
        </Text>
      </Box>

      {/* Domain Content */}
      {isExpanded && (
        <Box
          id={`go-domain-${domain}-content`}
          p={3}
          bg="white"
          _dark={{ bg: "gray.900" }}
        >
          {terms.length === 0 ? (
            <Stack gap={2} align="center" justify="center" minH="80px">
              <Text fontSize="sm" opacity={0.7} textAlign="center">
                No {domainLabel.toLowerCase()} annotations available
              </Text>
              <Text fontSize="xs" opacity={0.5} textAlign="center" maxW="300px">
                {mode === "intersection"
                  ? "No shared terms in this domain across all proteins"
                  : "No terms found in this domain for any protein"}
              </Text>
            </Stack>
          ) : (
            <Stack gap={2}>
              {hiddenTermCount > 0 && (
                <Box 
                  p={2} 
                  bg="yellow.50" 
                  _dark={{ bg: "yellow.900", borderColor: "yellow.700" }} 
                  borderRadius="md" 
                  borderWidth="1px" 
                  borderColor="yellow.200"
                >
                  <Text fontSize="xs" color="yellow.700" _dark={{ color: "yellow.200" }}>
                    ⚠️ Showing first 100 of {terms.length} terms. Use search to filter results.
                  </Text>
                </Box>
              )}
              <GOTermTree
                terms={displayTerms}
                mode={mode}
                allProteins={allProteins}
                expandedTerms={expandedTerms}
                onToggleExpand={onToggleExpand}
                searchQuery={searchQuery}
                domainColor={config.color}
              />
            </Stack>
          )}
        </Box>
      )}
    </Box>
  )
})

export default GODomainSection
