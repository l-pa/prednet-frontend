# GO Terms DAG Visualization Guide

## Overview

The GO Terms DAG (Directed Acyclic Graph) visualization provides a hierarchical view of Gene Ontology terms when comparing multiple proteins. This feature helps you understand the relationships between GO terms and how they are organized in the GO hierarchy.

## Features

### Visual Representation
- **Nodes**: Each GO term is represented as a node
  - **Blue nodes** (#4299e1): GO terms shared by ALL selected proteins
  - **Light blue nodes** (#90cdf4): GO terms present in some (but not all) proteins
  - **Node size**: Scales with the number of proteins that have the term

### Hierarchical Layout
- Uses the **Dagre** layout algorithm for automatic hierarchical positioning
- **Bottom-to-top** layout: Child terms at the bottom, parent terms at the top
- **Arrows** point from child terms to their parent terms

### Interactive Controls
- **Click nodes**: View term details (can be extended)
- **Scroll**: Zoom in/out
- **Drag**: Pan the view
- **Fit View button**: Reset zoom to fit all nodes
- **Re-layout button**: Recalculate the layout

## Usage

### Switching to DAG View

1. Open the GO Terms panel when comparing proteins
2. In the toolbar, select **"DAG View"** (default is "Tree View")
3. Choose which GO domain to visualize:
   - **BP**: Biological Process
   - **CC**: Cellular Component
   - **MF**: Molecular Function

### Understanding the Visualization

#### Node Colors
- **Dark blue**: Terms shared by all proteins (intersection)
- **Light blue**: Terms present in subset of proteins (union mode)

#### Node Size
- Larger nodes = more proteins have this term
- Smaller nodes = fewer proteins have this term

#### Edges (Arrows)
- Show parent-child relationships in the GO hierarchy
- Arrow points from child → parent
- Only shows relationships between terms in the current view

### Comparison Modes

The DAG view respects the comparison mode setting:

- **Intersection Mode**: Shows only GO terms shared by ALL proteins
  - Useful for finding common functionality
  - All nodes will be dark blue (shared)
  
- **Union Mode**: Shows ALL GO terms from any protein
  - Useful for seeing the full picture
  - Mix of dark blue (shared) and light blue (partial) nodes

### Search and Filtering

- Search works in DAG view just like tree view
- Filtered terms maintain their hierarchical relationships
- Parent terms are included even if they don't match the search

## Technical Details

### Implementation
- Built with **Cytoscape.js** for graph rendering
- Uses **cytoscape-dagre** for hierarchical layout
- Integrates with existing GO terms data structure

### Data Structure
```typescript
interface GOTermWithProteins {
  id: string              // GO:0006936
  name: string            // "muscle contraction"
  parents: string[]       // Parent GO IDs
  proteins: string[]      // Proteins that have this term
  evidence?: string       // Evidence code
  p_value?: number        // Statistical significance
}
```

### Performance
- Optimized for datasets up to ~200 terms
- Layout calculation is animated (500ms)
- Can be re-run if needed

## Use Cases

### 1. Finding Common Pathways
Use **Intersection + DAG View** to visualize shared biological processes:
- See which high-level processes are common
- Understand the hierarchy of shared functions

### 2. Comparing Protein Functions
Use **Union + DAG View** to see the full functional landscape:
- Identify unique functions (light blue nodes)
- See how different proteins contribute to the hierarchy

### 3. Exploring GO Hierarchy
- Understand parent-child relationships
- See how specific terms relate to broader categories
- Navigate from specific functions to general processes

## Tips

1. **Start with Biological Process**: Usually has the most interesting hierarchy
2. **Use search** to focus on specific pathways or functions
3. **Zoom in** on dense areas to see term labels clearly
4. **Switch between Tree and DAG** views for different perspectives
5. **Use Intersection mode** first to find commonalities

## Limitations

- Only shows relationships between terms in the current view
- Parent terms outside the filtered set are not displayed
- Very large datasets (>200 terms) may be slow to layout
- Some GO terms may not have parent relationships in the data

## Future Enhancements

Potential improvements:
- Click to expand parent/child terms
- Highlight paths between selected terms
- Export DAG as image
- Show term details in tooltip
- Filter by evidence code or p-value
- Collapse/expand subtrees

## Accessibility

- Keyboard navigation support
- Screen reader announcements for mode changes
- High contrast colors for visibility
- Clear visual hierarchy

## Related Documentation

- [GO Terms Implementation](./GO_TERMS_IMPLEMENTATION.md)
- [GO Terms Utils](../../../utils/GO_TERMS_UTILS_README.md)
- [Protein Comparison Guide](./PROTEIN_COMPARISON_USER_GUIDE.md)
