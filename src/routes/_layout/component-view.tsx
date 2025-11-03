import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  HStack,
  Heading,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { FiArrowLeft } from "react-icons/fi"

import SigmaNetwork from "@/components/Networks/SigmaNetwork"
import CytoscapeNetwork from "@/components/Networks/CytoscapeNetwork"
import ReagraphNetwork from "@/components/Networks/ReagraphNetwork"
import GraphinNetwork from "@/components/Networks/GraphinNetwork"
import ProteinDistributionList from "@/components/Networks/ProteinDistributionList"
import { OpenAPI } from "@/client"

const searchSchema = z.object({
  network: z.string().min(1),
  filename: z.string().min(1),
  id: z.coerce.number().int().nonnegative(),
})

export const Route = createFileRoute("/_layout/component-view")({
  component: ComponentView,
  validateSearch: (s) => searchSchema.parse(s),
})

function ComponentView() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { network, filename, id } = Route.useSearch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graph, setGraph] = useState<null | { nodes: { data: Record<string, any> }[]; edges: { data: Record<string, any> }[] }>(null)
  const [summary, setSummary] = useState<null | { nodes: number; edges: number; density: number; typeCounts: Record<string, number>; degreeHist: Record<number, number> }>(null)
  const [distribution, setDistribution] = useState<null | any[]>(null)
  const [sgdAnnotations, setSgdAnnotations] = useState<Record<string, string>>({})
  const [exists, setExists] = useState(false)
  const [saving, setSaving] = useState(false)
  const [renderer, setRenderer] = useState<'cytoscape' | 'sigma' | 'reagraph' | 'graphin'>(() => {
    try {
      const stored = localStorage.getItem('network.renderer')
      return (stored === 'sigma' || stored === 'cytoscape' || stored === 'reagraph' || stored === 'graphin') ? stored : 'cytoscape'
    } catch {
      return 'cytoscape'
    }
  })

  const baseUrl = useMemo(() => OpenAPI.BASE || "http://localhost", [])

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

    const tokenMap: Record<string, { count: number; type_counts: Record<string, number> }> = {}
    nodes.forEach((nd) => {
      const label = String(nd.data?.label ?? '')
      const typ = String(nd.data?.type ?? 'unknown')
      label.split(/\s+/).filter(Boolean).forEach((p) => {
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
  }

  const fetchAnnotations = async (proteins: string[]) => {
    try {
      if (proteins.length === 0) { setSgdAnnotations({}); return }
      const resp = await fetch(`${baseUrl}/api/v1/networks/sgd/details`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens: proteins }) })
      if (!resp.ok) { setSgdAnnotations({}); return }
      const json = await resp.json()
      const map: Record<string, string> = {}
      for (const it of json || []) { if (it && it.token) map[it.token] = it.gene_name }
      setSgdAnnotations(map)
    } catch { setSgdAnnotations({}) }
  }

  const checkFavorite = async () => {
    try {
      const token = localStorage.getItem('access_token') || ''
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const resp = await fetch(`${baseUrl}/api/v1/favorites/exists?network_name=${encodeURIComponent(network)}&filename=${encodeURIComponent(filename)}&component_id=${id}`, { headers })
      if (!resp.ok) return
      const json = await resp.json()
      setExists(!!json?.exists)
    } catch {}
  }

  const saveFavorite = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('access_token') || ''
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const body = { network_name: network, filename, component_id: id }
      const resp = await fetch(`${baseUrl}/api/v1/favorites`, { method: 'POST', headers, body: JSON.stringify(body) })
      if (resp.ok) setExists(true)
    } catch {} finally { setSaving(false) }
  }

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      try {
        if (!e.key || e.key === 'network.renderer') {
          const r = localStorage.getItem('network.renderer')
          setRenderer((r === 'sigma' || r === 'cytoscape' || r === 'reagraph' || r === 'graphin') ? r : 'cytoscape')
        }
        if (!e.key || e.key === 'network.style') {
          setStyleNonce((n) => n + 1)
        }
      } catch {}
    }
    const onCustom = () => onStorage(new StorageEvent('storage', { key: 'network.renderer' }))
    window.addEventListener('storage', onStorage)
    window.addEventListener('network-renderer-changed', onCustom as any)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('network-renderer-changed', onCustom as any)
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        // Check favorite status ASAP so UI can reflect "Saved" promptly
        await checkFavorite()
        const nameMode = (() => {
          try { const raw = localStorage.getItem('network.style'); const parsed = raw ? JSON.parse(raw) : {}; return parsed?.nameMode === 'gene' ? 'gene' : 'systematic' } catch { return 'systematic' }
        })()
        const resp = await fetch(`${baseUrl}/api/v1/proteins/${network}/components/${encodeURIComponent(filename)}/${id}?name_mode=${nameMode}`)
        if (!resp.ok) throw new Error('Failed to fetch component')
        const data = await resp.json()
        setGraph(data)
        computeAnalysis(data.nodes || [], data.edges || [])
        const tops = ((data.nodes || []).slice(0, 50).flatMap((n: any) => String(n?.data?.label ?? '').split(/\s+/).filter(Boolean))) as string[]
        const uniq = Array.from(new Set<string>(tops)).slice(0, 50)
        await fetchAnnotations(uniq)
      } catch (e: any) {
        setError(e?.message || 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, filename, id])

  return (
    <Container maxW="full">
      <Box pt={4} pb={2}>
        <HStack justify="space-between" align="center">
          <HStack gap={3} align="center">
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/components" })}>
              <FiArrowLeft />
              Back
            </Button>
            <Heading size="lg">Component #{id}</Heading>
            <Badge variant="outline">{network}</Badge>
            <Badge variant="outline">{filename}</Badge>
          </HStack>
          {/* Favorites button removed per request; drawer controls handle save state */}
        </HStack>
      </Box>
      {loading ? (
        <Flex justify="center" py={10}><Spinner /></Flex>
      ) : error ? (
        <Text color="red.500">{error}</Text>
      ) : graph ? (
        <Card.Root>
          <Card.Body>
            <Grid templateColumns={{ base: '1fr', xl: '2fr 1fr' }} gap={4} alignItems="stretch">
              <Box minH="70vh">
                {renderer === 'cytoscape' ? (
                  <CytoscapeNetwork
                    data={graph}
                    height="70vh"
                    wheelSensitivity={2.5}
                    networkName={network}
                    filename={filename}
                    initialFavoriteExists={exists}
                    fixedComponentId={id}
                  />
                ) : renderer === 'sigma' ? (
                  <SigmaNetwork
                    data={graph}
                    height="70vh"
                    networkName={network}
                    filename={filename}
                    initialFavoriteExists={exists}
                    fixedComponentId={id}
                  />
                ) : renderer === 'reagraph' ? (
                  <ReagraphNetwork
                    data={graph}
                    height="70vh"
                    networkName={network}
                    filename={filename}
                  />
                ) : (
                  <GraphinNetwork
                    data={graph}
                    height="70vh"
                    networkName={network}
                    filename={filename}
                  />
                )}
              </Box>
              <Box borderWidth="1px" borderRadius="md" p={3} bg="white" _dark={{ bg: 'blackAlpha.600' }}>
                <VStack align="stretch" gap={4} fontSize="sm">
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
                        {distribution.slice(0, 20).map((it: any) => {
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
      ) : null}
    </Container>
  )
}

export default ComponentView
