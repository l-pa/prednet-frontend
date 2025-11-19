# Component Protein Labels - Visual Guide

## What You'll See

When you select proteins and view a component subgraph, here's what the visualization looks like:

```
                    [Protein1, Protein2]  ← Green label showing proteins in component
                            ↓
                    ┌───────────────┐
                    │               │
                    │     Node      │  ← Dashed green border (component highlight)
                    │               │     Solid blue border (if node has proteins)
                    └───────────────┘
```

## Visual Elements

### 1. Component Label (Green Badge)
- **Position**: Floats 15px above each node
- **Background**: Green (#4CAF50) with 90% opacity
- **Text**: White, bold, 9px font
- **Content**: Comma-separated list of selected proteins in the component
- **Example**: `"YAL001C, YAL003W, YAL005C"`

### 2. Component Border (Dashed Green)
- **Style**: Dashed line
- **Color**: Green (#4CAF50) with 70% opacity
- **Width**: 2px
- **Applied to**: All nodes in components containing at least one selected protein

### 3. Node Border (Solid Blue)
- **Style**: Solid line
- **Color**: Blue (#2196F3)
- **Width**: 3px (configurable via selectedBorderWidth)
- **Applied to**: Individual nodes that contain selected proteins

### 4. Dimmed Nodes
- **Opacity**: 25% for nodes, 20% for text
- **Applied to**: Nodes that don't contain any selected proteins

## Example Scenarios

### Scenario 1: Single Protein Selected
```
User selects: "YAL001C"

Component #0 contains:
- Node A: YAL001C, YAL002W
- Node B: YAL002W, YAL003W
- Node C: YAL001C

Result:
- All three nodes show label: "YAL001C"
- All three nodes have dashed green border
- Node A and C have solid blue border (they contain YAL001C)
- Node B is not dimmed (it's in the component)
```

### Scenario 2: Multiple Proteins Selected (OR mode)
```
User selects: "YAL001C", "YAL003W"

Component #0 contains:
- Node A: YAL001C, YAL002W
- Node B: YAL002W, YAL004W
- Node C: YAL003W, YAL005W

Result:
- All three nodes show label: "YAL001C, YAL003W"
- All three nodes have dashed green border
- Node A has solid blue border (contains YAL001C)
- Node C has solid blue border (contains YAL003W)
- Node B has only dashed green border (in component but no selected proteins)
```

### Scenario 3: Multiple Proteins Selected (AND mode)
```
User selects: "YAL001C", "YAL003W"

Component #0 contains:
- Node A: YAL001C, YAL002W
- Node B: YAL001C, YAL003W, YAL004W
- Node C: YAL003W, YAL005W

Result:
- All three nodes show label: "YAL001C, YAL003W"
- All three nodes have dashed green border
- Only Node B has solid blue border (contains BOTH proteins)
- Nodes A and C have only dashed green border
```

## Color Palette

| Element | Color | Hex | Opacity |
|---------|-------|-----|---------|
| Component Label Background | Green | #4CAF50 | 90% |
| Component Label Text | White | #FFFFFF | 100% |
| Component Border | Green | #4CAF50 | 70% |
| Node Border | Blue | #2196F3 | 100% |
| Dimmed Nodes | Gray | - | 25% |

## Z-Index Layering

From bottom to top:
1. Edges (z-index: 5)
2. Regular nodes (z-index: 10)
3. Highlighted nodes (z-index: 9999)
4. Hovered nodes (z-index: 100001)
5. Edge hover labels (z-index: 100002)
6. **Component protein labels (z-index: 100003)** ← Highest priority

This ensures component labels are always visible above all other elements.

## Responsive Behavior

### Zoom Levels
- Labels remain visible at all zoom levels
- Font size is fixed (9px) but readable due to high contrast
- Background padding ensures text is always legible

### Large Components
- Labels appear on every node in the component
- This provides redundancy - you can see the proteins from any node
- Helps with navigation in dense networks

### Label Overlap
- Labels are positioned above nodes to minimize overlap with node labels
- Node labels appear centered on the node
- Edge hover labels appear even higher (with negative margin)

## Accessibility

- **High Contrast**: White text on green background (WCAG AA compliant)
- **Clear Borders**: Dashed vs solid borders provide visual distinction
- **Redundant Information**: Same label on all nodes in component
- **Persistent Display**: Labels don't disappear on hover/unhover

## Performance

- Labels only render when proteins are selected
- Efficient BFS algorithm for component detection
- Batched Cytoscape operations for smooth updates
- Automatic cleanup when proteins are deselected
