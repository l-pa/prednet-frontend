# Accessibility Testing Guide for Protein Comparison Feature

This guide provides step-by-step instructions for testing the accessibility features of the protein sequence comparison visualization.

## Prerequisites

- A screen reader installed (NVDA for Windows, JAWS, or VoiceOver for Mac)
- A keyboard (no mouse)
- A browser with developer tools

## Test 1: Keyboard Navigation - Protein Selection

### Steps:
1. Open the network visualization
2. Click on a node to open the sidebar
3. Expand "Component protein distribution" section
4. Use **Tab** to navigate to the first "Compare" button
5. Press **Enter** or **Space** to select the protein
6. Verify the button changes appearance (solid variant)
7. Use **Tab** to navigate to another "Compare" button
8. Press **Enter** or **Space** to select another protein
9. Continue tabbing until you reach the "View Comparison" button
10. Press **Enter** or **Space** to open the modal

### Expected Results:
- ✓ All buttons are reachable via Tab key
- ✓ Focus indicators are clearly visible
- ✓ Selected proteins show visual indication
- ✓ "View Comparison" button appears after selecting 2+ proteins
- ✓ Modal opens when Enter/Space is pressed

## Test 2: Keyboard Navigation - Modal Interaction

### Steps:
1. With the comparison modal open, press **Tab** repeatedly
2. Verify focus moves through:
   - First protein's remove button
   - First protein's feature segments (if any)
   - Second protein's remove button
   - Second protein's feature segments (if any)
   - Close button (X in top right)
3. Press **Escape** key
4. Verify modal closes

### Expected Results:
- ✓ Tab order is logical (top to bottom, left to right)
- ✓ All interactive elements are reachable
- ✓ Focus indicators are visible on all elements
- ✓ Escape key closes the modal
- ✓ Focus returns to "View Comparison" button after closing

## Test 3: Screen Reader - Selection Announcements

### Steps (with screen reader active):
1. Navigate to a "Compare" button
2. Activate it with Enter/Space
3. Listen for announcement
4. Navigate to another "Compare" button
5. Activate it
6. Listen for announcement
7. Navigate to a selected protein's "Compare" button
8. Activate it to deselect
9. Listen for announcement

### Expected Announcements:
- ✓ "{Protein name} added to comparison"
- ✓ "2 proteins selected for comparison. You can now view the comparison."
- ✓ "{Protein name} removed from comparison"
- ✓ "1 protein selected for comparison"

## Test 4: Screen Reader - Modal Content

### Steps (with screen reader active):
1. Open the comparison modal
2. Listen for modal announcement
3. Navigate through the modal content
4. Focus on a feature segment
5. Listen for feature details
6. Navigate to remove buttons
7. Listen for button labels

### Expected Announcements:
- ✓ "Protein Feature Comparison" (modal title)
- ✓ "Comparing protein sequence features for X selected proteins..." (description)
- ✓ "Protein feature visualization for {protein name}" (region label)
- ✓ "{Feature type}: {description}, position {start} to {end}, length {length} amino acids" (feature details)
- ✓ "Remove {protein} from comparison" (button label)

## Test 5: Screen Reader - Error States

### Steps (with screen reader active):
1. Select proteins that don't exist or have errors
2. Open comparison modal
3. Listen for error announcements
4. Navigate to retry button
5. Listen for button label

### Expected Announcements:
- ✓ "Warning: Some proteins could not be loaded..." (partial failure)
- ✓ "Error loading {protein}: {error message}" (individual protein error)
- ✓ "Retry loading protein features" (button label)

## Test 6: Screen Reader - Loading States

### Steps (with screen reader active):
1. Open comparison modal while data is loading
2. Listen for loading announcement
3. Wait for data to load
4. Listen for completion announcement

### Expected Announcements:
- ✓ "Loading protein features..." (loading state)
- ✓ "Fetching data for X proteins" (loading details)
- ✓ "Comparing X proteins" (success state)

## Test 7: Color Contrast

### Steps:
1. Open browser developer tools
2. Use accessibility inspector or contrast checker
3. Check contrast ratios for:
   - Feature segment colors with white text
   - Error messages (red text on light background)
   - Warning messages (orange text on light background)
   - Button text on backgrounds

### Expected Results:
- ✓ All text has contrast ratio ≥ 4.5:1 (WCAG AA)
- ✓ Large text has contrast ratio ≥ 3:1 (WCAG AA)
- ✓ Interactive elements have visible focus indicators

## Test 8: Focus Management

### Steps:
1. Open comparison modal
2. Note the focused element
3. Close modal with Escape
4. Verify focus returns to "View Comparison" button
5. Open modal again
6. Remove a protein
7. Verify focus moves appropriately

### Expected Results:
- ✓ Focus is trapped within modal when open
- ✓ Focus returns to trigger button when modal closes
- ✓ Focus moves logically after removing proteins
- ✓ No focus loss or keyboard traps

## Test 9: Tooltips and Hover States

### Steps:
1. Navigate to a feature segment with Tab
2. Verify tooltip appears on focus
3. Move focus away
4. Verify tooltip disappears
5. Hover over feature segment with mouse
6. Verify tooltip appears
7. Move mouse away
8. Verify tooltip disappears

### Expected Results:
- ✓ Tooltips appear on both focus and hover
- ✓ Tooltips contain complete feature information
- ✓ Tooltips are positioned appropriately
- ✓ Tooltips don't obscure other content

## Test 10: Complete Workflow (Keyboard Only)

### Steps:
1. Start with no mouse, keyboard only
2. Navigate to sidebar
3. Select 2+ proteins for comparison
4. Open comparison modal
5. Review protein features
6. Remove a protein
7. Close modal
8. Deselect remaining proteins

### Expected Results:
- ✓ Entire workflow completable with keyboard only
- ✓ All actions have keyboard equivalents
- ✓ No mouse-only interactions
- ✓ Logical tab order throughout

## Test 11: Complete Workflow (Screen Reader Only)

### Steps:
1. Start with screen reader active, no visual reference
2. Navigate to sidebar
3. Select proteins for comparison
4. Open comparison modal
5. Understand protein features from announcements
6. Remove a protein
7. Close modal

### Expected Results:
- ✓ All information available via screen reader
- ✓ Announcements are clear and descriptive
- ✓ No visual-only information
- ✓ Workflow is understandable without seeing screen

## Common Issues to Watch For

### Keyboard Navigation
- ❌ Focus indicators not visible
- ❌ Tab order is illogical
- ❌ Interactive elements not reachable
- ❌ Keyboard traps (can't escape with Tab/Escape)

### Screen Reader
- ❌ Missing or unclear labels
- ❌ Announcements not triggered
- ❌ Too much or too little information
- ❌ Confusing or technical jargon

### Visual
- ❌ Low contrast text
- ❌ Information conveyed by color alone
- ❌ Text too small to read
- ❌ Focus indicators missing

### Functional
- ❌ Features only work with mouse
- ❌ Modals don't trap focus
- ❌ Focus lost after actions
- ❌ Escape key doesn't work

## Automated Testing Tools

### Browser Extensions
- **axe DevTools**: Comprehensive accessibility testing
- **WAVE**: Visual accessibility evaluation
- **Lighthouse**: Accessibility audit in Chrome DevTools

### Command Line
```bash
# Run Playwright accessibility tests (if configured)
cd frontend
npx playwright test --grep accessibility
```

## Reporting Issues

When reporting accessibility issues, include:
1. **Issue type**: Keyboard, screen reader, visual, or functional
2. **Steps to reproduce**: Detailed steps
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Environment**: Browser, OS, screen reader (if applicable)
6. **Severity**: Critical, high, medium, or low

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Chakra UI Accessibility](https://chakra-ui.com/docs/styled-system/accessibility)
