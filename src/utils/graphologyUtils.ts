import type Graph from "graphology"

/**
 * Compute connected components in a Graphology graph
 */
export function computeComponents(graph: Graph): {
  nidToCid: Map<string, number>
  cidToNodeIds: Map<number, string[]>
} {
  const nidToCid = new Map<string, number>()
  const cidToNodeIds = new Map<number, string[]>()
  let cid = 0

  graph.forEachNode((node) => {
    if (nidToCid.has(node)) return

    const queue = [node]
    const component: string[] = []
    nidToCid.set(node, cid)

    while (queue.length > 0) {
      const u = queue.shift()!
      component.push(u)

      graph.forEachNeighbor(u, (v) => {
        if (!nidToCid.has(v)) {
          nidToCid.set(v, cid)
          queue.push(v)
        }
      })
    }

    cidToNodeIds.set(cid, component)
    cid += 1
  })

  return { nidToCid, cidToNodeIds }
}

/**
 * Preview a component by dimming other nodes
 */
export function previewComponent(graph: Graph, cid: number) {
  const { nidToCid } = computeComponents(graph)
  
  graph.forEachNode((node) => {
    const nodeCid = nidToCid.get(node)
    graph.setNodeAttribute(node, "dimmed", nodeCid !== cid)
  })

  graph.forEachEdge((edge, _attrs, source, target) => {
    const sourceCid = nidToCid.get(source)
    const targetCid = nidToCid.get(target)
    graph.setEdgeAttribute(edge, "hidden", sourceCid !== cid || targetCid !== cid)
  })
}

/**
 * Clear hover preview by resetting dimmed/hidden states
 */
export function clearHoverPreview(graph: Graph) {
  graph.forEachNode((node) => {
    graph.setNodeAttribute(node, "dimmed", false)
  })

  graph.forEachEdge((edge) => {
    graph.setEdgeAttribute(edge, "hidden", false)
  })
}

/**
 * Highlight a component and zoom to it
 */
export function highlightComponent(graph: Graph, sigma: any, cid: number) {
  const { nidToCid } = computeComponents(graph)
  const nodesInComp: string[] = []

  graph.forEachNode((node) => {
    const inComp = nidToCid.get(node) === cid
    graph.setNodeAttribute(node, "highlighted", inComp)
    graph.setNodeAttribute(node, "dimmed", !inComp)
    if (inComp) nodesInComp.push(node)
  })

  graph.forEachEdge((edge, _attrs, source, target) => {
    const sourceCid = nidToCid.get(source)
    const targetCid = nidToCid.get(target)
    graph.setEdgeAttribute(edge, "hidden", sourceCid !== cid || targetCid !== cid)
  })

  // Zoom to component
  if (nodesInComp.length > 0 && sigma) {
    const coords = nodesInComp.map((n) => ({
      x: graph.getNodeAttribute(n, "x") as number,
      y: graph.getNodeAttribute(n, "y") as number,
    }))
    const xs = coords.map((c) => c.x)
    const ys = coords.map((c) => c.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    sigma.getCamera().animate(
      {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        ratio: Math.max(1, maxX - minX, maxY - minY) * 1.2,
      },
      { duration: 400 }
    )
  }
}
