import { Component, type ReactNode } from 'react'
import { Box, Text, Button, Stack } from '@chakra-ui/react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary component for Cytoscape network visualization
 * Catches errors in child components and displays a fallback UI
 */
export class CytoscapeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('Cytoscape component error:', error)
    console.error('Error info:', errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <Box
          width="100%"
          height="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="gray.50"
          _dark={{ bg: "gray.900" }}
          p={4}
        >
          <Stack align="center" gap={4} maxW="md" textAlign="center">
            <Text fontSize="lg" fontWeight="semibold" color="red.600" _dark={{ color: "red.400" }}>
              Network Visualization Error
            </Text>
            <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
              An error occurred while rendering the network visualization. This could be due to invalid data or a rendering issue.
            </Text>
            {this.state.error && (
              <Text fontSize="xs" color="gray.500" _dark={{ color: "gray.500" }} fontFamily="mono">
                {this.state.error.message}
              </Text>
            )}
            <Button size="sm" onClick={this.handleReset} colorScheme="blue">
              Try Again
            </Button>
          </Stack>
        </Box>
      )
    }

    return this.props.children
  }
}
