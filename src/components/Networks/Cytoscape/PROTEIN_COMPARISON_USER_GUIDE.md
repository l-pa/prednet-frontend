# Protein Comparison Feature - User Guide

## How to Compare Proteins

### From the "Proteins by Network" Page

1. **Navigate to the Proteins page**
   - Go to the "Proteins by Network" section in your application

2. **Select a network**
   - Choose a network from the left panel to view its proteins

3. **Select proteins to compare**
   - Check the boxes next to 2 or more proteins you want to compare
   - The "Selected: X" counter at the bottom shows how many proteins you've selected

4. **Open the comparison**
   - Click the blue "Compare Proteins" button at the bottom of the protein list
   - Note: This button is only enabled when you have 2 or more proteins selected

5. **View the comparison**
   - A modal will open showing:
     - Protein sequence lengths (scaled bars)
     - Feature annotations (domains, regions, motifs, etc.)
     - Color-coded feature types
     - Feature legend at the bottom

6. **Interact with the comparison**
   - Hover over features to see details
   - Click the X button on any protein to remove it from the comparison
   - Click "Retry" if there are loading errors
   - Press Escape or click outside to close the modal

### From the Network Visualization (Cytoscape)

1. **Open a network visualization**
   - Navigate to a network view with the Cytoscape renderer

2. **Select proteins in the sidebar**
   - Use the "Info" panel in the sidebar
   - Check the boxes next to proteins you want to compare

3. **Click "View Comparison"**
   - The button appears at the bottom of the Info panel when 2+ proteins are selected

4. **View and interact**
   - Same comparison modal as above will open

## Features

### Visual Comparison
- **Sequence Length**: Each protein is shown as a horizontal bar scaled to its sequence length
- **Feature Annotations**: Colored blocks show different types of features:
  - Domains (functional protein regions)
  - Regions (specific sequence regions)
  - Motifs (short sequence patterns)
  - Sites (specific amino acid positions)
  - And more...

### Feature Legend
- Shows all feature types present in the selected proteins
- Color-coded for easy identification
- Automatically updates based on visible features

### Error Handling
- **Partial Failures**: If some proteins fail to load, you'll see a warning but can still view the successful ones
- **Complete Failures**: Clear error messages with retry option
- **Network Errors**: User-friendly messages for connection issues

### Accessibility
- Full keyboard navigation support
- Screen reader compatible
- ARIA labels and live regions for status updates

## Tips

- **Minimum Selection**: You need at least 2 proteins to enable the comparison
- **Maximum Recommended**: While there's no hard limit, comparing 5-10 proteins at once provides the best viewing experience
- **Performance**: Protein data is cached for 1 hour, so repeated comparisons are fast
- **Retry**: If a protein fails to load, try removing it and adding it back, or use the Retry button

## Troubleshooting

### "Compare Proteins" button is disabled
- Make sure you have selected at least 2 proteins
- Check that a network is selected

### Proteins fail to load
- Check your internet connection
- Verify the protein identifiers are valid
- Try refreshing the page
- Check if the backend server is running

### Modal doesn't open
- Ensure you have a network selected
- Check the browser console for errors
- Try refreshing the page

### Features not displaying
- Some proteins may not have feature annotations in UniProt
- This is normal and not an error
- The protein will still show its sequence length

## Data Source

Protein feature data is fetched from UniProt (Universal Protein Resource), a comprehensive database of protein sequence and functional information. Features include:
- Domains and repeats
- Regions of interest
- Sequence motifs
- Active sites
- Binding sites
- Post-translational modifications
- And more...

## Privacy & Performance

- Authentication tokens are stored securely in localStorage
- API requests are cached for 1 hour to improve performance
- No protein data is stored permanently in the browser
- All data is fetched fresh from the backend when needed
