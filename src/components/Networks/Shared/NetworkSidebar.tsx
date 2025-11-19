import { Box, Button, HStack, Stack, Text, Badge, Spinner } from "@chakra-ui/react"
import { DrawerBody, DrawerCloseTrigger, DrawerContent, DrawerHeader, DrawerRoot, DrawerTitle } from "@/components/ui/drawer"
import { FiHash, FiPercent, FiSettings, FiTarget } from "react-icons/fi"
import { OpenAPI } from "@/client"
import { useNetworkSidebar } from '@/components/Networks/Shared/NetworkSidebarContext'
import type { ProteinCount } from '@/components/Networks/Shared/types'
import ProteinComparisonModal from '@/components/Networks/Cytoscape/ProteinComparisonModal'
import { useEffect, useRef } from "react"

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
    selectedForComparison, setSelectedForComparison, comparisonModalOpen, setComparisonModalOpen,
    dataSource,
    graphRef, hoverRevertTimeoutRef, prevViewRef,
  } = useNetworkSidebar()
  
  // Screen reader announcement for selection changes
  const announcementRef = useRef<HTMLDivElement>(null)
  
  // Store protein-to-node mapping for grouping in comparison
  const proteinToNodeMapRef = useRef<Map<string, string>>(new Map())
  
  // Build protein-to-node mapping from the graph
  const buildProteinToNodeMap = (): Map<string, string> => {
    const map = new Map<string, string>()
    const graph = graphRef.current
    if (!graph) return map
    
    try {
      const nodes = graph.nodes ? graph.nodes() : []
      nodes.forEach((nodeId: string) => {
        const label = graph.getNodeAttribute ? graph.getNodeAttribute(nodeId, 'label') : graph.data?.(nodeId)?.label
        const lbl = String(label ?? "")
        const proteins = lbl.split(/\s+/).filter(p => p.length > 0)
        proteins.forEach(protein => {
          map.set(protein, nodeId)
        })
      })
    } catch (error) {
      console.error("Error building protein-to-node map:", error)
    }
    
    return map
  }
  
  useEffect(() => {
    if (announcementRef.current) {
      const count = selectedForComparison.size
      if (count === 0) {
        announcementRef.current.textContent = ""
      } else if (count === 1) {
        announcementRef.current.textContent = "1 protein selected for comparison"
      } else {
        announcementRef.current.textContent = `${count} proteins selected for comparison. You can now view the comparison.`
      }
    }
  }, [selectedForComparison.size])
  
  const handleToggleCompare = (protein: string) => {
    const next = new Set(selectedForComparison)
    const wasSelected = next.has(protein)
    if (wasSelected) {
      next.delete(protein)
    } else {
      next.add(protein)
    }
    setSelectedForComparison(next)
    
    // Announce the change
    if (announcementRef.current) {
      if (wasSelected) {
        announcementRef.current.textContent = `${protein} removed from comparison`
      } else {
        announcementRef.current.textContent = `${protein} added to comparison`
      }
    }
  }
  
  const handleRemoveProtein = (protein: string) => {
    const next = new Set(selectedForComparison)
    next.delete(protein)
    setSelectedForComparison(next)
  }

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
                variant={selectedForComparison.has(protein) ? 'solid' : 'outline'}
                onClick={() => handleToggleCompare(protein)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleToggleCompare(protein)
                  }
                }}
                aria-label={selectedForComparison.has(protein) ? `Remove ${protein} from comparison` : `Add ${protein} to comparison`}
                aria-pressed={selectedForComparison.has(protein)}
                title={selectedForComparison.has(protein) ? 'Remove from comparison' : 'Add to comparison'}
              >
                Compare
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
    <>
    {/* Screen reader announcements for selection changes */}
    <div
      ref={announcementRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    />
    
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
                          <>
                            {/* Compare All Node Proteins Button */}
                            {filtered.length >= 2 && (
                              <Box mb={3}>
                                <Button
                                  size="sm"
                                  width="full"
                                  colorScheme="blue"
                                  onClick={() => {
                                    const proteins = filtered.map(p => p.protein)
                                    setSelectedForComparison(new Set(proteins))
                                    setComparisonModalOpen(true)
                                    if (announcementRef.current) {
                                      announcementRef.current.textContent = `Comparing ${proteins.length} proteins from this node`
                                    }
                                  }}
                                  aria-label={`Compare all ${filtered.length} proteins from this node`}
                                >
                                  Compare All Node Proteins ({filtered.length})
                                </Button>
                              </Box>
                            )}
                            
                            <Stack gap={3} overflowY="auto">
                              {filtered.map(renderProteinItem)}
                            </Stack>
                            
                            {selectedForComparison.size >= 2 && (
                              <Box mt={3}>
                                <Button
                                  size="sm"
                                  width="full"
                                  onClick={() => setComparisonModalOpen(true)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      setComparisonModalOpen(true)
                                    }
                                  }}
                                  aria-label={`View comparison of ${selectedForComparison.size} selected proteins`}
                                >
                                  View Comparison ({selectedForComparison.size} proteins)
                                </Button>
                              </Box>
                            )}
                          </>
                        )
                      })()
                    ) : (
                      <Text opacity={0.7}>(no data)</Text>
                    )}
                  </Box>
                )}
              </Box>

              {/* Component edge statistics section */}
              {selectedNodeInfo?.edgeTypeStats && (
                <Box>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Component edge statistics</Text>
                  </HStack>
                  <Box mt={2}>
                    {(() => {
                      const stats = selectedNodeInfo.edgeTypeStats
                      const totalPred = stats.matched_prediction + stats.prediction
                      const totalRef = stats.matched_reference + stats.reference
                      
                      return (
                        <Stack gap={3} fontSize="sm">
                          {/* Predictions */}
                          {totalPred > 0 && (
                            <Box>
                              <HStack justify="space-between" mb={1}>
                                <Text>Predictions</Text>
                                <Text>{totalPred}</Text>
                              </HStack>
                              <HStack gap={0} h="16px" rounded="sm" overflow="hidden">
                                {stats.matched_prediction > 0 && (
                                  <Box
                                    bg="#74C476"
                                    h="100%"
                                    width={`${(stats.matched_prediction / totalPred) * 100}%`}
                                    title={`Matched: ${stats.matched_prediction} (${Math.round((stats.matched_prediction / totalPred) * 100)}%)`}
                                  />
                                )}
                                {stats.prediction > 0 && (
                                  <Box
                                    bg="#FCCF40"
                                    h="100%"
                                    width={`${(stats.prediction / totalPred) * 100}%`}
                                    title={`Unmatched: ${stats.prediction} (${Math.round((stats.prediction / totalPred) * 100)}%)`}
                                  />
                                )}
                              </HStack>
                              <HStack justify="space-between" mt={1} fontSize="xs" opacity={0.7}>
                                <Text>Matched: {stats.matched_prediction} ({Math.round((stats.matched_prediction / totalPred) * 100)}%)</Text>
                                <Text>Unmatched: {stats.prediction} ({Math.round((stats.prediction / totalPred) * 100)}%)</Text>
                              </HStack>
                            </Box>
                          )}
                          
                          {/* References */}
                          {totalRef > 0 && (
                            <Box>
                              <HStack justify="space-between" mb={1}>
                                <Text>References</Text>
                                <Text>{totalRef}</Text>
                              </HStack>
                              <HStack gap={0} h="16px" rounded="sm" overflow="hidden">
                                {stats.matched_reference > 0 && (
                                  <Box
                                    bg="#67A9CF"
                                    h="100%"
                                    width={`${(stats.matched_reference / totalRef) * 100}%`}
                                    title={`Matched: ${stats.matched_reference} (${Math.round((stats.matched_reference / totalRef) * 100)}%)`}
                                  />
                                )}
                                {stats.reference > 0 && (
                                  <Box
                                    bg="#D94801"
                                    h="100%"
                                    width={`${(stats.reference / totalRef) * 100}%`}
                                    title={`Unmatched: ${stats.reference} (${Math.round((stats.reference / totalRef) * 100)}%)`}
                                  />
                                )}
                              </HStack>
                              <HStack justify="space-between" mt={1} fontSize="xs" opacity={0.7}>
                                <Text>Matched: {stats.matched_reference} ({Math.round((stats.matched_reference / totalRef) * 100)}%)</Text>
                                <Text>Unmatched: {stats.reference} ({Math.round((stats.reference / totalRef) * 100)}%)</Text>
                              </HStack>
                            </Box>
                          )}
                          
                          {/* Total */}
                          <HStack justify="space-between" fontSize="xs" opacity={0.8}>
                            <Text fontWeight="semibold">Total edges:</Text>
                            <Text>{stats.total}</Text>
                          </HStack>
                        </Stack>
                      )
                    })()}
                  </Box>
                </Box>
              )}

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
                          <>
                            {/* Compare All Component Proteins Button */}
                            {allProteins.length >= 2 && (
                              <Box mb={3}>
                                <Button
                                  size="sm"
                                  width="full"
                                  colorScheme="purple"
                                  onClick={() => {
                                    const proteins = allProteins.map(p => p.protein)
                                    setSelectedForComparison(new Set(proteins))
                                    // Build protein-to-node map for grouping
                                    proteinToNodeMapRef.current = buildProteinToNodeMap()
                                    setComparisonModalOpen(true)
                                    if (announcementRef.current) {
                                      announcementRef.current.textContent = `Comparing ${proteins.length} proteins from entire component, grouped by node`
                                    }
                                  }}
                                  aria-label={`Compare all ${allProteins.length} proteins from this component`}
                                >
                                  Compare All Component Proteins ({allProteins.length})
                                </Button>
                              </Box>
                            )}
                            
                            <Stack gap={3} overflowY="auto">
                              {allProteins.map(renderProteinItem)}
                            </Stack>
                            
                            {selectedForComparison.size >= 2 && (
                              <Box mt={3}>
                                <Button
                                  size="sm"
                                  width="full"
                                  onClick={() => setComparisonModalOpen(true)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      setComparisonModalOpen(true)
                                    }
                                  }}
                                  aria-label={`View comparison of ${selectedForComparison.size} selected proteins`}
                                >
                                  View Comparison ({selectedForComparison.size} proteins)
                                </Button>
                              </Box>
                            )}
                          </>
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
    
    {/* Protein Comparison Modal */}
    {networkName && (
      <ProteinComparisonModal
        isOpen={comparisonModalOpen}
        onClose={() => {
          setComparisonModalOpen(false)
          // Clear the map when closing
          proteinToNodeMapRef.current = new Map()
        }}
        selectedProteins={Array.from(selectedForComparison)}
        networkName={networkName}
        onRemoveProtein={handleRemoveProtein}
        dataSource={dataSource}
        nodeProteins={nodeLabelProteins}
        proteinToNodeMap={proteinToNodeMapRef.current.size > 0 ? proteinToNodeMapRef.current : undefined}
      />
    )}
  </>
  )
}
