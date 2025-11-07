import { Box, HStack, Text } from "@chakra-ui/react"

interface FeatureLegendProps {
  featureTypes: Set<string>
}

// Feature color palette - comprehensive mapping for all UniProt feature types (must match ProteinFeatureBar)
const FEATURE_COLORS: Record<string, string> = {
  // Structural domains and regions
  Domain: "#4299e1", // Blue
  Region: "#48bb78", // Green
  "Topological domain": "#38b2ac", // Teal
  "Zinc finger": "#805ad5", // Purple
  
  // Sequence motifs and repeats
  Motif: "#9f7aea", // Purple
  Repeat: "#ed8936", // Orange
  "Compositional bias": "#d69e2e", // Yellow
  
  // Binding sites
  "Binding site": "#e53e3e", // Red
  "Active site": "#c53030", // Dark red
  "Metal binding": "#dd6b20", // Orange-red
  "Nucleotide binding": "#d53f8c", // Pink
  "DNA binding": "#b83280", // Dark pink
  "Calcium binding": "#f687b3", // Light pink
  
  // Sites and modifications
  Site: "#f56565", // Red
  "Modified residue": "#fc8181", // Light red
  "Lipidation": "#feb2b2", // Very light red
  "Glycosylation": "#fbb6ce", // Pink
  "Disulfide bond": "#ed64a6", // Magenta
  "Cross-link": "#d53f8c", // Dark pink
  
  // Membrane features
  "Transmembrane": "#319795", // Cyan
  "Intramembrane": "#2c7a7b", // Dark cyan
  
  // Signal peptides and processing
  "Signal peptide": "#38a169", // Dark green
  "Transit peptide": "#2f855a", // Darker green
  "Propeptide": "#276749", // Very dark green
  Chain: "#22543d", // Darkest green
  Peptide: "#1a365d", // Dark blue
  "Initiator methionone": "#2a4365", // Navy
  
  // Secondary structure
  Helix: "#4299e1", // Blue
  "Beta strand": "#3182ce", // Dark blue
  Turn: "#2b6cb0", // Darker blue
  Coil: "#2c5282", // Navy blue
  
  // Sequence variations
  "Sequence variant": "#a0aec0", // Light gray
  "Natural variant": "#718096", // Gray
  Mutagenesis: "#4a5568", // Dark gray
  "Sequence conflict": "#2d3748", // Very dark gray
  
  // Default
  Other: "#718096", // Gray
}

export default function FeatureLegend({ featureTypes }: FeatureLegendProps) {
  // Convert Set to sorted array for consistent display
  const sortedTypes = Array.from(featureTypes).sort()

  if (sortedTypes.length === 0) {
    return null
  }

  return (
    <Box
      mt={4}
      pt={3}
      borderTopWidth="1px"
      borderColor="gray.200"
      _dark={{ borderColor: "gray.600" }}
      role="region"
      aria-label="Feature type legend"
    >
      <Text fontSize="xs" fontWeight="semibold" mb={2} opacity={0.7} id="legend-title">
        Feature Types
      </Text>
      <HStack gap={4} flexWrap="wrap" role="list" aria-labelledby="legend-title">
        {sortedTypes.map((type) => {
          const color = FEATURE_COLORS[type] || FEATURE_COLORS.Other
          return (
            <HStack key={type} gap={2} role="listitem" aria-label={`${type} features are shown in color ${color}`}>
              <Box
                w="16px"
                h="16px"
                bg={color}
                rounded="sm"
                flexShrink={0}
                aria-hidden="true"
              />
              <Text fontSize="xs">{type}</Text>
            </HStack>
          )
        })}
      </HStack>
    </Box>
  )
}
