import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Badge,
  HStack,
  Input,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { FiEye, FiTrash2 } from "react-icons/fi"
import { z } from "zod"

import CytoscapeNetwork from "@/components/Networks/CytoscapeNetwork"
import ProteinDistributionList from "@/components/Networks/ProteinDistributionList"
import { OpenAPI } from "@/client"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"
import useCustomToast from "@/hooks/useCustomToast"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"

const itemsSearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 10

export const Route = createFileRoute("/_layout/items")({
  component: Items,
  validateSearch: (search) => itemsSearchSchema.parse(search),
})

function FavoritesTable() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()
  const setPage = (page: number) => navigate({ to: "/items", search: (prev: any) => ({ ...prev, page }) })
  const { showErrorToast, showSuccessToast } = useCustomToast()

  const [data, setData] = useState<{ data: any[]; count: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPlaceholder, setIsPlaceholder] = useState(false)
  const [subgraph, setSubgraph] = useState<null | { nodes: { data: Record<string, any> }[]; edges: { data: Record<string, any> }[] }>(null)
  const [subgraphOpen, setSubgraphOpen] = useState(false)
  const [subgraphNetworkName, setSubgraphNetworkName] = useState<string | null>(null)
  const [subgraphFilename, setSubgraphFilename] = useState<string | null>(null)
  const [summary, setSummary] = useState<null | { nodes: number; edges: number; density: number; typeCounts: Record<string, number>; degreeHist: Record<number, number> }>(null)
  const [distribution, setDistribution] = useState<null | any[]>(null)
  const [sgdAnnotations, setSgdAnnotations] = useState<Record<string, string>>({})
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState<string>("")

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const skip = (page - 1) * PER_PAGE
      const token = localStorage.getItem('access_token') || ''
      const res = await fetch(`${baseUrl}/api/v1/favorites?skip=${skip}&limit=${PER_PAGE}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error('failed')
      const json = await res.json()
      setData(json)
      setIsPlaceholder(false)
    } catch {
      showErrorToast("Failed to fetch favorites")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFavorites() }, [page])

  const onDelete = async (id: string) => {
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const token = localStorage.getItem('access_token') || ''
      const res = await fetch(`${baseUrl}/api/v1/favorites/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      if (!res.ok) throw new Error('failed')
      showSuccessToast('Favorite deleted')
      fetchFavorites()
    } catch { showErrorToast('Failed to delete favorite') }
  }

  const openEdit = (fav: any) => {
    setEditId(fav.id)
    setEditDescription(fav.description || "")
    setEditOpen(true)
  }

  const submitEdit = async () => {
    if (!editId) return
    try {
      const baseUrl = OpenAPI.BASE || "http://localhost"
      const token = localStorage.getItem('access_token') || ''
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const body: Record<string, any> = {}
      if (typeof editDescription === 'string') body.description = editDescription
      const res = await fetch(`${baseUrl}/api/v1/favorites/${editId}`, { method: 'PUT', headers, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('failed')
      setEditOpen(false)
      setEditId(null)
      await fetchFavorites()
    } catch {
      showErrorToast('Failed to update favorite')
    }
  }

  const items = data?.data ?? []
  const count = data?.count ?? 0

  const computeAnalysis = (nodes: { data: Record<string, any> }[], edges: { data: Record<string, any> }[]) => {
    const n = nodes.length
    const m = edges.length
    const density = n > 1 ? Math.min(1, (2 * m) / (n * (n - 1))) : 0
    const typeCounts: Record<string, number> = {}
    const adj = new Map<string, number>()
    nodes.forEach((nd) => {
      const id = String(nd.data?.id ?? '')
      if (!adj.has(id)) adj.set(id, 0)
      const t = String(nd.data?.type ?? 'unknown')
      typeCounts[t] = (typeCounts[t] || 0) + 1
    })
    edges.forEach((e) => {
      const s = String(e.data?.source ?? '')
      const t = String(e.data?.target ?? '')
      if (adj.has(s)) adj.set(s, (adj.get(s) || 0) + 1)
      if (adj.has(t)) adj.set(t, (adj.get(t) || 0) + 1)
    })
    const degreeHist: Record<number, number> = {}
    Array.from(adj.values()).forEach((d) => { degreeHist[d] = (degreeHist[d] || 0) + 1 })
    setSummary({ nodes: n, edges: m, density, typeCounts, degreeHist })

    // Protein distribution from labels per node type
    const tokenMap: Record<string, { count: number; type_counts: Record<string, number> }> = {}
    nodes.forEach((nd) => {
      const label = String(nd.data?.label ?? '')
      const typ = String(nd.data?.type ?? 'unknown')
      const toks = label.split(/\s+/).filter(Boolean)
      toks.forEach((p) => {
        if (!tokenMap[p]) tokenMap[p] = { count: 0, type_counts: {} }
        tokenMap[p].count += 1
        tokenMap[p].type_counts[typ] = (tokenMap[p].type_counts[typ] || 0) + 1
      })
    })
    const items: any[] = Object.entries(tokenMap).map(([protein, obj]) => {
      const sum = Object.values(obj.type_counts).reduce((a, b) => a + b, 0) || 1
      const type_ratios: Record<string, number> = {}
      Object.entries(obj.type_counts).forEach(([k, v]) => { type_ratios[k] = v / sum })
      return { protein, count: obj.count, type_counts: obj.type_counts, type_ratios, ratio: obj.count / Math.max(1, ...Object.values(tokenMap).map((x) => x.count)) }
    })
    items.sort((a, b) => (b.count - a.count) || a.protein.localeCompare(b.protein))
    setDistribution(items)

    // Fetch SGD annotations for top proteins (up to 50)
    ;(async () => {
      try {
        const top = items.slice(0, 50).map((it: any) => it.protein)
        if (top.length === 0) { setSgdAnnotations({}); return }
        const baseUrl = OpenAPI.BASE || 'http://localhost'
        const resp = await fetch(`${baseUrl}/api/v1/networks/sgd/details`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens: top }) })
        if (!resp.ok) { setSgdAnnotations({}); return }
        const json = await resp.json()
        const map: Record<string, string> = {}
        for (const it of json || []) { if (it && it.token) map[it.token] = it.gene_name }
        setSgdAnnotations(map)
      } catch { setSgdAnnotations({}) }
    })()
  }

  if (loading) {
    return (
      <Flex justify="center" py={8}><Spinner /></Flex>
    )
  }

  if (items.length === 0) {
    return (
      <Card.Root>
        <Card.Body>
          <Text textAlign="center" opacity={0.7}>No favorites yet</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <>
      <Table.Root size={{ base: 'sm', md: 'md' }}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Network</Table.ColumnHeader>
            <Table.ColumnHeader>File</Table.ColumnHeader>
            <Table.ColumnHeader>Component</Table.ColumnHeader>
            <Table.ColumnHeader>Description</Table.ColumnHeader>
            <Table.ColumnHeader>Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((fav: any) => (
            <Table.Row key={fav.id} opacity={isPlaceholder ? 0.5 : 1}>
              <Table.Cell>{fav.network_name}</Table.Cell>
              <Table.Cell truncate maxW="md">{fav.filename}</Table.Cell>
              <Table.Cell>#{fav.component_id}</Table.Cell>
              <Table.Cell truncate maxW="md">{fav.description || '-'}</Table.Cell>
              <Table.Cell>
                <Grid templateColumns={{ base: '1fr 1fr 1fr', md: 'auto auto auto' }} gap={2}>
                  <Button size="xs" onClick={() => {
                    navigate({ to: "/component-view", search: { network: fav.network_name, filename: fav.filename, id: fav.component_id } })
                  }}>
                    <FiEye />
                    View
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => openEdit(fav)}>
                    Edit
                  </Button>
                  <Button size="xs" colorPalette="red" variant="outline" onClick={() => onDelete(fav.id)}>
                    <FiTrash2 />
                    Delete
                  </Button>
                </Grid>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      <Flex justifyContent="flex-end" mt={4}>
        <PaginationRoot count={count} pageSize={PER_PAGE} onPageChange={({ page }) => setPage(page)}>
          <Flex>
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </Flex>
        </PaginationRoot>
      </Flex>

      {subgraphOpen && subgraph && (
        <Card.Root mt={6}>
          <Card.Header>
            <Heading size="md">Component analysis</Heading>
          </Card.Header>
          <Card.Body>
            <Grid templateColumns={{ base: '1fr', xl: '2fr 1fr' }} gap={4} alignItems="stretch">
              <Box minH="520px">
                <CytoscapeNetwork
                  data={{ nodes: subgraph.nodes, edges: subgraph.edges }}
                  height="520px"
                  wheelSensitivity={2.5}
                  minZoom={0.1}
                  maxZoom={3}
                  disableComponentTapHighlight
                  networkName={subgraphNetworkName || undefined}
                  filename={subgraphFilename || undefined}
                />
              </Box>
              <Box borderWidth="1px" borderRadius="md" p={3} bg="white" _dark={{ bg: 'blackAlpha.600' }}>
                <VStack align="stretch" gap={3} fontSize="sm">
                  <Box>
                    <Heading size="sm">Summary</Heading>
                    {summary ? (
                      <VStack align="start" gap={1} mt={2}>
                        <Text>Nodes: {summary.nodes}</Text>
                        <Text>Edges: {summary.edges}</Text>
                        <Text>Density: {summary.density.toFixed(3)}</Text>
                        <HStack gap={1} wrap="wrap">
                          {Object.entries(summary.typeCounts).map(([t, c]) => (
                            <Badge key={`type-${t}`} variant="outline">{t}: {c}</Badge>
                          ))}
                        </HStack>
                      </VStack>
                    ) : <Text opacity={0.7}>(no data)</Text>}
                  </Box>
                  <Box>
                    <Heading size="sm">Protein distribution</Heading>
                    {distribution && distribution.length > 0 ? (
                      <Box maxH={{ base: '40vh', xl: '60vh' }} overflowY="auto">
                        <ProteinDistributionList items={distribution as any} />
                      </Box>
                    ) : (
                      <Text fontSize="sm" opacity={0.7}>(no data)</Text>
                    )}
                  </Box>
                  {distribution && sgdAnnotations && Object.keys(sgdAnnotations).length > 0 && (
                    <Box>
                      <Heading size="sm">SGD annotations</Heading>
                      <VStack align="start" gap={1} mt={2}>
                        {distribution.slice(0, 15).map((it: any) => {
                          const gene = sgdAnnotations[it.protein]
                          if (!gene || gene === it.protein) return null
                          return (
                            <Text key={`ann-${it.protein}`} fontSize="xs">
                              {it.protein} → {gene}
                            </Text>
                          )
                        })}
                      </VStack>
                    </Box>
                  )}
                </VStack>
              </Box>
            </Grid>
          </Card.Body>
        </Card.Root>
      )}

      {/* Edit dialog */}
      <DialogRoot open={editOpen} onOpenChange={({ open }) => setEditOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Favorite</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4}>
              <Field label="Description">
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" />
              </Field>
            </VStack>
          </DialogBody>
          <DialogFooter gap={2}>
            <Button variant="subtle" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="solid" onClick={submitEdit}>Save</Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </>
  )
}

function Items() {
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>Favorite Components</Heading>
      <FavoritesTable />
    </Container>
  )
}
