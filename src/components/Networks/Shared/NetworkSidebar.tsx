import { Box, Button, HStack, Stack, Text, Badge, Spinner } from "@chakra-ui/react"
import { DrawerBody, DrawerCloseTrigger, DrawerContent, DrawerHeader, DrawerRoot, DrawerTitle } from "@/components/ui/drawer"
import { FiHash, FiPercent, FiSettings, FiTarget } from "react-icons/fi"
import { OpenAPI } from "@/client"
import { useNetworkSidebar } from '@/components/Networks/Shared/NetworkSidebarContext'
import type { ProteinCount } from '@/components/Networks/Shared/types'

export default function NetworkSidebar() {
  const {
    isDrawerOpen, setIsDrawerOpen,
    selectedNode, nodeInfoLoading, selectedNodeInfo,
    networkName, filename, fixedComponentId, effectiveComponentId,
    savingFavorite, savedFavoriteOnce, setSavingFavorite, setSavedFavoriteOnce,
    fetchNodeComponentInfo,
    isIdOpen, setIsIdOpen,
    isComponentOpen, setIsComponentOpen,
    isDistributionOpen, setIsDistributionOpen,
    isNodeProteinOpen, setIsNodeProteinOpen,
    proteinCountsSorted, proteinMaxCount, nodeLabelProteins,
    computeComponents, previewComponent, clearHoverPreview, highlightComponent,
    highlightProteins, setHighlightProteins, expandedProteins, setExpandedProteins,
    graphRef, hoverRevertTimeoutRef, prevViewRef,
  } = useNetworkSidebar()

  const renderProteinItem = ({ protein, count, type_counts, ratio, other_components }: ProteinCount) => {
    const totalPct = Math.max(4, Math.round((count / proteinMaxCount) * 100))
    const parts = Object.entries(type_counts || {}).sort((a, b) => ((b[1] as number) - (a[1] as number)) || a[0].localeCompare(b[0]))
    const sum = parts.reduce((acc, [, c]) => acc + (c as number), 0) || 1

    let compMenu: Array<{ label: string, cid: number }> = []
    const graph = graphRef.current
    if (graph) {
      const { nidToCid } = computeComponents(graph)
      const compSet = new Set<number>()
      
      // Iterate through nodes to find components with this protein
      const nodes = graph.nodes ? graph.nodes() : []
      nodes.forEach((nodeId: string) => {
        const label = graph.getNodeAttribute ? graph.getNodeAttribute(nodeId, 'label') : graph.data?.(nodeId)?.label
        const lbl = String(label ?? "")
        if (lbl.split(/\s+/).includes(protein)) {
          const cid = nidToCid.get(nodeId)
          if (typeof cid === "number") compSet.add(cid)
        }
      })
      
      let currentCid: number | undefined
      if (selectedNode?.id) {
        currentCid = nidToCid.get(String(selectedNode.id))
        if (typeof currentCid === 'number') compSet.delete(currentCid)
      }
      compMenu = Array.from(compSet).sort((a, b) => a - b).map((cid) => ({ label: `Component #${cid}`, cid }))
    }

    return (
      <Box key={`nlp-box-${protein}`} p={2} borderWidth="1px" rounded="md" bg="white" _dark={{ bg: 'blackAlpha.600' }}>
        <Stack gap={1} mb={2}>
          <HStack gap={2} align="center">
            <Text fontSize="xs" opacity={0.8}>Protein</Text>
          </HStack>
          <HStack gap={2} align="center" justify="space-between">
            <HStack gap={2} align="center">
              <FiHash opacity={0.8} />
              <Text fontWeight="semibold">{protein}</Text>
            </HStack>
            <HStack gap={2} align="center">
              <Badge title="Total occurrences in component" variant="subtle" w="fit-content">{count}</Badge>
              <Button
                size="2xs"
                variant={highlightProteins.has(protein) ? 'solid' : 'outline'}
                onClick={() => {
                  const next = new Set(highlightProteins)
                  if (next.has(protein)) next.delete(protein); else next.add(protein)
                  setHighlightProteins(next)
                }}
                title="Toggle highlight"
              >
                <FiTarget />
              </Button>
              <Button
                size="2xs"
                variant="outline"
                onClick={() => {
                  const next = new Set(expandedProteins)
                  if (next.has(protein)) next.delete(protein); else next.add(protein)
                  setExpandedProteins(next)
                }}
              >
                {expandedProteins.has(protein) ? 'Hide details' : 'Show details'}
              </Button>
            </HStack>
          </HStack>
        </Stack>

        {expandedProteins.has(protein) && (
          <>
            <HStack gap={6} mb={2} align="flex-end">
              <Stack gap={0} minW="120px">
                <HStack gap={2} align="center">
                  <Text fontSize="xs" opacity={0.8}>Share of component</Text>
                </HStack>
                <HStack gap={1} title="Share of nodes in component" opacity={0.9}>
                  <FiPercent />
                  <Text>{typeof ratio === 'number' ? `${Math.round(ratio * 100)}%` : '-'}</Text>
                </HStack>
              </Stack>

              <Stack gap={0} minW="120px">
                <HStack gap={2} align="center">
                  <Text fontSize="xs" opacity={0.8}>Count in component</Text>
                </HStack>
                <Badge title="Total occurrences in component" variant="subtle" w="fit-content">{count}</Badge>
              </Stack>
            </HStack>

            <Stack gap={1} mb={2}>
              <HStack gap={2} align="center">
                <Text fontSize="xs" opacity={0.8}>Type distribution</Text>
              </HStack>
              <HStack gap={2} align="center">
                <Box flex={1} bg="blackAlpha.200" _dark={{ bg: 'whiteAlpha.200' }} h="6px" rounded="sm" position="relative">
                  <Box position="absolute" left={0} top={0} bottom={0} width={`${totalPct}%`} bg="blackAlpha.500" _dark={{ bg: 'whiteAlpha.500' }} rounded="sm" />
                </Box>
                <Badge variant="outline" minW="40px" textAlign="center">{count}</Badge>
              </HStack>
              <HStack gap={2} wrap="wrap">
                {parts.map(([type, c]) => {
                  const pct = Math.round(((c as number) / sum) * 100)
                  return (
                    <Badge key={`${protein}-type-${type}`} variant="subtle">{type}: {pct}%</Badge>
                  )
                })}
              </HStack>
            </Stack>

            <Stack gap={1}>
              <HStack gap={2} align="center">
                <Text fontSize="xs" opacity={0.8}>Other components</Text>
              </HStack>
              {typeof other_components === 'number' && other_components > 0 ? (
                compMenu.length > 0 ? (
                  <HStack gap={1} wrap="wrap">
                    {compMenu.map((it) => (
                      <Button
                        key={`${protein}-comp-${it.cid}`}
                        size="2xs"
                        variant="outline"
                        title={`Component #${it.cid}`}
                        onMouseEnter={() => previewComponent(it.cid)}
                        onMouseLeave={() => clearHoverPreview(it.cid)}
                        onClick={() => {
                          if (hoverRevertTimeoutRef.current) {
                            window.clearTimeout(hoverRevertTimeoutRef.current)
                            hoverRevertTimeoutRef.current = null
                          }
                          prevViewRef.current = null
                          highlightComponent(it.cid)
                          setIsDrawerOpen(false)
                        }}
                      >
                        #{it.cid}
                      </Button>
                    ))}
                  </HStack>
                ) : (
                  <Badge variant="outline">not found in current view</Badge>
                )
              ) : (
                <Badge variant="outline">in {other_components ?? 0} comps</Badge>
              )}
            </Stack>
          </>
        )}
      </Box>
    )
  }

  return (
    <DrawerRoot open={isDrawerOpen} onOpenChange={(e) => setIsDrawerOpen(e.open)} placement="end" modal={false} closeOnInteractOutside={false} trapFocus={false}>
      <DrawerContent maxW="sm">
        <DrawerHeader>
          <DrawerTitle>Node details</DrawerTitle>
          <DrawerCloseTrigger />
        </DrawerHeader>
        <DrawerBody>
          {selectedNode ? (
            <Stack gap={3} fontSize="sm">
              <Box>
                <HStack justify="space-between">
                  <Text fontWeight="bold">ID</Text>
                  <Button size="xs" variant="ghost" onClick={() => setIsIdOpen(!isIdOpen)}>{isIdOpen ? "Hide" : "Show"}</Button>
                </HStack>
                {isIdOpen && (
                  <Text>{selectedNode.id}</Text>
                )}
              </Box>

              {nodeInfoLoading ? (
                <Box>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Component</Text>
                    <HStack gap={2}>
                      {((((typeof fixedComponentId === 'number') || (typeof selectedNodeInfo?.componentId === 'number')) && networkName && filename)) && (
                        <Button
                          size="xs"
                          variant={savedFavoriteOnce ? 'solid' : 'outline'}
                          disabled={savedFavoriteOnce || (typeof effectiveComponentId !== 'number') || savingFavorite}
                          loading={savingFavorite}
                          onClick={async () => {
                            if (savedFavoriteOnce) return
                            if (!networkName || !filename) return
                            const cid = effectiveComponentId
                            if (typeof cid !== 'number') {
                              const id = selectedNode?.id
                              if (id && !selectedNodeInfo && !nodeInfoLoading) await fetchNodeComponentInfo(id)
                              return
                            }
                            try {
                              setSavingFavorite(true)
                              const baseUrl = OpenAPI.BASE || 'http://localhost'
                              const token = localStorage.getItem('access_token') || ''
                              const headers: Record<string,string> = { 'Content-Type': 'application/json' }
                              if (token) headers['Authorization'] = `Bearer ${token}`
                              const body = { network_name: networkName, filename, component_id: cid }
                              const resp = await fetch(`${baseUrl}/api/v1/favorites`, { method: 'POST', headers, body: JSON.stringify(body) })
                              if (!resp.ok) throw new Error('failed')
                              setSavedFavoriteOnce(true)
                            } catch {
                            } finally {
                              setSavingFavorite(false)
                            }
                          }}
                          title={savedFavoriteOnce ? 'Saved' : 'Save as favorite'}
                        >
                          {savedFavoriteOnce ? 'Saved' : 'Save'}
                        </Button>
                      )}
                      <Button size="xs" variant="ghost" onClick={() => setIsComponentOpen(!isComponentOpen)}>{isComponentOpen ? "Hide" : "Show"}</Button>
                    </HStack>
                  </HStack>
                  {isComponentOpen && <Text>Loading…</Text>}
                </Box>
              ) : (selectedNodeInfo && (selectedNodeInfo.componentId !== undefined || selectedNodeInfo.componentSize !== undefined)) ? (
                <Box>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Component</Text>
                    <HStack gap={2}>
                      {((((typeof fixedComponentId === 'number') || (typeof selectedNodeInfo?.componentId === 'number')) && networkName && filename)) && (
                        <Button
                          size="xs"
                          variant={savedFavoriteOnce ? 'solid' : 'outline'}
                          disabled={savedFavoriteOnce || (typeof effectiveComponentId !== 'number') || savingFavorite}
                          loading={savingFavorite}
                          onClick={async () => {
                            if (savedFavoriteOnce) return
                            if (!networkName || !filename) return
                            const cid = effectiveComponentId
                            if (typeof cid !== 'number') {
                              const id = selectedNode?.id
                              if (id && !selectedNodeInfo && !nodeInfoLoading) await fetchNodeComponentInfo(id)
                              return
                            }
                            try {
                              setSavingFavorite(true)
                              const baseUrl = OpenAPI.BASE || 'http://localhost'
                              const token = localStorage.getItem('access_token') || ''
                              const headers: Record<string,string> = { 'Content-Type': 'application/json' }
                              if (token) headers['Authorization'] = `Bearer ${token}`
                              const body = { network_name: networkName, filename, component_id: cid, title: `Component ${cid}`, description: filename }
                              const resp = await fetch(`${baseUrl}/api/v1/favorites`, { method: 'POST', headers, body: JSON.stringify(body) })
                              if (!resp.ok) throw new Error('failed')
                              setSavedFavoriteOnce(true)
                            } catch {
                            } finally {
                              setSavingFavorite(false)
                            }
                          }}
                          title={savedFavoriteOnce ? 'Saved' : 'Save as favorite'}
                        >
                          {savedFavoriteOnce ? 'Saved' : 'Save'}
                        </Button>
                      )}
                      <Button size="xs" variant="ghost" onClick={() => setIsComponentOpen(!isComponentOpen)}>{isComponentOpen ? "Hide" : "Show"}</Button>
                    </HStack>
                  </HStack>
                  {isComponentOpen && (
                    <Text>
                      {selectedNodeInfo.componentId !== undefined ? `#${selectedNodeInfo.componentId}` : ""}
                      {selectedNodeInfo.componentId !== undefined && selectedNodeInfo.componentSize !== undefined ? " · " : ""}
                      {selectedNodeInfo.componentSize !== undefined ? `${selectedNodeInfo.componentSize} nodes` : ""}
                    </Text>
                  )}
                </Box>
              ) : (
                <Box>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Component</Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setIsComponentOpen(!isComponentOpen)
                        const id = selectedNode?.id
                        if (id && !selectedNodeInfo && !nodeInfoLoading) fetchNodeComponentInfo(id)
                      }}
                    >
                      {isComponentOpen ? "Hide" : "Show"}
                    </Button>
                  </HStack>
                  {isComponentOpen && <Text>Loading…</Text>}
                </Box>
              )}

              {/* Node protein distribution section */}
              <Box>
                <HStack justify="space-between">
                  <HStack gap={1} align="center">
                    <Text fontWeight="bold">Node protein distribution</Text>
                    <Button size="xs" variant="ghost" title="Highlight options">
                      <FiSettings />
                    </Button>
                  </HStack>
                  <Button size="xs" variant="ghost" onClick={() => setIsNodeProteinOpen(!isNodeProteinOpen)}>{isNodeProteinOpen ? "Hide" : "Show"}</Button>
                </HStack>

                {isNodeProteinOpen && (
                  <Box mt={2}>
                    {nodeInfoLoading ? (
                      <HStack gap={2} align="center">
                        <Spinner size="xs" />
                        <Text fontSize="sm">Loading proteins…</Text>
                      </HStack>
                    ) : selectedNodeInfo ? (
                      (() => {
                        const filtered = proteinCountsSorted.filter((item: ProteinCount) => nodeLabelProteins.includes(item.protein))
                        if (filtered.length === 0) return <Text opacity={0.7}>(no proteins in label)</Text>
                        return (
                          <Stack gap={3} overflowY="auto">
                            {filtered.map(renderProteinItem)}
                          </Stack>
                        )
                      })()
                    ) : (
                      <Text opacity={0.7}>(no data)</Text>
                    )}
                  </Box>
                )}
              </Box>

              {/* Component protein distribution section */}
              <Box>
                <HStack justify="space-between">
                  <Text fontWeight="bold">Component protein distribution</Text>
                  <Button size="xs" variant="ghost" onClick={() => setIsDistributionOpen(!isDistributionOpen)}>{isDistributionOpen ? "Hide" : "Show"}</Button>
                </HStack>

                {isDistributionOpen && (
                  <Box mt={2}>
                    {nodeInfoLoading ? (
                      <HStack gap={2} align="center">
                        <Spinner size="xs" />
                        <Text fontSize="sm">Loading proteins…</Text>
                      </HStack>
                    ) : selectedNodeInfo ? (
                      (() => {
                        const allProteins = proteinCountsSorted
                        if (allProteins.length === 0) return <Text opacity={0.7}>(no proteins)</Text>
                        return (
                          <Stack gap={3} overflowY="auto">
                            {allProteins.map(renderProteinItem)}
                          </Stack>
                        )
                      })()
                    ) : (
                      <Text opacity={0.7}>(no data)</Text>
                    )}
                  </Box>
                )}
              </Box>
            </Stack>
          ) : (
            <Text>No node selected</Text>
          )}
        </DrawerBody>
      </DrawerContent>
    </DrawerRoot>
  )
}
