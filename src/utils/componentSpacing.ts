import type cytoscape from 'cytoscape'

/**
 * Calculate bounding box for a collection of elements
 * Uses renderedBoundingBox with labels, then converts to model coordinates
 */
function getBoundingBox(elements: cytoscape.Collection, cy: cytoscape.Core) {
  if (elements.length === 0) {
    return { x1: 0, y1: 0, x2: 0, y2: 0, width: 0, height: 0 }
  }

  // Get rendered bounding box (includes labels, edges, everything)
  const rbb = elements.renderedBoundingBox({
    includeNodes: true,
    includeEdges: true,
    includeLabels: true,
    includeMainLabels: true,
    includeSourceLabels: true,
    includeTargetLabels: true,
    includeOverlays: false,
    includeUnderlays: false,
  })
  
  // Convert rendered coordinates to model coordinates
  const zoom = cy.zoom()
  const pan = cy.pan()
  
  const x1 = (rbb.x1 - pan.x) / zoom
  const y1 = (rbb.y1 - pan.y) / zoom
  const x2 = (rbb.x2 - pan.x) / zoom
  const y2 = (rbb.y2 - pan.y) / zoom
  
  return {
    x1,
    y1,
    x2,
    y2,
    width: x2 - x1,
    height: y2 - y1,
  }
}

/**
 * Run layout on each component separately, then arrange in grid
 * @param cy - Cytoscape instance
 * @param layoutOptions - Layout configuration
 * @param padding - Minimum padding between components (default: 150)
 */
export async function applyComponentSpacing(
  cy: cytoscape.Core,
  layoutOptions: any,
  padding: number = 150
): Promise<void> {
  // Get all connected components
  const components = cy.elements().components()
  
  if (components.length === 0) {
    return
  }

  // If there's only one component, run layout normally without component spacing
  if (components.length === 1) {
    console.log('Single component detected, running normal layout')
    return new Promise<void>((resolve) => {
      const layout = cy.layout(layoutOptions)
      layout.on('layoutstop', () => {
        resolve()
      })
      layout.run()
    })
  }

  console.log(`Processing ${components.length} components with individual layouts`)

  // Step 1: Run layout on each component separately
  const componentData: Array<{
    component: cytoscape.Collection
    nodes: cytoscape.NodeCollection
    bbox: ReturnType<typeof getBoundingBox>
  }> = []

  for (let i = 0; i < components.length; i++) {
    const component = components[i]
    const nodes = component.nodes()
    
    console.log(`Running layout on component ${i + 1}/${components.length} with ${nodes.length} nodes`)
    
    // Run layout on this component only
    await new Promise<void>((resolve) => {
      const layout = nodes.layout({
        ...layoutOptions,
        animate: false,
        fit: false,
        // Ensure worker is disabled for component-level layouts
        worker: false,
      })
      
      layout.on('layoutstop', () => {
        resolve()
      })
      
      layout.run()
    })

    // Calculate bounding box after layout (includes nodes, edges, and labels)
    const bbox = getBoundingBox(component, cy)
    
    console.log(`Component ${i + 1} bbox: ${bbox.width.toFixed(1)} x ${bbox.height.toFixed(1)}`)
    
    componentData.push({
      component,
      nodes,
      bbox,
    })
  }

  // Step 2: Sort components by size (largest first)
  componentData.sort((a, b) => {
    const areaA = a.bbox.width * a.bbox.height
    const areaB = b.bbox.width * b.bbox.height
    return areaB - areaA
  })

  // Step 3: Calculate grid layout dimensions
  const totalArea = componentData.reduce(
    (sum, comp) => sum + (comp.bbox.width + padding) * (comp.bbox.height + padding),
    0
  )
  const gridWidth = Math.sqrt(totalArea) * 1.2

  // Step 4: Position components in grid
  let currentX = 0
  let currentY = 0
  let rowHeight = 0

  console.log('Component bounding boxes:', componentData.map(c => ({
    width: c.bbox.width.toFixed(1),
    height: c.bbox.height.toFixed(1),
    nodes: c.nodes.length
  })))

  for (const comp of componentData) {
    const { nodes, bbox } = comp

    // Check if we need to move to next row
    if (currentX > 0 && currentX + bbox.width + padding > gridWidth) {
      console.log(`Moving to next row at x=${currentX}, gridWidth=${gridWidth}`)
      currentX = 0
      currentY += rowHeight + padding
      rowHeight = 0
    }

    // Calculate current center of component
    const currentCenterX = (bbox.x1 + bbox.x2) / 2
    const currentCenterY = (bbox.y1 + bbox.y2) / 2

    // Calculate target position (top-left corner of bounding box)
    const targetX = currentX
    const targetY = currentY

    // Calculate offset needed to move component
    const offsetX = targetX - bbox.x1
    const offsetY = targetY - bbox.y1

    console.log(`Positioning component: bbox=(${bbox.width.toFixed(1)}x${bbox.height.toFixed(1)}), offset=(${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}), target=(${targetX.toFixed(1)}, ${targetY.toFixed(1)})`)

    // Move all nodes in this component
    nodes.forEach((node) => {
      const pos = node.position()
      node.position({
        x: pos.x + offsetX,
        y: pos.y + offsetY,
      })
    })

    // Update position for next component
    currentX += bbox.width + padding
    rowHeight = Math.max(rowHeight, bbox.height)
  }

  console.log(`Arranged ${components.length} components in grid layout with ${padding}px padding`)
}

/**
 * Run layout with per-component processing and grid arrangement
 * @param cy - Cytoscape instance
 * @param layoutOptions - Layout configuration
 * @param padding - Padding between components (default: 150)
 */
export async function runLayoutWithComponentSpacing(
  cy: cytoscape.Core,
  layoutOptions: any,
  padding: number = 150
): Promise<void> {
  await applyComponentSpacing(cy, layoutOptions, padding)
}
