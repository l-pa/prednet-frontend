import { Box, HStack, IconButton, Text, Tooltip, VStack } from "@chakra-ui/react"
import { LuX } from "react-icons/lu"
import type { ProteinFeature } from "./types"
import { useState } from "react"

interface ProteinFeatureBarProps {
  protein: string
  sequenceLength: number
  features: ProteinFeature[]
  onRemove: () => void
}

// Feature color palette - comprehensive mapping for all UniProt feature types
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
  "Initiator methionine": "#2a4365", // Navy
  
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

// Get color for feature type
function getFeatureColor(type: string): string {
  return FEATURE_COLORS[type] || FEATURE_COLORS.Other
}

// Calculate if text color should be light or dark based on background
function getTextColor(bgColor: string): string {
  // Simple heuristic: use white text for darker colors
  const darkColors = ["#4299e1", "#9f7aea", "#ed8936", "#f56565", "#718096"]
  return darkColors.includes(bgColor) ? "#ffffff" : "#000000"
}

export default function ProteinFeatureBar({
  protein,
  sequenceLength,
  features,
  onRemove,
}: ProteinFeatureBarProps) {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)

  // Handle edge case: very short sequences (< 10 aa)
  const isVeryShort = sequenceLength < 10
  // Handle edge case: very long sequences (> 5000 aa)
  const isVeryLong = sequenceLength > 5000
  
  // Sort features by start position to handle overlaps
  const sortedFeatures = [...features].sort((a, b) => a.start - b.start)

  // Detect overlapping features and assign them to different rows
  const featureRows: ProteinFeature[][] = []
  for (const feature of sortedFeatures) {
    let placed = false
    for (const row of featureRows) {
      // Check if this feature overlaps with any feature in this row
      const overlaps = row.some(
        (f) => !(feature.end < f.start || feature.start > f.end)
      )
      if (!overlaps) {
        row.push(feature)
        placed = true
        break
      }
    }
    if (!placed) {
      featureRows.push([feature])
    }
  }

  const hasOverlaps = featureRows.length > 1
  const barHeight = hasOverlaps ? featureRows.length * 24 : 24
  const totalHeight = barHeight + 10 // Add padding
  
  // Adjust label threshold based on sequence length
  // For very long sequences, we need wider segments to show labels
  const labelWidthThreshold = isVeryLong ? 120 : isVeryShort ? 50 : 80

  return (
    <Box role="region" aria-label={`Protein feature visualization for ${protein}`}>
      <HStack justify="space-between" mb={2}>
        <HStack gap={2}>
          <Text fontWeight="semibold" fontSize="sm" id={`protein-${protein}-label`}>
            {protein}
          </Text>
          <Text fontSize="xs" opacity={0.7} aria-label={`Sequence length: ${sequenceLength} amino acids`}>
            ({sequenceLength} aa)
          </Text>
          {isVeryShort && (
            <Tooltip.Root openDelay={200}>
              <Tooltip.Trigger asChild>
                <Text fontSize="xs" color="orange.500" cursor="help">
                  ⚠️
                </Text>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  <Text fontSize="xs">Very short sequence - visualization may be limited</Text>
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          )}
          {isVeryLong && (
            <Tooltip.Root openDelay={200}>
              <Tooltip.Trigger asChild>
                <Text fontSize="xs" color="blue.500" cursor="help">
                  ℹ️
                </Text>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  <Text fontSize="xs">Very long sequence - small features may be hard to see</Text>
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          )}
        </HStack>
        <Tooltip.Root openDelay={200}>
          <Tooltip.Trigger asChild>
            <IconButton
              size="xs"
              variant="ghost"
              onClick={onRemove}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onRemove()
                }
              }}
              aria-label={`Remove ${protein} from comparison`}
              title={`Remove ${protein} from comparison`}
            >
              <LuX />
            </IconButton>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content>
              <Tooltip.Arrow />
              <Text fontSize="xs">Remove {protein} from comparison</Text>
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>
      </HStack>

      {features.length === 0 ? (
        <Box
          h="40px"
          bg="gray.100"
          _dark={{ bg: "gray.700" }}
          rounded="md"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={1}
          role="status"
          aria-label={`${protein} has no annotated features`}
        >
          <Text fontSize="xs" opacity={0.6} fontWeight="medium">
            No features annotated
          </Text>
          <Text fontSize="2xs" opacity={0.4}>
            This protein has no domain or region annotations
          </Text>
        </Box>
      ) : (
        <Box position="relative" h={`${totalHeight}px`}>
          <svg
            width="100%"
            height={totalHeight}
            viewBox={`0 0 1000 ${totalHeight}`}
            preserveAspectRatio="none"
            style={{ display: "block" }}
            role="img"
            aria-labelledby={`protein-${protein}-label`}
            aria-describedby={`protein-${protein}-features`}
          >
            <title id={`protein-${protein}-features`}>
              {protein} has {features.length} feature{features.length !== 1 ? 's' : ''}: {features.map(f => f.description).join(', ')}
            </title>
            {/* Background bar */}
            <rect
              x="0"
              y="5"
              width="1000"
              height={barHeight}
              fill="currentColor"
              opacity="0.1"
              rx="3"
            />

            {/* Render features in rows */}
            {featureRows.map((row, rowIndex) => {
              const yOffset = 5 + rowIndex * 24
              return row.map((feature, featureIndex) => {
                // Calculate position and width as percentages
                const xPos = (feature.start / sequenceLength) * 1000
                const width =
                  ((feature.end - feature.start + 1) / sequenceLength) * 1000
                const color = getFeatureColor(feature.type)
                const textColor = getTextColor(color)

                // Determine if we should show label (segment wide enough)
                // Use dynamic threshold based on sequence length
                const showLabel = width > labelWidthThreshold

                // Create unique key
                const key = `${rowIndex}-${featureIndex}-${feature.start}-${feature.end}`

                return (
                  <g key={key} role="group" aria-label={`${feature.type}: ${feature.description}, position ${feature.start} to ${feature.end}, length ${feature.end - feature.start + 1} amino acids`}>
                    {/* Feature segment */}
                    <rect
                      x={xPos}
                      y={yOffset}
                      width={width}
                      height="20"
                      fill={color}
                      rx="2"
                      style={{ cursor: "pointer" }}
                      tabIndex={0}
                      onMouseEnter={() => setHoveredFeature(key)}
                      onMouseLeave={() => setHoveredFeature(null)}
                      onFocus={() => setHoveredFeature(key)}
                      onBlur={() => setHoveredFeature(null)}
                    />

                    {/* Feature label */}
                    {showLabel && (
                      <text
                        x={xPos + width / 2}
                        y={yOffset + 14}
                        textAnchor="middle"
                        fill={textColor}
                        fontSize="10"
                        fontWeight="500"
                        style={{
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                      >
                        {feature.description.length > 20
                          ? `${feature.description.substring(0, 17)}...`
                          : feature.description}
                      </text>
                    )}
                  </g>
                )
              })
            })}
          </svg>

          {/* Tooltips positioned absolutely over features */}
          {featureRows.map((row, rowIndex) => {
            const yOffset = 5 + rowIndex * 24
            return row.map((feature, featureIndex) => {
              const xPos = (feature.start / sequenceLength) * 100 // Convert to percentage
              const width =
                ((feature.end - feature.start + 1) / sequenceLength) * 100
              const key = `${rowIndex}-${featureIndex}-${feature.start}-${feature.end}`
              const featureLength = feature.end - feature.start + 1
              const isHovered = hoveredFeature === key

              return (
                <Tooltip.Root
                  key={`tooltip-${key}`}
                  open={isHovered}
                  openDelay={100}
                  closeDelay={100}
                  positioning={{ placement: "top" }}
                >
                  <Tooltip.Trigger asChild>
                    <Box
                      position="absolute"
                      left={`${xPos}%`}
                      top={`${yOffset}px`}
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
                          {feature.type}: {feature.description}
                        </Text>
                        <Text opacity={0.9}>
                          Position: {feature.start}-{feature.end}
                        </Text>
                        <Text opacity={0.9}>Length: {featureLength} aa</Text>
                      </VStack>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              )
            })
          })}
        </Box>
      )}
    </Box>
  )
}
