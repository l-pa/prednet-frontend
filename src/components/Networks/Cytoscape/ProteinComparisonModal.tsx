import { Box, Button, Spinner, Stack, Text } from "@chakra-ui/react"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProteinFeatures } from "@/hooks/useProteinFeatures"
import ProteinFeatureVisualization from "./ProteinFeatureVisualization"
import FeatureLegend from "./FeatureLegend"

interface ProteinComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  selectedProteins: string[]
  networkName: string
  onRemoveProtein: (protein: string) => void
}

export default function ProteinComparisonModal({
  isOpen,
  onClose,
  selectedProteins,
  networkName,
  onRemoveProtein,
}: ProteinComparisonModalProps) {
  // Use the custom hook to fetch protein features
  const { data, isLoading, error, refetch } = useProteinFeatures({
    networkName,
    proteins: selectedProteins,
    enabled: isOpen && selectedProteins.length > 0,
  })

  const proteinData = data?.proteins || null
  const loading = isLoading

  const handleRetry = () => {
    refetch()
  }

  // Count valid proteins (those with data and no errors)
  const validProteinCount = proteinData?.filter(p => !p.error && p.sequence_length).length || 0
  const hasPartialFailures = proteinData && proteinData.some(p => p.error) && validProteinCount > 0
  
  // Format error message
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null
  
  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open) {
          onClose()
        }
      }}
      size={{ base: "full", md: "xl" }}
      placement="center"
      role="dialog"
      aria-labelledby="protein-comparison-title"
      aria-describedby="protein-comparison-description"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle id="protein-comparison-title">Protein Feature Comparison</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {/* Hidden description for screen readers */}
          <Box id="protein-comparison-description" position="absolute" left="-10000px" aria-hidden="false">
            Comparing protein sequence features for {selectedProteins.length} selected proteins. 
            Use Tab to navigate between proteins and features. Press Escape to close.
          </Box>
          {/* Loading state */}
          {loading && (
            <Stack gap={4} align="center" justify="center" minH="200px" role="status" aria-live="polite" aria-busy="true">
              <Spinner size="lg" aria-label="Loading protein features" />
              <Text fontSize="sm" opacity={0.8}>
                Loading protein features...
              </Text>
              <Text fontSize="xs" opacity={0.6}>
                Fetching data for {selectedProteins.length} protein{selectedProteins.length !== 1 ? "s" : ""}
              </Text>
            </Stack>
          )}

          {/* Error state (complete failure) */}
          {errorMessage && !loading && !proteinData && (
            <Stack gap={4} align="center" justify="center" minH="200px" role="alert" aria-live="polite">
              <Text color="red.500" fontSize="sm" textAlign="center" maxW="400px">
                {errorMessage}
              </Text>
              <Button 
                size="sm" 
                onClick={handleRetry}
                aria-label="Retry loading protein features"
              >
                Retry
              </Button>
            </Stack>
          )}

          {/* Partial failure warning */}
          {hasPartialFailures && !loading && (
            <Box 
              mb={3} 
              p={3} 
              bg="orange.50" 
              _dark={{ bg: "orange.900", borderColor: "orange.700" }} 
              borderRadius="md" 
              borderWidth="1px" 
              borderColor="orange.200"
              role="alert"
              aria-live="polite"
            >
              <Text fontSize="sm" color="orange.700" _dark={{ color: "orange.200" }}>
                ⚠️ Some proteins could not be loaded. Showing {validProteinCount} of {proteinData.length} proteins.
              </Text>
            </Box>
          )}

          {/* Success state with data */}
          {!loading && proteinData && validProteinCount > 0 && (
            <Box>
              <Text fontSize="sm" mb={4} opacity={0.8} role="status" aria-live="polite">
                Comparing {validProteinCount} protein{validProteinCount !== 1 ? "s" : ""}
                {validProteinCount < selectedProteins.length && ` (${selectedProteins.length - validProteinCount} failed to load)`}
              </Text>
              
              <ProteinFeatureVisualization
                proteinData={proteinData}
                onRemoveProtein={onRemoveProtein}
              />
              
              {/* Only show legend if there are features to display */}
              {proteinData.some(p => p.features && p.features.length > 0) && (
                <FeatureLegend
                  featureTypes={
                    new Set(
                      proteinData.flatMap((p) =>
                        p.features.map((f) => f.type)
                      )
                    )
                  }
                />
              )}
            </Box>
          )}

          {/* Complete failure state (all proteins failed) */}
          {!loading && proteinData && validProteinCount === 0 && proteinData.length > 0 && (
            <Stack gap={4} align="center" justify="center" minH="200px" role="alert" aria-live="polite">
              <Text fontSize="sm" opacity={0.7} textAlign="center">
                Unable to load data for any of the selected proteins.
              </Text>
              <Text fontSize="xs" opacity={0.6} textAlign="center" maxW="400px">
                This may be due to invalid protein identifiers or temporary database issues.
              </Text>
              <Button 
                size="sm" 
                onClick={handleRetry}
                aria-label="Retry loading protein features"
              >
                Retry
              </Button>
            </Stack>
          )}

          {/* Empty selection state */}
          {!loading && !errorMessage && !proteinData && selectedProteins.length === 0 && (
            <Stack gap={4} align="center" justify="center" minH="200px">
              <Text fontSize="sm" opacity={0.7}>
                No proteins selected for comparison
              </Text>
              <Text fontSize="xs" opacity={0.5} textAlign="center" maxW="300px">
                Select at least 2 proteins from the sidebar to compare their features
              </Text>
            </Stack>
          )}
        </DialogBody>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}
