# ELK Layout White Screen Fix

## Problem
When running the ELK layout algorithm on large networks, the network would disappear (white screen) after the layout finished computing. This was caused by nodes being positioned at extreme or invalid coordinates.

## Root Cause
1. ELK layout sometimes produces coordinates outside the visible viewport
2. The `cy.fit()` call after layout completion couldn't properly fit nodes with extreme positions
3. For large networks (>500 nodes), the force-directed algorithm was unstable

## Solution

### 1. Position Validation
Added validation to check if ELK layout produced valid node positions before fitting:

```typescript
if (selectedLayout === 'elk') {
  const nodes = cy.nodes()
  let hasValidPositions = false
  
  // Check if at least some nodes have reasonable positions
  nodes.forEach((node) => {
    const pos = node.position()
    if (pos && isFinite(pos.x) && isFinite(pos.y) && 
        Math.abs(pos.x) < 1e6 && Math.abs(pos.y) < 1e6) {
      hasValidPositions = true
    }
  })
  
  if (!hasValidPositions) {
    console.warn('ELK layout produced invalid positions, resetting to grid')
    // Fallback to grid layout if ELK fails
    cy.layout({ name: 'grid', animate: false, fit: true }).run()
    return
  }
}
```

### 2. Algorithm Selection Based on Network Size
For large networks (>500 nodes), switched from force-directed to layered algorithm:

**Small Networks (<500 nodes):**
- Algorithm: `force` (force-directed)
- Better for organic, natural-looking layouts
- More computationally intensive but produces better results

**Large Networks (≥500 nodes):**
- Algorithm: `layered` (hierarchical)
- More stable and predictable
- Faster computation
- Better suited for large graphs

### 3. Improved Spacing Parameters
Increased spacing to prevent node overlap and improve readability:

```typescript
'elk.spacing.componentComponent': 50,  // Increased from 5
'elk.spacing.nodeNode': 30,            // Increased from 15
```

## Configuration Details

### Small Networks (<500 nodes)
```typescript
{
  name: 'elk',
  nodeDimensionsIncludeLabels: true,
  fit: false,
  animate: false,
  worker: true,
  elk: {
    algorithm: 'force',
    'elk.force.repulsion': 20,
    'elk.force.temperature': 0.001,
    'elk.force.iterations': 300,
    'elk.spacing.componentComponent': 50,
    'elk.spacing.nodeNode': 30,
  },
}
```

### Large Networks (≥500 nodes)
```typescript
{
  name: 'elk',
  nodeDimensionsIncludeLabels: false,  // Disabled for performance
  fit: false,
  animate: false,
  worker: true,
  elk: {
    algorithm: 'layered',
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': 30,
    'elk.spacing.componentComponent': 50,
    'elk.layered.spacing.nodeNodeBetweenLayers': 30,
    'elk.layered.spacing.edgeNodeBetweenLayers': 20,
  },
}
```

## Benefits

1. **Stability**: Layered algorithm is more stable for large networks
2. **Fallback**: Automatic fallback to grid layout if ELK produces invalid positions
3. **Performance**: Faster computation for large networks
4. **Visibility**: Nodes are always visible after layout completion
5. **Better Spacing**: Improved readability with increased node spacing

## Testing Recommendations

1. Test with networks of various sizes:
   - Small: <100 nodes
   - Medium: 100-500 nodes
   - Large: 500-1000 nodes
   - Very large: >1000 nodes

2. Verify that:
   - Network is visible after layout completes
   - Nodes are properly spaced
   - Components are separated
   - Zoom level is appropriate

3. Check edge cases:
   - Single component networks
   - Multiple disconnected components
   - Very dense networks
   - Very sparse networks

## Known Limitations

1. **Very Large Networks (>2000 nodes)**: ELK may still be slow. Consider using simpler layouts like grid or circle.
2. **Disconnected Components**: Layered algorithm may not handle disconnected components as well as force-directed.
3. **Label Overlap**: With `nodeDimensionsIncludeLabels: false` on large networks, labels may overlap.

## Alternative Layouts for Large Networks

If ELK still has issues, consider these alternatives:

1. **fcose**: Fast, force-directed, good for most networks
2. **cose-bilkent**: Similar to fcose but with different parameters
3. **cola**: Constraint-based layout, good for avoiding overlaps
4. **grid**: Simple, fast, always works (fallback option)
5. **circle**: Simple, fast, good for showing connectivity

## Future Improvements

Possible enhancements:
- Add user preference for ELK algorithm (force vs layered)
- Implement progressive rendering for very large networks
- Add option to preview layout before applying
- Implement layout caching to avoid recomputation
- Add layout quality metrics to help users choose best layout
