import { memo } from "react"
import { Box, HStack, Stack, Text, Tooltip } from "@chakra-ui/react"
import { LuChevronRight, LuChevronDown } from "react-icons/lu"
import type { GOTermWithProteins, ComparisonMode } from "@/utils/goTermsUtils"
import { isSharedByAllProteins } from "@/utils/goTermsUtils"

interface GOTermNodeProps {
  term: GOTermWithProteins
  mode: ComparisonMode
  allProteins: string[]
  level: number
  isExpanded: boolean
  onToggleExpand: (termId: string) => void
  searchQuery: string
  domainColor: string
  expandedTerms: Set<string>
}

// Protein badge colors - consistent with feature visualization
const PROTEIN_COLORS = [
  "#4299e1", // Blue
  "#48bb78", // Green
  "#9f7aea", // Purple
  "#ed8936", // Orange
  "#f56565", // Red
  "#38b2ac", // Teal
  "#ecc94b", // Yellow
  "#ed64a6", // Pink
]

function getProteinColor(proteinName: string, allProteins: string[]): string {
  const index = allProteins.indexOf(proteinName)
  return PROTEIN_COLORS[index % PROTEIN_COLORS.length]
}

const GOTermNode = memo(function GOTermNode({
  term,
  mode,
  allProteins,
  level,
  isExpanded,
  onToggleExpand,
  searchQuery,
  domainColor,
  expandedTerms,
}: GOTermNodeProps) {
  const hasChildren = term.children && term.children.length > 0
  const isShared = isSharedByAllProteins(term, allProteins)
  const indentPx = level * 20

  // Determine if we should show protein badges (union mode only)
  const showProteinBadges = mode === "union"

  // Determine if this term matches the search query
  const lowerQuery = searchQuery.toLowerCase().trim()
  const isHighlighted = lowerQuery && (
    term.id.toLowerCase().includes(lowerQuery) ||
    term.name.toLowerCase().includes(lowerQuery)
  )

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!hasChildren) return

    // Enter or Space to toggle expansion
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onToggleExpand(term.id)
    }
    // Arrow keys for navigation
    else if (e.key === "ArrowRight" && !isExpanded) {
      e.preventDefault()
      onToggleExpand(term.id)
    }
    else if (e.key === "ArrowLeft" && isExpanded) {
      e.preventDefault()
      onToggleExpand(term.id)
    }
  }

  // Build aria-label for the term
  const ariaLabel = [
    `${term.name}, ${term.id}`,
    hasChildren ? `${isExpanded ? "expanded" : "collapsed"}, ${term.children!.length} child term${term.children!.length !== 1 ? "s" : ""}` : "",
    mode === "union" ? `present in ${term.proteins.join(", ")}` : "",
    isShared && mode === "union" ? "shared by all proteins" : "",
  ].filter(Boolean).join(", ")

  return (
    <Box 
      role="treeitem" 
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-level={level + 1}
      aria-label={ariaLabel}
      aria-setsize={-1}
      aria-posinset={-1}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "blue.500",
        outlineOffset: "2px",
      }}
    >
      {/* Term Row */}
      <HStack
        gap={2}
        p={2}
        pl={`${indentPx + 8}px`}
        borderRadius="md"
        bg={isHighlighted ? "yellow.50" : undefined}
        _dark={{
          bg: isHighlighted ? "yellow.900" : undefined,
        }}
        _hover={{
          bg: isHighlighted ? "yellow.100" : "gray.50",
          _dark: {
            bg: isHighlighted ? "yellow.800" : "gray.800",
          },
        }}
        transition="background 0.15s"
      >
        {/* Expand/Collapse Icon */}
        <Box
          as="button"
          onClick={hasChildren ? () => onToggleExpand(term.id) : undefined}
          cursor={hasChildren ? "pointer" : "default"}
          opacity={hasChildren ? 1 : 0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="16px"
          h="16px"
          flexShrink={0}
          aria-label={hasChildren ? `${isExpanded ? "Collapse" : "Expand"} ${term.name}` : undefined}
          aria-hidden={!hasChildren}
          tabIndex={-1}
          _disabled={{ cursor: "default" }}
          pointerEvents={hasChildren ? "auto" : "none"}
        >
          {hasChildren && (isExpanded ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />)}
        </Box>

        {/* GO ID and Name */}
        <Tooltip.Root openDelay={300}>
          <Tooltip.Trigger asChild>
            <HStack gap={2} flex={1} minW={0}>
              <Text
                fontSize="xs"
                color="gray.500"
                _dark={{ color: "gray.400" }}
                fontFamily="mono"
                flexShrink={0}
              >
                {term.id}
              </Text>
              <Text
                fontSize="sm"
                fontWeight={isShared && mode === "union" ? "semibold" : "normal"}
                color={isShared && mode === "union" ? domainColor : undefined}
                flex={1}
                minW={0}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {term.name}
              </Text>
              {/* Protein Count Badge */}
              {mode === "union" && (
                <Box
                  px={2}
                  py={0.5}
                  bg={isShared ? domainColor : "gray.100"}
                  color={isShared ? "white" : "gray.700"}
                  _dark={{ 
                    bg: isShared ? domainColor : "gray.700",
                    color: isShared ? "white" : "gray.200"
                  }}
                  rounded="full"
                  fontSize="xs"
                  fontWeight="medium"
                  flexShrink={0}
                  title={`Present in ${term.proteins.length} of ${allProteins.length} proteins`}
                >
                  {term.proteins.length}/{allProteins.length}
                </Box>
              )}
            </HStack>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content maxW="320px">
              <Tooltip.Arrow />
              <Stack gap={2} fontSize="xs">
                <Box>
                  <Text fontWeight="semibold" color={domainColor}>
                    {term.name}
                  </Text>
                  <Text opacity={0.8} mt={1}>
                    {term.id}
                  </Text>
                </Box>
                {term.evidence && (
                  <Box>
                    <Text fontWeight="semibold">Evidence:</Text>
                    <Text opacity={0.8}>{term.evidence}</Text>
                  </Box>
                )}
                <Box>
                  <Text fontWeight="semibold">Present in:</Text>
                  <Text opacity={0.8}>{term.proteins.join(", ")}</Text>
                </Box>
                {isShared && mode === "union" && (
                  <Text fontStyle="italic" opacity={0.8}>
                    ✓ Shared by all proteins
                  </Text>
                )}
              </Stack>
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>

        {/* Protein Badges (Union mode only) */}
        {showProteinBadges && (
          <HStack gap={1} flexShrink={0} role="list" aria-label="Proteins with this GO term">
            {term.proteins.map((protein) => (
              <Tooltip.Root key={protein} openDelay={200}>
                <Tooltip.Trigger asChild>
                  <Box
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    bg={getProteinColor(protein, allProteins)}
                    color="white"
                    fontSize="2xs"
                    fontWeight="medium"
                    whiteSpace="nowrap"
                    role="listitem"
                    aria-label={`Present in protein ${protein}`}
                  >
                    {protein}
                  </Box>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                  <Tooltip.Content>
                    <Tooltip.Arrow />
                    <Text fontSize="xs">Present in {protein}</Text>
                  </Tooltip.Content>
                </Tooltip.Positioner>
              </Tooltip.Root>
            ))}
          </HStack>
        )}
      </HStack>

      {/* Child Terms (Recursive) */}
      {hasChildren && isExpanded && (
        <Box>
          {term.children!.map((child) => (
            <GOTermNode
              key={child.id}
              term={child}
              mode={mode}
              allProteins={allProteins}
              level={level + 1}
              isExpanded={expandedTerms.has(child.id)}
              onToggleExpand={onToggleExpand}
              searchQuery={searchQuery}
              domainColor={domainColor}
              expandedTerms={expandedTerms}
            />
          ))}
        </Box>
      )}
    </Box>
  )
})

export default GOTermNode
