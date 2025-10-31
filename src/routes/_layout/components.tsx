import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { FiGrid, FiGlobe, FiEye, FiChevronUp, FiChevronDown } from "react-icons/fi"

import useCustomToast from "@/hooks/useCustomToast"
import { OpenAPI } from "@/client"
import CytoscapeNetwork from "@/components/Networks/CytoscapeNetwork"

interface NetworkInfo {
  name: string
  file_count: number
}

interface ComponentSummary {
  filename: string
  component_id: number
  size: number
  edges: number
  proteins_count: number
}

interface PagedComponents {
  items: ComponentSummary[]
  total: number
  page: number
  size: number
}

const ComponentsPage = () => {
  const [networks, setNetworks] = useState<NetworkInfo[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [files, setFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | "">("")
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedQuery, setAppliedQuery] = useState("")
  const [components, setComponents] = useState<PagedComponents | null>(null)
  const [page, setPage] = useState(1)
  const [size] = useState(50)
  const [loadingNetworks, setLoadingNetworks] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [loadingComponents, setLoadingComponents] = useState(false)
  const [panelsCollapsed, setPanelsCollapsed] = useState(false)

  const [subgraph, setSubgraph] = useState<null | { nodes: { data: Record<string, any> }[]; edges: { data: Record<string, any> }[] }>(null)
  const [subgraphOpen, setSubgraphOpen] = useState(false)
  const [subgraphNetworkName, setSubgraphNetworkName] = useState<string | null>(null)
  const [subgraphFilename, setSubgraphFilename] = useState<string | null>(null)

  const { showErrorToast } = useCustomToast()

  const fetchNetworks = async () => {
    setLoadingNetworks(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const response = await fetch(`${baseUrl}/api/v1/networks/`)
      if (!response.ok) throw new Error("Failed to fetch networks")
      const data = await response.json()
      setNetworks(data)
    } catch {
      showErrorToast("Failed to fetch networks")
    } finally {
      setLoadingNetworks(false)
    }
  }

  const fetchFiles = async (networkName: string) => {
    setLoadingFiles(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const response = await fetch(`${baseUrl}/api/v1/networks/${networkName}/files`)
      if (!response.ok) throw new Error("Failed to fetch files")
      const data = await response.json()
      setFiles(data)
      setSelectedNetwork(networkName)
      setSelectedFile("")
      setComponents(null)
      setPage(1)
    } catch {
      showErrorToast("Failed to fetch files")
    } finally {
      setLoadingFiles(false)
    }
  }

  const fetchComponents = async (nextPage = 1, q?: string) => {
    if (!selectedNetwork) return
    setLoadingComponents(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const query = new URLSearchParams({ page: String(nextPage), size: String(size) })
      if (selectedFile) query.set("file", selectedFile)
      // honor global naming mode
      try {
        const raw = localStorage.getItem("network.style")
        const parsed = raw ? JSON.parse(raw) : {}
        const mode = parsed?.nameMode === 'gene' ? 'gene' : 'systematic'
        query.set('name_mode', mode)
      } catch {/* ignore */}
      if (q && q.trim()) query.set("q", q.trim())
      const url = `${baseUrl}/api/v1/proteins/${selectedNetwork}/components/search?${query.toString()}`
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch components")
      const data: PagedComponents = await response.json()
      setComponents(data)
      setPage(nextPage)
    } catch {
      showErrorToast("Failed to fetch components")
    } finally {
      setLoadingComponents(false)
    }
  }

  const onSearch = () => {
    setAppliedQuery(searchQuery)
    setPage(1)
    fetchComponents(1, searchQuery)
  }

  const onClear = () => {
    setSearchQuery("")
    setAppliedQuery("")
    setPage(1)
    fetchComponents(1, "")
  }

  useEffect(() => {
    fetchNetworks()
  }, [])

  return (
    <Container maxW="full">
      <Box pt={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">
            <FiGrid style={{ display: "inline", marginRight: 8 }} />
            Components by ID
          </Heading>
          <HStack gap={2}>
            <Button size="xs" variant="outline" onClick={() => setPanelsCollapsed(true)} disabled={panelsCollapsed}>
              <HStack gap={1}><FiChevronUp /><span>Hide selection</span></HStack>
            </Button>
            <Button size="xs" variant="outline" onClick={() => { setPanelsCollapsed(false); try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {} }} disabled={!panelsCollapsed}>
              <HStack gap={1}><FiChevronDown /><span>Show selection</span></HStack>
            </Button>
          </HStack>
        </Flex>

        {!panelsCollapsed && (
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
            <Card.Root>
              <Card.Header>
                <Heading size="md"><FiGlobe style={{ display: 'inline', marginRight: 8 }} />Available Networks</Heading>
              </Card.Header>
              <Card.Body>
                {loadingNetworks ? (
                  <Flex justify="center" py={8}><Spinner /></Flex>
                ) : (
                  <VStack align="stretch" gap={2}>
                    {networks.map((n) => (
                      <Button key={n.name} variant={selectedNetwork === n.name ? 'solid' : 'outline'} onClick={() => fetchFiles(n.name)} justifyContent="space-between" size="sm">
                        <Text>{n.name}</Text>
                        <Text fontSize="xs" opacity={0.7}>{n.file_count} GDF files</Text>
                      </Button>
                    ))}
                  </VStack>
                )}
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Header>
                <Heading size="md">GDF Files{selectedNetwork ? ` - ${selectedNetwork}` : ''}</Heading>
              </Card.Header>
              <Card.Body>
                {loadingFiles ? (
                  <Flex justify="center" py={8}><Spinner /></Flex>
                ) : selectedNetwork ? (
                  <VStack align="stretch" gap={2}>
                    <Button key="__all__" variant={selectedFile === '' ? 'solid' : 'outline'} onClick={() => { setSelectedFile(''); setPage(1); setComponents(null) }} size="sm" justifyContent="space-between">
                      <Text>(All files)</Text>
                      <Text fontSize="xs" opacity={0.7}>no filter</Text>
                    </Button>
                    {files.map((f) => (
                      <Button key={f} variant={selectedFile === f ? 'solid' : 'outline'} onClick={() => { setSelectedFile(f); setPage(1); setComponents(null) }} size="sm" justifyContent="space-between">
                        <Text fontSize="sm" truncate>{f}</Text>
                      </Button>
                    ))}
                  </VStack>
                ) : (
                  <Text color="gray.500" textAlign="center" py={8}>Select a network to view files</Text>
                )}
              </Card.Body>
            </Card.Root>
          </Grid>
        )}

        {/* Search & Results */}
        <Card.Root mt={6}>
          <Card.Header>
            <Flex justify="space-between" align="center" w="full" gap={4}>
              <Heading size="md">Components{selectedNetwork ? ` - ${selectedNetwork}` : ''}</Heading>
              <HStack gap={2} flex="1">
                <Input
                  placeholder="Search by component ID (number or digits)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSearch() } }}
                  size="sm"
                  disabled={!selectedNetwork}
                />
                <Button size="sm" onClick={onSearch} variant="outline" disabled={!selectedNetwork}>Search</Button>
                <Button size="sm" onClick={onClear} variant="ghost" disabled={!selectedNetwork}>Clear</Button>
                <Button size="sm" onClick={() => fetchComponents(1, appliedQuery)} variant="solid" disabled={!selectedNetwork}>Refresh</Button>
              </HStack>
              {components && (
                <Text fontSize="sm" opacity={0.7}>{components.total} components</Text>
              )}
            </Flex>
          </Card.Header>
          <Card.Body>
            {!selectedNetwork ? (
              <Text color="gray.500" textAlign="center" py={8}>Select a network to search components</Text>
            ) : loadingComponents ? (
              <Flex justify="center" py={8}><Spinner /></Flex>
            ) : components && components.items.length > 0 ? (
              <VStack align="stretch" gap={2}>
                {components.items.map((it) => (
                  <Flex key={`${it.filename}-${it.component_id}`} px={3} py={2} borderWidth="1px" borderRadius="md" align="center" justify="space-between">
                    <VStack align="start" gap={0}>
                      <Text fontWeight={600}>
                        {it.filename} · ID {it.component_id}
                      </Text>
                      <Text fontSize="xs" opacity={0.7}>
                        size {it.size} · edges {it.edges} · proteins {it.proteins_count}
                      </Text>
                    </VStack>
                    <Button size="xs" onClick={async () => {
                      try {
                        const baseUrl = OpenAPI.BASE || 'http://localhost'
                        const nameMode = (() => { try { const raw = localStorage.getItem('network.style'); const parsed = raw ? JSON.parse(raw) : {}; return parsed?.nameMode === 'gene' ? 'gene' : 'systematic' } catch { return 'systematic' } })()
                        const resp = await fetch(`${baseUrl}/api/v1/proteins/${selectedNetwork}/components/${encodeURIComponent(it.filename)}/${it.component_id}?name_mode=${nameMode}`)
                        if (!resp.ok) throw new Error('Failed to fetch subgraph')
                        const data = await resp.json()
                        setSubgraph(data)
                        setSubgraphOpen(true)
                        setSubgraphNetworkName(selectedNetwork)
                        setSubgraphFilename(it.filename)
                      } catch {
                        showErrorToast('Failed to fetch subgraph')
                      }
                    }}>
                      <HStack gap={1}><FiEye /><span>View</span></HStack>
                    </Button>
                  </Flex>
                ))}

                {/* Pagination */}
                <HStack justify="space-between" mt={2}>
                  <Text fontSize="sm" opacity={0.8}>
                    Page {components.page} of {Math.max(1, Math.ceil(components.total / components.size))}
                  </Text>
                  <HStack gap={2}>
                    <Button size="sm" variant="outline" onClick={() => fetchComponents(page - 1, appliedQuery)} disabled={page <= 1}>Prev</Button>
                    <Button size="sm" variant="outline" onClick={() => fetchComponents(page + 1, appliedQuery)} disabled={components.total <= page * components.size}>Next</Button>
                  </HStack>
                </HStack>
              </VStack>
            ) : (
              <Text fontSize="sm" opacity={0.7}>(no results)</Text>
            )}
          </Card.Body>
        </Card.Root>

        {subgraphOpen && subgraph && (
          <Card.Root mt={6}>
            <Card.Header>
              <Heading size="md">Component subgraph</Heading>
            </Card.Header>
            <Card.Body>
              <Box minH="500px">
                <CytoscapeNetwork
                  data={{ nodes: subgraph.nodes, edges: subgraph.edges }}
                  height="500px"
                  wheelSensitivity={2.5}
                  minZoom={0.1}
                  maxZoom={3}
                  disableComponentTapHighlight
                  networkName={subgraphNetworkName || undefined}
                  filename={subgraphFilename || undefined}
                />
              </Box>
            </Card.Body>
          </Card.Root>
        )}
      </Box>
    </Container>
  )
}

export const Route = createFileRoute("/_layout/components")({
  component: ComponentsPage,
})

export default ComponentsPage

