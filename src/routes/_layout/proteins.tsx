import {
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
  Stack,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { FiDatabase, FiGlobe, FiEye, FiChevronUp, FiChevronDown } from "react-icons/fi"

import useCustomToast from "@/hooks/useCustomToast"
import { OpenAPI } from "@/client"
import CytoscapeNetwork from "@/components/Networks/CytoscapeNetwork"
import ProteinDistributionList, { type ProteinDistributionItem } from "@/components/Networks/ProteinDistributionList"

interface NetworkInfo {
  name: string
  file_count: number
}

interface ProteinItem {
  protein: string
  files: string[]
  types: string[]
}

interface PagedProteins {
  items: ProteinItem[]
  total: number
  page: number
  size: number
}

const ProteinsPage = () => {
  const [networks, setNetworks] = useState<NetworkInfo[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [proteins, setProteins] = useState<PagedProteins | null>(null)
  const [page, setPage] = useState(1)
  const [size] = useState(50)
  const [loadingNetworks, setLoadingNetworks] = useState(false)
  const [loadingProteins, setLoadingProteins] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProteins, setSelectedProteins] = useState<Set<string>>(new Set())
  const [componentsLoading, setComponentsLoading] = useState(false)
  const [componentsResult, setComponentsResult] = useState<
    | null
    | {
      files: { filename: string; components: { component_id: number; size: number; proteins: string[] }[] }[]
    }
  >(null)
  const [panelsCollapsed, setPanelsCollapsed] = useState(false)
  const [subgraph, setSubgraph] = useState<null | { nodes: { data: Record<string, any> }[]; edges: { data: Record<string, any> }[] }>(null)
  const [subgraphOpen, setSubgraphOpen] = useState(false)
  const [subgraphDistribution, setSubgraphDistribution] = useState<ProteinDistributionItem[] | null>(null)
  const [proteinFilesMap, setProteinFilesMap] = useState<Record<string, string[]>>({})
  const [proteinTypesMap, setProteinTypesMap] = useState<Record<string, string[]>>({})
  const [infoProtein, setInfoProtein] = useState<string | null>(null)
  const { showErrorToast } = useCustomToast()

  const fetchNetworks = async () => {
    setLoadingNetworks(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const fullUrl = `${baseUrl}/api/v1/networks/`
      const response = await fetch(fullUrl)
      if (!response.ok) throw new Error("Failed to fetch networks")
      const data = await response.json()
      setNetworks(data)
    } catch (error) {
      showErrorToast("Failed to fetch networks")
    } finally {
      setLoadingNetworks(false)
    }
  }

  const fetchProteins = async (networkName: string, nextPage = 1, q?: string, selectedParam?: string) => {
    setLoadingProteins(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const query = new URLSearchParams({ page: String(nextPage), size: String(size) })
      // honor global naming mode
      try {
        const raw = localStorage.getItem("network.style")
        const parsed = raw ? JSON.parse(raw) : {}
        const mode = parsed?.nameMode === 'gene' ? 'gene' : 'systematic'
        query.set('name_mode', mode)
      } catch { /* ignore */ }
      if (q && q.trim()) {
        query.set("q", q.trim())
      }
      if (selectedParam && selectedParam.trim()) {
        query.set("selected", selectedParam.trim())
      }
      const url = `${baseUrl}/api/v1/proteins/${networkName}?${query.toString()}`
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch proteins")
      const data: PagedProteins = await response.json()
      setProteins(data)
      setPage(nextPage)
      // track files per protein for quick lookup in selected list
      const copy = { ...proteinFilesMap }
      for (const it of data.items) {
        copy[it.protein] = it.files
      }
      setProteinFilesMap(copy)
      const copyTypes = { ...proteinTypesMap }
      for (const it of data.items) {
        copyTypes[it.protein] = it.types
      }
      setProteinTypesMap(copyTypes)
    } catch (error) {
      showErrorToast("Failed to fetch proteins")
    } finally {
      setLoadingProteins(false)
    }
  }

  useEffect(() => {
    fetchNetworks()
  }, [])

  const onSelectNetwork = (networkName: string) => {
    setSelectedNetwork(networkName)
    setProteins(null)
    setPage(1)
    setSelectedProteins(new Set())
    setComponentsResult(null)
    fetchProteins(networkName, 1, searchQuery, Array.from(selectedProteins).join(" "))
  }

  const totalPages = proteins ? Math.max(1, Math.ceil(proteins.total / proteins.size)) : 1

  const onSearch = () => {
    if (!selectedNetwork) return
    setPage(1)
    setComponentsResult(null)
    fetchProteins(selectedNetwork, 1, searchQuery, Array.from(selectedProteins).join(" "))
  }

  const onClearSearch = () => {
    if (!selectedNetwork) {
      setSearchQuery("")
      return
    }
    setSearchQuery("")
    setPage(1)
    setSelectedProteins(new Set())
    setComponentsResult(null)
    fetchProteins(selectedNetwork, 1, "", Array.from(selectedProteins).join(" "))
  }

  const toggleProtein = (protein: string) => {
    setSelectedProteins((prev) => {
      const next = new Set(prev)
      if (next.has(protein)) next.delete(protein)
      else next.add(protein)
      return next
    })
    if (selectedNetwork) {
      const nextSelected = new Set(selectedProteins)
      if (nextSelected.has(protein)) nextSelected.delete(protein)
      else nextSelected.add(protein)
      const selectedParam = Array.from(nextSelected).join(" ")
      // When there is any selection, ignore the text search filter so that
      // the list includes all proteins that co-occur in the same components
      // with the selected protein(s).
      const q = nextSelected.size > 0 ? "" : searchQuery
      fetchProteins(selectedNetwork, 1, q, selectedParam)
    }
  }

  const fetchComponents = async () => {
    if (!selectedNetwork || selectedProteins.size === 0) return
    setComponentsLoading(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const url = `${baseUrl}/api/v1/proteins/${selectedNetwork}/components`
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proteins: Array.from(selectedProteins),
          name_mode: (() => {
            try {
              const raw = localStorage.getItem('network.style')
              const parsed = raw ? JSON.parse(raw) : {}
              return parsed?.nameMode === 'gene' ? 'gene' : 'systematic'
            } catch { return 'systematic' }
          })(),
        }),
      })
      if (!response.ok) throw new Error("Failed to fetch components")
      const data = await response.json()
      setComponentsResult(data)
    } catch (e) {
      showErrorToast("Failed to fetch components")
    } finally {
      setComponentsLoading(false)
    }
  }

  const fetchSubgraphDistribution = async (network: string, filename: string, nodeId: string, nodes: { data: Record<string, any> }[], edges: { data: Record<string, any> }[]) => {
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const nameMode = (() => {
        try { const raw = localStorage.getItem('network.style'); const parsed = raw ? JSON.parse(raw) : {}; return parsed?.nameMode === 'gene' ? 'gene' : 'systematic' } catch { return 'systematic' }
      })()
      const body = {
        node_id: nodeId,
        network,
        filename,
        name_mode: nameMode,
        graph: { nodes, edges },
      }
      const resp = await fetch(`${baseUrl}/api/v1/networks/components/by-node`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      if (!resp.ok) throw new Error('Failed to fetch distribution')
      const json = await resp.json()
      const items: ProteinDistributionItem[] = (json.protein_counts || []).map((it: any) => ({
        protein: it.protein,
        count: it.count,
        type_counts: it.type_counts,
        type_ratios: it.type_ratios,
        ratio: it.ratio,
      }))
      setSubgraphDistribution(items)
    } catch {
      setSubgraphDistribution(null)
    }
  }

  return (
    <Container maxW="full">
      <Box pt={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">
            <FiDatabase style={{ display: "inline", marginRight: "8px" }} />
            Proteins by Network
          </Heading>

          <Text fontSize="sm" opacity={0.7}>
            Search for proteins by name or type that are in the same component. When a protein is selected, the list includes all proteins that co-occur in the same components with the selected protein(s).
          </Text>

          <HStack gap={2}>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setPanelsCollapsed(true)}
              title="Hide the networks/selected panel"
              disabled={panelsCollapsed}
            >
              <HStack gap={1}>
                <FiChevronUp />
                <span>Hide selection</span>
              </HStack>
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setPanelsCollapsed(false)
                try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { }
              }}
              title="Show the networks/selected panel"
              disabled={!panelsCollapsed}
            >
              <HStack gap={1}>
                <FiChevronDown />
                <span>Show selection</span>
              </HStack>
            </Button>
          </HStack>
        </Flex>

        <Grid templateColumns={{ base: "1fr", lg: panelsCollapsed ? "1fr" : "1fr 2fr" }} gap={6} alignItems="start">
          {/* LEFT COLUMN: Networks + Selected */}
          {!panelsCollapsed && (
            <Box display="flex" flexDirection="column" gap={6}>
              <Card.Root>
                <Card.Header>
                  <Heading size="md">
                    <FiGlobe style={{ display: "inline", marginRight: 8 }} />
                    Available Networks
                  </Heading>
                </Card.Header>
                <Card.Body maxH={{ base: "240px", lg: "320px" }} overflowY="auto">
                  {loadingNetworks ? (
                    <Flex justify="center" py={8}>
                      <Spinner />
                    </Flex>
                  ) : (
                    <VStack align="stretch" gap={2}>
                      {networks.map((network) => (
                        <Button
                          key={network.name}
                          variant={selectedNetwork === network.name ? "solid" : "outline"}
                          onClick={() => onSelectNetwork(network.name)}
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

              {/* Selected Proteins Panel */}
              {selectedNetwork && (
                <Card.Root>
                  <Card.Header>
                    <Flex justify="space-between" align="center" w="full">
                      <Heading size="md">Selected proteins</Heading>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProteins(new Set())
                          setInfoProtein(null)
                        }}
                        disabled={selectedProteins.size === 0}
                      >
                        Clear selected
                      </Button>
                    </Flex>
                  </Card.Header>
                  <Card.Body>
                    {selectedProteins.size === 0 ? (
                      <Text fontSize="sm" opacity={0.7}>
                        No proteins selected
                      </Text>
                    ) : (
                      <VStack align="stretch" gap={2}>
                        {Array.from(selectedProteins).map((p) => (
                          <Flex key={p} justify="space-between" align="center" borderWidth="1px" borderRadius="md" p={2}>
                            <Text
                              _hover={{ textDecoration: "underline", cursor: "pointer" }}
                              onClick={() => setInfoProtein((prev) => (prev === p ? null : p))}
                            >
                              {p}
                            </Text>
                            <Flex gap={1} flexWrap="wrap">
                              {(proteinTypesMap[p] || []).map((t) => (
                                <Box
                                  key={`${p}-${t}`}
                                  px={2}
                                  py={0.5}
                                  borderRadius="md"
                                  fontSize="xs"
                                  bg={
                                    t === "prediction"
                                      ? "blue.50"
                                      : t === "matched_prediction"
                                        ? "cyan.50"
                                        : t === "reference"
                                          ? "green.50"
                                          : t === "matched_reference"
                                            ? "teal.50"
                                            : "gray.50"
                                  }
                                  color="fg.muted"
                                  borderWidth="1px"
                                >
                                  {t}
                                </Box>
                              ))}
                            </Flex>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                setSelectedProteins((prev) => {
                                  const next = new Set(prev)
                                  next.delete(p)
                                  return next
                                })
                              }
                            >
                              Uncheck
                            </Button>
                          </Flex>
                        ))}
                        {infoProtein && proteinFilesMap[infoProtein] && (
                          <Box borderWidth="1px" borderRadius="md" p={3}>
                            <Text fontWeight={600} mb={2}>
                              {infoProtein}
                            </Text>
                            <Text fontSize="xs" opacity={0.7} mb={1}>
                              Present in files:
                            </Text>
                            <VStack align="stretch" gap={1}>
                              {proteinFilesMap[infoProtein].map((f) => (
                                <Text key={f} fontSize="xs">
                                  {f}
                                </Text>
                              ))}
                            </VStack>
                          </Box>
                        )}
                      </VStack>
                    )}
                  </Card.Body>
                </Card.Root>
              )}
            </Box>
          )}

          {/* RIGHT COLUMN: Proteins + Components */}
          <Box display="flex" flexDirection="column" gap={6}>
            {/* Proteins Panel */}
            {!panelsCollapsed && (
              <Card.Root>
                <Card.Header>
                  <Flex justify="space-between" align="center" w="full" gap={4}>
                    <Heading size="md">
                      Proteins{selectedNetwork ? ` - ${selectedNetwork}` : ""}
                    </Heading>
                    {!panelsCollapsed && (
                      <HStack gap={2} flex="1">
                        <Input
                          placeholder="Search proteins (space-separated)"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              onSearch()
                            }
                          }}
                          size="sm"
                        />
                        <Button size="sm" onClick={onSearch} variant="outline">
                          Search
                        </Button>
                        <Button size="sm" onClick={onClearSearch} variant="ghost">
                          Clear
                        </Button>
                      </HStack>
                    )}
                    {selectedNetwork && proteins && (
                      <Text fontSize="sm" opacity={0.7}>
                        {proteins.total} unique proteins
                      </Text>
                    )}
                  </Flex>
                </Card.Header>
                <Card.Body>
                  {!selectedNetwork ? (
                    <Text color="gray.500" textAlign="center" py={8}>
                      Select a network to view proteins
                    </Text>
                  ) : loadingProteins ? (
                    <Flex justify="center" py={8}>
                      <Spinner />
                    </Flex>
                  ) : proteins && proteins.items.length > 0 ? (
                    <>
                      <Box maxH={{ base: "50vh", lg: "70vh" }} overflowY="auto">
                        <VStack align="stretch" gap={2}>
                          {proteins.items.map((item) => (
                            <Box key={item.protein}>
                              <Flex
                                px={3}
                                py={2}
                                borderWidth="1px"
                                borderRadius="md"
                                align="center"
                                justify="space-between"
                              >
                                <HStack gap={3} align="center" onClick={() => toggleProtein(item.protein)} cursor="pointer">
                                  <Checkbox.Root
                                    checked={selectedProteins.has(item.protein)}
                                    onCheckedChange={(e) => {
                                      const shouldCheck = !!e.checked
                                      setSelectedProteins((prev) => {
                                        const next = new Set(prev)
                                        if (shouldCheck) next.add(item.protein)
                                        else next.delete(item.protein)
                                        return next
                                      })
                                    }}
                                  >
                                    <Checkbox.Control aria-label={`Select ${item.protein}`} />
                                  </Checkbox.Root>
                                  <Text
                                    fontWeight={500}
                                    _hover={{ textDecoration: "underline", cursor: "pointer" }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setInfoProtein((prev) => (prev === item.protein ? null : item.protein))
                                    }}
                                  >
                                    {item.protein}
                                  </Text>
                                  <Flex gap={1} flexWrap="wrap">
                                    {item.types.map((t) => (
                                      <Box
                                        key={`${item.protein}-${t}`}
                                        px={2}
                                        py={0.5}
                                        borderRadius="md"
                                        fontSize="xs"
                                        bg={
                                          t === "prediction"
                                            ? "blue.50"
                                            : t === "matched_prediction"
                                              ? "cyan.50"
                                              : t === "reference"
                                                ? "green.50"
                                                : t === "matched_reference"
                                                  ? "teal.50"
                                                  : "gray.50"
                                        }
                                        color="fg.muted"
                                        borderWidth="1px"
                                      >
                                        {t}
                                      </Box>
                                    ))}
                                  </Flex>
                                </HStack>
                                <Text fontSize="xs" opacity={0.7}>
                                  in {item.files.length} GDF{item.files.length === 1 ? "" : "s"}
                                </Text>
                              </Flex>
                              {infoProtein === item.protein && (
                                <Box px={3} pb={2}>
                                  <Text fontSize="xs" opacity={0.7} mb={1}>
                                    Present in files:
                                  </Text>
                                  <VStack align="stretch" gap={1}>
                                    {item.files.map((f: string) => (
                                      <Text key={f} fontSize="xs">
                                        {f}
                                      </Text>
                                    ))}
                                  </VStack>
                                </Box>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      </Box>
                      <HStack justify="space-between" mt={2}>
                        <Text fontSize="sm" opacity={0.8}>
                          Selected: {selectedProteins.size}
                        </Text>
                        <Button size="sm" onClick={fetchComponents} disabled={selectedProteins.size === 0}>
                          Get components
                        </Button>
                      </HStack>
                      <Flex justify="space-between" mt={4}>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!selectedNetwork) return
                            const selectedParam = Array.from(selectedProteins).join(" ")
                            const qParam = selectedProteins.size > 0 ? "" : searchQuery
                            fetchProteins(selectedNetwork, page - 1, qParam, selectedParam)
                          }}
                          disabled={page <= 1}
                          variant="outline"
                        >
                          Previous
                        </Button>
                        <Text fontSize="sm" opacity={0.8}>
                          Page {page} / {totalPages}
                        </Text>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!selectedNetwork) return
                            const selectedParam = Array.from(selectedProteins).join(" ")
                            const qParam = selectedProteins.size > 0 ? "" : searchQuery
                            fetchProteins(selectedNetwork, page + 1, qParam, selectedParam)
                          }}
                          disabled={page >= totalPages}
                          variant="outline"
                        >
                          Next
                        </Button>
                      </Flex>
                    </>
                  ) : (
                    <Text color="gray.500" textAlign="center" py={8}>
                      No proteins found in this network
                    </Text>
                  )}
                </Card.Body>
              </Card.Root>
            )}
            {/* Components Result Panel */}
            {selectedNetwork && (
              <Card.Root>
                <Card.Header>
                  <Heading size="md">Components membership</Heading>
                </Card.Header>
                <Card.Body>
                  {componentsLoading ? (
                    <Flex justify="center" py={8}>
                      <Spinner />
                    </Flex>
                  ) : componentsResult ? (
                    <VStack align="stretch" gap={3}>
                      {componentsResult.files.map((f) => (
                        <Box key={f.filename} borderWidth="1px" borderRadius="md" p={3}>
                          <Text fontWeight={600} mb={2}>
                            {f.filename}
                          </Text>
                          {f.components.length === 0 ? (
                            <Text fontSize="sm" opacity={0.7}>
                              No selected proteins present in this file
                            </Text>
                          ) : (
                            <VStack align="stretch" gap={2}>
                              {f.components.map((c) => (
                                <Box key={c.component_id} borderWidth="1px" borderRadius="md" p={2}>
                                  <HStack justify="space-between">
                                    <HStack gap={3}>
                                      <Text fontSize="sm">Component #{c.component_id}</Text>
                                      <Text fontSize="xs" opacity={0.7}>nodes {c.size}</Text>
                                      {typeof (c as any).edges === "number" && (
                                        <Text fontSize="xs" opacity={0.7}>edges {(c as any).edges}</Text>
                                      )}
                                      {typeof (c as any).proteins_count === "number" && (
                                        <Text fontSize="xs" opacity={0.7}>proteins {(c as any).proteins_count}</Text>
                                      )}
                                    </HStack>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={async () => {
                                        try {
                                          const baseUrl = OpenAPI.BASE || "http://localhost"
                                          const url = `${baseUrl}/api/v1/proteins/${selectedNetwork}/components/${encodeURIComponent(f.filename)}/${c.component_id}`
                                          const resp = await fetch(url)
                                          if (!resp.ok) throw new Error("Failed to fetch subgraph")
                                          const data = await resp.json()
                                          // Highlight nodes whose label contains ALL selected proteins
                                          const selectedArr = Array.from(selectedProteins)
                                          const highlight = (label: string | undefined) => {
                                            if (!label) return 0
                                            const tokens = label.split(" ").filter(Boolean)
                                            return selectedArr.every((p) => tokens.includes(p)) ? 1 : 0
                                          }
                                          const highlighted = {
                                            nodes: (data.nodes || []).map((n: any) => ({
                                              data: { ...n.data, highlight: highlight(n.data?.label) },
                                            })),
                                            edges: data.edges || [],
                                          }
                                          setSubgraph(highlighted)
                                          setSubgraphOpen(true)
                                          try {
                                            if (selectedNetwork) {
                                              // Use first node in highlighted subgraph as anchor for by-node API
                                              const firstNodeId = String(highlighted.nodes?.[0]?.data?.id ?? "")
                                              if (firstNodeId) {
                                                await fetchSubgraphDistribution(selectedNetwork, f.filename, firstNodeId, highlighted.nodes, highlighted.edges)
                                              }
                                            }
                                          } catch { /* ignore */ }
                                        } catch (e) {
                                          showErrorToast("Failed to fetch subgraph")
                                        }
                                      }}
                                    >
                                      <HStack gap={1}>
                                        <FiEye />
                                        <span>View</span>
                                      </HStack>
                                    </Button>
                                  </HStack>
                                  <Text fontSize="sm" mt={1}>
                                    Proteins: {c.proteins.join(", ")}
                                  </Text>
                                </Box>
                              ))}
                            </VStack>
                          )}
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text fontSize="sm" opacity={0.7}>
                      Select proteins and click "Get components" to see membership
                    </Text>
                  )}
                </Card.Body>
              </Card.Root>
            )}
          </Box>
        </Grid>
        {subgraphOpen && subgraph && (
          <Card.Root mt={6}>
            <Card.Header>
              <Heading size="md">Component subgraph</Heading>
            </Card.Header>
            <Card.Body>
              <Grid templateColumns={{ base: "1fr", xl: "2fr 1fr" }} gap={4} alignItems="stretch">
                <Box minH="500px">
                  <CytoscapeNetwork
                    data={{ nodes: subgraph.nodes, edges: subgraph.edges }}
                    height="500px"
                    wheelSensitivity={2.5}
                    minZoom={0.1}
                    maxZoom={3}
                    disableComponentTapHighlight
                  />
                </Box>
                <Box borderWidth="1px" borderRadius="md" p={3} bg="white" _dark={{ bg: "blackAlpha.600" }}>
                  <Stack gap={3} fontSize="sm">
                    <HStack justify="space-between" align="center">
                      <Text fontWeight={600}>Protein distribution</Text>
                      <Text fontSize="xs" opacity={0.7}>
                        nodes {subgraph?.nodes?.length ?? 0}
                      </Text>
                    </HStack>
                    {subgraphDistribution && subgraphDistribution.length > 0 ? (
                      <Box maxH={{ base: "40vh", xl: "60vh" }} overflowY="auto">
                        <ProteinDistributionList items={subgraphDistribution} />
                      </Box>
                    ) : (
                      <Text fontSize="sm" opacity={0.7}>(no data)</Text>
                    )}
                  </Stack>
                </Box>
              </Grid>
            </Card.Body>
          </Card.Root>
        )}
      </Box>
    </Container>
  )
}

export const Route = createFileRoute("/_layout/proteins")({
  component: ProteinsPage,
})

export default ProteinsPage

