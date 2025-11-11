import { useMemo, memo } from "react"
import { Stack } from "@chakra-ui/react"
import type { GOTermWithProteins, ComparisonMode } from "@/utils/goTermsUtils"
import { buildGOTermTree } from "@/utils/goTermsUtils"
import GOTermNode from "./GOTermNode"

interface GOTermTreeProps {
  terms: GOTermWithProteins[]
  mode: ComparisonMode
  allProteins: string[]
  expandedTerms: Set<string>
  onToggleExpand: (termId: string) => void
  searchQuery: string
  domainColor: string
}

const GOTermTree = memo(function GOTermTree({
  terms,
  mode,
  allProteins,
  expandedTerms,
  onToggleExpand,
  searchQuery,
  domainColor,
}: GOTermTreeProps) {
  // Build tree structure from flat list (memoized)
  const tree = useMemo(() => buildGOTermTree(terms), [terms])

  if (tree.length === 0) {
    return null
  }

  return (
    <Stack
      gap={1}
      role="tree"
      aria-label={`GO terms hierarchy with ${terms.length} term${terms.length !== 1 ? "s" : ""}`}
      aria-multiselectable="false"
    >
      {tree.map((term) => (
        <GOTermNode
          key={term.id}
          term={term}
          mode={mode}
          allProteins={allProteins}
          level={0}
          isExpanded={expandedTerms.has(term.id)}
          onToggleExpand={onToggleExpand}
          searchQuery={searchQuery}
          domainColor={domainColor}
          expandedTerms={expandedTerms}
        />
      ))}
    </Stack>
  )
})

export default GOTermTree
