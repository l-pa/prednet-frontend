import { Box, HStack, IconButton, Stack, Text, Tooltip, VStack } from "@chakra-ui/react"
import { LuX, LuInfo } from "react-icons/lu"
import { useState } from "react"
import type { ProteinFeatureData, ProteinFeature } from "./types"

interface ProteinFeatureVisualizationProps {
  proteinData: ProteinFeatureData[]
  onRemoveProtein: (protein: string) => void
}

// Feature color palette (must match FeatureLegend)
const FEATURE_COLORS: Record<string, string> = {
  Domain: "#4299e1", // Blue
  Region: "#48bb78", // Green
  Repeat: "#ed8936", // Orange
  "Transit peptide": "#2f855a", // Darker green
  Chain: "#22543d", // Darkest green
  Other: "#718096", // Gray
}

// Feature explanations for non-biologists
const FEATURE_EXPLANATIONS: Record<string, { simple: string; example: string }> = {
  Domain: {
    simple: "A functional unit of the protein - like a specialized tool or module that performs a specific job.",
    example: "Example: A 'kinase domain' is like an enzyme's workshop where it adds chemical tags to other molecules.",
  },
  Region: {
    simple: "A meaningful section of the protein with a specific characteristic or role.",
    example: "Example: A 'disordered region' is a flexible part that can change shape, or a 'binding region' where the protein connects to other molecules.",
  },
  Repeat: {
    simple: "A pattern that repeats multiple times in the protein sequence - like a recurring motif in music.",
    example: "Example: 'WD repeats' are like building blocks that stack together to form a platform for protein interactions.",
  },
  "Transit peptide": {
    simple: "An address label that tells the cell where to deliver this protein (like a shipping label).",
    example: "Example: A 'mitochondrial transit peptide' directs the protein to the cell's power plants (mitochondria), then gets removed.",
  },
  Chain: {
    simple: "The mature, functional form of the protein after processing - like the final product after assembly.",
    example: "Example: Many proteins start as longer chains and get trimmed down to their active 'Chain' form.",
  },
}

function getFeatureColor(type: string): string {
  return FEATURE_COLORS[type] || FEATURE_COLORS.Other
}

function getFeatureExplanation(type: string): { simple: string; example: string } {
  return FEATURE_EXPLANATIONS[type] || {
    simple: "A structural or functional feature of the protein.",
    example: "This feature has been annotated in the UniProt database.",
  }
}

export default function ProteinFeatureVisualization({
  proteinData,
  onRemoveProtein,
}: ProteinFeatureVisualizationProps) {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)
  
  // Filter out proteins with errors for the main visualization
  const validProteins = proteinData.filter(p => !p.error && p.sequence_length)
  const errorProteins = proteinData.filter(p => p.error)
  const noDataProteins = proteinData.filter(p => !p.error && !p.sequence_length)
  
  // Find the maximum sequence length for scaling
  const maxLength = Math.max(...validProteins.map(p => p.sequence_length || 0), 1)
  
  // Define standard feature types to always show (in priority order)
  const STANDARD_FEATURE_TYPES = ["Domain", "Repeat", "Region", "Transit peptide", "Chain"]
  
  // Collect all unique feature types across all proteins
  const foundFeatureTypes = new Set<string>()
  validProteins.forEach(protein => {
    protein.features.forEach(feature => {
      foundFeatureTypes.add(feature.type)
    })
  })
  
  // Combine standard types with any additional types found, maintaining order
  const allFeatureTypes = new Set<string>([
    ...STANDARD_FEATURE_TYPES,
    ...Array.from(foundFeatureTypes).filter(type => !STANDARD_FEATURE_TYPES.includes(type))
  ])
  const sortedFeatureTypes = Array.from(allFeatureTypes)
  
  return (
    <Box
      minW="600px"
      maxH="500px"
      overflowY="auto"
      overflowX="auto"
      p={2}
      rounded="md"
      bg="gray.50"
      _dark={{ bg: "gray.800" }}
      role="region"
      aria-label="Protein feature comparison visualization"
    >
      <Stack gap={4}>
        {/* Protein headers with remove buttons */}
        <Box
          p={3}
          borderWidth="1px"
          rounded="md"
          bg="white"
          _dark={{ bg: "gray.700" }}
        >
          <VStack align="stretch" gap={2}>
            {validProteins.map((protein) => (
              <HStack key={protein.protein} justify="space-between">
                <HStack gap={2}>
                  <Text fontWeight="semibold" fontSize="sm">
                    {protein.protein}
                  </Text>
                  <Tooltip.Root openDelay={300}>
                    <Tooltip.Trigger asChild>
                      <Text fontSize="xs" opacity={0.7} cursor="help">
                        ({protein.sequence_length} aa)
                      </Text>
                    </Tooltip.Trigger>
                    <Tooltip.Positioner>
                      <Tooltip.Content>
                        <Tooltip.Arrow />
                        <VStack align="start" gap={1} fontSize="xs">
                          <Text fontWeight="semibold">Protein Length</Text>
                          <Text>
                            This protein is {protein.sequence_length} amino acids long.
                          </Text>
                          <Text opacity={0.8} fontStyle="italic">
                            Amino acids (aa) are the building blocks of proteins - like letters in a word.
                          </Text>
                        </VStack>
                      </Tooltip.Content>
                    </Tooltip.Positioner>
                  </Tooltip.Root>
                </HStack>
                <Tooltip.Root openDelay={200}>
                  <Tooltip.Trigger asChild>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      onClick={() => onRemoveProtein(protein.protein)}
                      aria-label={`Remove ${protein.protein} from comparison`}
                    >
                      <LuX />
                    </IconButton>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content>
                      <Tooltip.Arrow />
                      <Text fontSize="xs">Remove {protein.protein}</Text>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              </HStack>
            ))}
          </VStack>
        </Box>

        {/* Feature type rows - each feature type gets its own section */}
        {sortedFeatureTypes.map((featureType) => {
          const explanation = getFeatureExplanation(featureType)
          
          return (
            <Box
              key={featureType}
              p={3}
              borderWidth="1px"
              rounded="md"
              bg="white"
              _dark={{ bg: "gray.700" }}
              role="article"
              aria-label={`${featureType} features comparison`}
            >
              <HStack gap={2} mb={3}>
                <Text fontWeight="semibold" fontSize="sm" color={getFeatureColor(featureType)}>
                  {featureType}
                </Text>
                <Tooltip.Root openDelay={200}>
                  <Tooltip.Trigger asChild>
                    <Box
                      as="button"
                      color="gray.500"
                      _hover={{ color: "gray.700" }}
                      _dark={{ color: "gray.400", _hover: { color: "gray.200" } }}
                      cursor="help"
                      display="inline-flex"
                      alignItems="center"
                      aria-label={`Learn about ${featureType}`}
                    >
                      <LuInfo size={14} />
                    </Box>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content maxW="320px">
                      <Tooltip.Arrow />
                      <VStack align="start" gap={2} fontSize="xs">
                        <Text fontWeight="semibold" color={getFeatureColor(featureType)}>
                          What is a {featureType}?
                        </Text>
                        <Text>{explanation.simple}</Text>
                        <Text opacity={0.8} fontStyle="italic">
                          {explanation.example}
                        </Text>
                      </VStack>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              </HStack>
            
            <VStack align="stretch" gap={2}>
              {validProteins.map((protein) => {
                // Get features of this type for this protein
                const featuresOfType = protein.features.filter(f => f.type === featureType)
                const sequenceLength = protein.sequence_length!
                
                return (
                  <Box key={protein.protein} position="relative">
                    <HStack gap={2} mb={1}>
                      <Text fontSize="xs" opacity={0.7} minW="80px">
                        {protein.protein}
                      </Text>
                    </HStack>
                    
                    {featuresOfType.length === 0 ? (
                      <Box
                        h="24px"
                        bg="gray.100"
                        _dark={{ bg: "gray.600" }}
                        rounded="sm"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text fontSize="2xs" opacity={0.5}>
                          No {featureType} features
                        </Text>
                      </Box>
                    ) : (
                      <Box position="relative" h="24px">
                        <svg
                          width="100%"
                          height="24"
                          viewBox="0 0 1000 24"
                          preserveAspectRatio="none"
                          style={{ display: "block" }}
                        >
                          {/* Background bar showing full sequence length */}
                          <rect
                            x="0"
                            y="2"
                            width={(sequenceLength / maxLength) * 1000}
                            height="20"
                            fill="currentColor"
                            opacity="0.1"
                            rx="2"
                          />
                          
                          {/* Render features */}
                          {featuresOfType.map((feature, idx) => {
                            const xPos = (feature.start / maxLength) * 1000
                            const width = ((feature.end - feature.start + 1) / maxLength) * 1000
                            const color = getFeatureColor(feature.type)
                            const key = `${protein.protein}-${feature.type}-${idx}`
                            
                            return (
                              <g
                                key={key}
                                onMouseEnter={() => setHoveredFeature(key)}
                                onMouseLeave={() => setHoveredFeature(null)}
                              >
                                <rect
                                  x={xPos}
                                  y="2"
                                  width={width}
                                  height="20"
                                  fill={color}
                                  rx="2"
                                  style={{ cursor: "pointer" }}
                                />
                                {width > 80 && (
                                  <text
                                    x={xPos + width / 2}
                                    y="16"
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="9"
                                    fontWeight="500"
                                    style={{ pointerEvents: "none" }}
                                  >
                                    {feature.description.length > 15
                                      ? `${feature.description.substring(0, 12)}...`
                                      : feature.description}
                                  </text>
                                )}
                              </g>
                            )
                          })}
                        </svg>
                        
                        {/* Tooltips */}
                        {featuresOfType.map((feature, idx) => {
                          const xPos = (feature.start / maxLength) * 100
                          const width = ((feature.end - feature.start + 1) / maxLength) * 100
                          const key = `${protein.protein}-${feature.type}-${idx}`
                          const isHovered = hoveredFeature === key
                          
                          return (
                            <Tooltip.Root
                              key={`tooltip-${key}`}
                              open={isHovered}
                              openDelay={100}
                              closeDelay={100}
                            >
                              <Tooltip.Trigger asChild>
                                <Box
                                  position="absolute"
                                  left={`${xPos}%`}
                                  top="2px"
                                  width={`${width}%`}
                                  height="20px"
                                  style={{ pointerEvents: "none" }}
                                />
                              </Tooltip.Trigger>
                              <Tooltip.Positioner>
                                <Tooltip.Content>
                                  <Tooltip.Arrow />
                                  <VStack align="start" gap={0.5} fontSize="xs">
                                    <Text fontWeight="semibold">
                                      {feature.description}
                                    </Text>
                                    <Text opacity={0.9}>
                                      Position: {feature.start}-{feature.end}
                                    </Text>
                                    <Text opacity={0.9}>
                                      Length: {feature.end - feature.start + 1} aa
                                    </Text>
                                  </VStack>
                                </Tooltip.Content>
                              </Tooltip.Positioner>
                            </Tooltip.Root>
                          )
                        })}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </VStack>
          </Box>
        )})}
        
        {/* Render proteins without sequence data */}
        {noDataProteins.map((protein) => (
          <Box
            key={protein.protein}
            p={3}
            borderWidth="1px"
            borderColor="yellow.300"
            rounded="md"
            bg="yellow.50"
            _dark={{ bg: "yellow.900", borderColor: "yellow.700" }}
            role="alert"
          >
            <HStack justify="space-between" mb={1}>
              <Text fontWeight="semibold" fontSize="sm">
                {protein.protein}
              </Text>
              <IconButton
                size="xs"
                variant="ghost"
                onClick={() => onRemoveProtein(protein.protein)}
                aria-label={`Remove ${protein.protein}`}
              >
                <LuX />
              </IconButton>
            </HStack>
            <Text fontSize="xs" color="yellow.700" _dark={{ color: "yellow.300" }}>
              No sequence data available
            </Text>
          </Box>
        ))}
        
        {/* Render proteins with errors */}
        {errorProteins.map((protein) => (
          <Box
            key={protein.protein}
            p={3}
            borderWidth="1px"
            borderColor="red.300"
            rounded="md"
            bg="red.50"
            _dark={{ bg: "red.900", borderColor: "red.700" }}
            role="alert"
          >
            <HStack justify="space-between" mb={1}>
              <Text fontWeight="semibold" fontSize="sm">
                {protein.protein}
              </Text>
              <IconButton
                size="xs"
                variant="ghost"
                onClick={() => onRemoveProtein(protein.protein)}
                aria-label={`Remove ${protein.protein}`}
              >
                <LuX />
              </IconButton>
            </HStack>
            <Text fontSize="xs" color="red.600" _dark={{ color: "red.300" }}>
              {protein.error}
            </Text>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}
