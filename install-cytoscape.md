# Cytoscape.js Installation

To install the required packages for network visualization, run one of these commands in the frontend directory:

## Using npm:
```bash
npm install cytoscape @types/cytoscape
```

## Using pnpm (if available):
```bash
pnpm install cytoscape @types/cytoscape
```

## Using yarn (if available):
```bash
yarn add cytoscape @types/cytoscape
```

After installation, restart your development server to load the new packages.

## Features Added

✅ **Cytoscape.js Integration**: Interactive network visualization
✅ **Multiple Layouts**: COSE, Grid, Circle, Concentric, Breadthfirst, and COSE-Bilkent
✅ **Interactive Controls**: Zoom in/out, fit to screen, fullscreen mode
✅ **Node/Edge Styling**: Color-coded nodes and edges with size mapping
✅ **Selection**: Click to select nodes and edges
✅ **Responsive Design**: Works on different screen sizes
✅ **Loading States**: Visual feedback during network loading

## Usage

1. Navigate to the Networks page
2. Select a network (BioGRIDCC24Y, CollinsCC, or KroganCoreCC)
3. Click on a GDF file to load and visualize the network
4. Use the controls to:
   - Change layout algorithms
   - Zoom in/out
   - Fit the network to screen
   - Toggle fullscreen mode
   - Select nodes/edges for inspection
