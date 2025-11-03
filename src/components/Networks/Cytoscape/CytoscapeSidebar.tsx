import { Box, Button, HStack, Stack, Text, Tooltip, Badge, Spinner } from "@chakra-ui/react"
import { DrawerBody, DrawerCloseTrigger, DrawerContent, DrawerHeader, DrawerRoot, DrawerTitle } from "@/components/ui/drawer"
import { FiHash, FiPercent, FiSettings, FiTarget } from "react-icons/fi"
import React from "react"
import { OpenAPI } from "@/client"

type NodeInfo = {
  componentId?: number
  componentSize?: number
  proteinCounts?: Array<{ protein: string; count: number; type_counts?: Record<string, number>; type_ratios?: Record<string, number>; ratio?: number; other_components?: number; other_components_network?: number }>
} | null

interface CytoscapeSidebarProps {
  isDrawerOpen: boolean
  setIsDrawerOpen: (open: boolean) => void
  selectedNode: { id: string; label?: string } | null
  nodeInfoLoading: boolean
  selectedNodeInfo: NodeInfo
  networkName?: string
  filename?: string
  fixedComponentId?: number
  effectiveComponentId: number | null
  savingFavorite: boolean
  savedFavoriteOnce: boolean
  setSavingFavorite: (v: boolean) => void
  setSavedFavoriteOnce: (v: boolean) => void
  fetchNodeComponentInfo: (nodeId: string) => Promise<void>
  isIdOpen: boolean
  setIsIdOpen: (v: boolean) => void
  isComponentOpen: boolean
  setIsComponentOpen: (v: boolean) => void
  isDistributionOpen: boolean
  setIsDistributionOpen: (v: boolean) => void
  isNodeProteinOpen: boolean
  setIsNodeProteinOpen: (v: boolean) => void
  isNodeHighlightOptionsOpen: boolean
  setIsNodeHighlightOptionsOpen: (v: boolean) => void
  isHighlightOptionsOpen: boolean
  setIsHighlightOptionsOpen: (v: boolean) => void
  proteinCountsSorted: Array<{ protein: string; count: number; type_counts?: Record<string, number>; type_ratios?: Record<string, number>; ratio?: number; other_components?: number; other_components_network?: number }>
  proteinMaxCount: number
  nodeLabelProteins: string[]
  computeComponents: (cy: any) => { nidToCid: Map<string, number>; cidToNodeIds: Map<number, string[]> }
  previewComponent: (cid: number) => void
  clearHoverPreview: (cid: number) => void
  highlightComponent: (cid: number) => void
  highlightProteins: Set<string>
  setHighlightProteins: (next: Set<string>) => void
  expandedProteins: Set<string>
  setExpandedProteins: (next: Set<string>) => void
  selectedBorderWidth: number
  cyRef: React.MutableRefObject<any>
  hoverRevertTimeoutRef: React.MutableRefObject<number | null>
  prevViewRef: React.MutableRefObject<{ pan: { x: number; y: number }; zoom: number } | null>
}

export default function CytoscapeSidebar(props: CytoscapeSidebarProps) {
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
    isNodeHighlightOptionsOpen, setIsNodeHighlightOptionsOpen,
    proteinCountsSorted, proteinMaxCount, nodeLabelProteins,
    computeComponents, previewComponent, clearHoverPreview, highlightComponent,
    highlightProteins, setHighlightProteins, expandedProteins, setExpandedProteins,
    selectedBorderWidth,
    cyRef, hoverRevertTimeoutRef, prevViewRef,
  } = props

  const renderProteinItem = ({ protein, count, type_counts, type_ratios, ratio, other_components }: { protein: string; count: number; type_counts?: Record<string, number>; type_ratios?: Record<string, number>; ratio?: number; other_components?: number }) => {
    const totalPct = Math.max(4, Math.round((count / proteinMaxCount) * 100))
    const parts = Object.entries(type_counts || {}).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    const sum = parts.reduce((acc, [, c]) => acc + c, 0) || 1
    const cy = cyRef.current
    let compMenu: Array<{ label: string, cid: number }> = []
    if (cy) {
      const { nidToCid } = computeComponents(cy)
      const compSet = new Set<number>()
      cy.nodes().forEach((n: any) => {
        const lbl = String(n.data("label") ?? "")
        if (lbl.split(/\s+/).includes(protein)) {
          const cid = nidToCid.get(n.id())
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
                  const pct = Math.round((c / sum) * 100)
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
                    <Tooltip.Root openDelay={200}>
                      <Tooltip.Trigger>
                        <Button size="xs" variant="ghost" onClick={() => setIsNodeHighlightOptionsOpen(!props.isNodeHighlightOptionsOpen)} title="Highlight options">
                          <FiSettings />
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Positioner>
                        <Tooltip.Content>
                          <Tooltip.Arrow />
                          <Text fontSize="xs">Highlight options</Text>
                        </Tooltip.Content>
                      </Tooltip.Positioner>
                    </Tooltip.Root>
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
                        const filtered = proteinCountsSorted.filter(({ protein }) => nodeLabelProteins.includes(protein))
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


