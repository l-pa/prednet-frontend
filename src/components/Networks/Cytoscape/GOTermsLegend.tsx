import { memo } from "react"
import { Box, HStack, Stack, Text } from "@chakra-ui/react"
import type { ComparisonMode } from "@/utils/goTermsUtils"

interface GOTermsLegendProps {
  proteins: string[]
  mode: ComparisonMode
}

// Protein badge colors - consistent with GOTermNode
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

const GOTermsLegend = memo(function GOTermsLegend({ proteins, mode }: GOTermsLegendProps) {
  return (
    <Box
      p={3}
      bg="gray.50"
      _dark={{ bg: "gray.800", borderColor: "gray.700" }}
      borderRadius="md"
      borderWidth="1px"
      borderColor="gray.200"
      role="region"
      aria-labelledby="go-legend-title"
      aria-label="Legend explaining protein colors and comparison modes"
    >
      <Stack gap={3}>
        {/* Protein Colors */}
        <Box>
          <Text 
            id="go-legend-proteins"
            fontSize="xs" 
            fontWeight="semibold" 
            mb={2} 
            opacity={0.7}
          >
            Proteins
          </Text>
          <HStack 
            gap={3} 
            flexWrap="wrap"
            role="list"
            aria-labelledby="go-legend-proteins"
          >
            {proteins.map((protein) => (
              <HStack key={protein} gap={2} role="listitem">
                <Box
                  w="12px"
                  h="12px"
                  borderRadius="full"
                  bg={getProteinColor(protein, proteins)}
                  flexShrink={0}
                  aria-hidden="true"
                />
                <Text fontSize="xs">{protein}</Text>
              </HStack>
            ))}
          </HStack>
        </Box>

        {/* Mode Explanation */}
        <Box>
          <Text 
            id="go-legend-title"
            fontSize="xs" 
            fontWeight="semibold" 
            mb={2} 
            opacity={0.7}
          >
            Comparison Mode
          </Text>
          {mode === "intersection" ? (
            <Text fontSize="xs" opacity={0.8}>
              <Text as="span" fontWeight="semibold">
                Intersection:
              </Text>{" "}
              Showing only GO terms that are shared by all selected proteins.
            </Text>
          ) : (
            <Stack gap={1}>
              <Text fontSize="xs" opacity={0.8}>
                <Text as="span" fontWeight="semibold">
                  Union:
                </Text>{" "}
                Showing all GO terms present in any of the selected proteins.
              </Text>
              <Text fontSize="xs" opacity={0.7} fontStyle="italic">
                Colored badges indicate which proteins have each term. Terms shared by all proteins are highlighted in bold.
              </Text>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  )
})

export default GOTermsLegend
