import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { FiDownload, FiGlobe } from "react-icons/fi"

import useCustomToast from "@/hooks/useCustomToast"
import { OpenAPI } from "@/client"
import CytoscapeNetwork from "@/components/Networks/CytoscapeNetwork"

// Types for the networks API
interface NetworkInfo {
  name: string
  file_count: number
}

interface CytoscapeNode {
  data: Record<string, any>
}

interface CytoscapeEdge {
  data: Record<string, any>
}

interface CytoscapeGraph {
  nodes: CytoscapeNode[]
  edges: CytoscapeEdge[]
}

const NetworksPage = () => {
  const [networks, setNetworks] = useState<NetworkInfo[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [gdfFiles, setGdfFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<CytoscapeGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [loadingGraph, setLoadingGraph] = useState(false)
  const { showErrorToast } = useCustomToast()

  // Fetch networks
  const fetchNetworks = async () => {
    setLoading(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const fullUrl = `${baseUrl}/api/v1/networks/`
      console.log("Fetching networks from:", fullUrl)
      const response = await fetch(fullUrl)
      console.log("Response status:", response.status, response.statusText)
      if (!response.ok) {
        console.error("Network response not ok:", response.status, response.statusText)
        throw new Error(`Failed to fetch networks: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      console.log("Networks data received:", data)
      setNetworks(data)
    } catch (error) {
      console.error("Network fetch error:", error)
      showErrorToast("Failed to fetch networks")
    } finally {
      setLoading(false)
    }
  }

  // Fetch GDF files for a network
  const fetchGdfFiles = async (networkName: string) => {
    setLoadingFiles(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const response = await fetch(`${baseUrl}/api/v1/networks/${networkName}/files`)
      if (!response.ok) throw new Error("Failed to fetch GDF files")
      const data = await response.json()
      setGdfFiles(data)
      setSelectedNetwork(networkName)
    } catch (error) {
      showErrorToast("Failed to fetch GDF files")
    } finally {
      setLoadingFiles(false)
    }
  }

  // Fetch and parse GDF file
  const fetchGdfFile = async (networkName: string, filename: string) => {
    setLoadingGraph(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const url = `${baseUrl}/api/v1/networks/${networkName}/gdf/${filename}`
      console.log("Fetching GDF file from:", url)
      const response = await fetch(url)
      console.log("GDF response status:", response.status, response.statusText)
      if (!response.ok) {
        const errorText = await response.text()
        console.error("GDF fetch error:", errorText)
        throw new Error(`Failed to fetch GDF file: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      console.log("Received graph data:", data)
      console.log("Nodes count:", data.nodes?.length)
      console.log("Edges count:", data.edges?.length)
      if (data.nodes && data.nodes.length > 0) {
        console.log("Sample node:", data.nodes[0])
      }
      if (data.edges && data.edges.length > 0) {
        console.log("Sample edge:", data.edges[0])
      }
      setGraphData(data)
      setSelectedFile(filename)
    } catch (error) {
      console.error("GDF fetch error:", error)
      showErrorToast(`Failed to fetch GDF file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoadingGraph(false)
    }
  }

  // Load networks on component mount
  useEffect(() => {
    fetchNetworks()
  }, [])

  return (
    <Container maxW="full">
      <Box pt={4}>
        <Heading size="lg" mb={6}>
          <FiGlobe style={{ display: "inline", marginRight: "8px" }} />
          Networks & GDF Files
        </Heading>

        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
          {/* Networks Panel */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Available Networks</Heading>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <Flex justify="center" py={8}>
                  <Spinner />
                </Flex>
              ) : (
                <VStack align="stretch" gap={2}>
                  {networks.map((network) => (
                    <Button
                      key={network.name}
                      variant={selectedNetwork === network.name ? "solid" : "outline"}
                      onClick={() => fetchGdfFiles(network.name)}
                      justifyContent="space-between"
                      size="sm"
                    >
                      <Text>{network.name}</Text>
                      <Text fontSize="xs" opacity={0.7}>
                        {network.file_count} GDF files
                      </Text>
                    </Button>
                  ))}
                </VStack>
              )}
            </Card.Body>
          </Card.Root>

          {/* GDF Files Panel */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">
                GDF Files
                {selectedNetwork && ` - ${selectedNetwork}`}
              </Heading>
            </Card.Header>
            <Card.Body>
              {loadingFiles ? (
                <Flex justify="center" py={8}>
                  <Spinner />
                </Flex>
              ) : selectedNetwork ? (
                <VStack align="stretch" gap={2}>
                  {gdfFiles.map((filename) => (
                    <Button
                      key={filename}
                      variant={selectedFile === filename ? "solid" : "outline"}
                      onClick={() => fetchGdfFile(selectedNetwork, filename)}
                      justifyContent="space-between"
                      size="sm"
                    >
                      <Text fontSize="sm" truncate>
                        {filename}
                      </Text>
                      <FiDownload />
                    </Button>
                  ))}
                </VStack>
              ) : (
                <Text color="gray.500" textAlign="center" py={8}>
                  Select a network to view GDF files
                </Text>
              )}
            </Card.Body>
          </Card.Root>
        </Grid>

        {/* Network Visualization */}
        {graphData && (
          <Card.Root mt={6}>
            <Card.Header>
              <Heading size="md">
                Network Visualization
                {selectedFile && ` - ${selectedFile}`}
              </Heading>
            </Card.Header>
            <Card.Body p={0}>
              {loadingGraph ? (
                <Flex justify="center" py={8}>
                  <Spinner />
                </Flex>
              ) : (
                <CytoscapeNetwork data={graphData} height="600px" />
              )}
            </Card.Body>
          </Card.Root>
        )}
      </Box>
    </Container>
  )
}

export const Route = createFileRoute("/_layout/networks")({
  component: NetworksPage,
})

export default NetworksPage