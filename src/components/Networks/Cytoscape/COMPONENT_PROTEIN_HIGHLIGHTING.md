# Component Protein Highlighting Feature

## Overview
When proteins are selected for highlighting, the network provides visual feedback at both the node and component levels. This works in both the full network view and when viewing individual component subgraphs after clicking "Get components".

**Key Feature**: When you select proteins and navigate to a component (by clicking component numbers like `#0`, `#1` in the sidebar), each node in that component will show a label above it indicating which of your selected proteins are present in that component.

## Features

### 1. Node-Level Highlighting
- Nodes containing selected proteins are highlighted with a **solid blue border** (`#2196F3`)
- Individual nodes show which specific proteins they contain

### 2. Component-Level Highlighting
- **All nodes** in a component that contains at least one selected protein receive a **dashed green border** (`#4CAF50`)
- This makes it easy to identify entire connected components that are relevant to your protein selection

### 3. Component Protein Labels
- Each node in a highlighted component displays an **enhanced label** showing which selected proteins are present in that component
- The label format is:
  ```
  [Protein1, Protein2]
  OriginalNodeLabel
  ```
- The label appears with:
  - Green background (`#4CAF50`)
  - White text
  - Centered on the node
  - Font size: 8px, bold (600 weight)
  - Rounded rectangle background with padding
  - Proteins shown in brackets at the top, original label below

## Visual Hierarchy

The highlighting system uses multiple visual layers:

1. **Dimmed nodes** (opacity 0.25): Nodes that don't contain any selected proteins
2. **Component highlight** (dashed green border): All nodes in components containing selected proteins
3. **Node highlight** (solid blue border): Individual nodes containing selected proteins
4. **Component label** (green badge above node): Shows which proteins are in the component

## How It Works

### Algorithm
1. When proteins are selected, the system performs a BFS (Breadth-First Search) to identify all connected components
2. For each component, it collects all matched proteins from nodes within that component
3. Each node in a component with matched proteins receives:
   - `componentHighlight = 1` data attribute
   - `componentProteins` data attribute with comma-separated protein names
4. Cytoscape styles automatically apply based on these data attributes

### Data Attributes
- `proteinHighlight`: 1 if node contains selected proteins (node-level)
- `componentHighlight`: 1 if node is in a component with selected proteins (component-level)
- `componentProteins`: Comma-separated list of selected proteins found in the component
- `matchedProteins`: Array of proteins matched in this specific node

## Interaction with Other Features

### Filter Components by Proteins
When "Filter Components by Proteins" is enabled:
- Only components containing selected proteins are shown
- Other components are hidden
- Component labels still appear on visible components

### Highlight Mode (AND/OR)
- **OR mode**: Component is highlighted if it contains ANY of the selected proteins
- **AND mode**: Component is highlighted only if it contains ALL selected proteins

## Styling Details

### Component Border
```typescript
{
  selector: "node[componentHighlight = 1]",
  style: {
    "border-width": 2,
    "border-color": "#4CAF50",
    "border-opacity": 0.7,
    "border-style": "dashed",
  },
}
```

### Component Label
```typescript
{
  selector: "node[componentProteins]",
  style: {
    label: "data(componentProteins)",
    "font-size": 9,
    "font-weight": 600,
    "text-valign": "top",
    "text-margin-y": -15,
    "text-background-color": "#4CAF50",
    "text-background-opacity": 0.9,
    color: "#ffffff",
    "z-index": 100003,
  },
}
```

## Performance Considerations

- Component detection uses efficient BFS traversal
- Labels are only computed when proteins are actively selected
- All operations are batched within Cytoscape for optimal performance
- Component data is cleared when protein selection is cleared

## User Experience

This feature helps users:
1. **Quickly identify** which components contain their proteins of interest
2. **Understand relationships** between selected proteins within components
3. **Navigate large networks** more efficiently by seeing component-level context
4. **Make informed decisions** about which components to explore further

## Usage with Component Subgraphs

### Workflow
1. Select a node in the network to open the sidebar
2. In the "Component protein distribution" section, click the target icon next to proteins to highlight them
3. The full network will show:
   - Nodes containing those proteins (solid blue border)
   - All nodes in components containing those proteins (dashed green border)
   - Labels above nodes showing which proteins are in each component
4. Click on a component number (e.g., `#0`, `#1`) under "Other components" to view that component
5. The component subgraph view will automatically show:
   - Which nodes in that specific component contain the selected proteins
   - A label above each node showing the proteins found in that component
   - The same visual highlighting system (blue for individual nodes, green for component-level)

### Automatic Updates
- Protein highlighting automatically recomputes when:
  - You select/deselect proteins
  - You navigate to a different component
  - The graph layout changes
- Labels persist across component navigation, making it easy to compare proteins across different components
