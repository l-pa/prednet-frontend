# GO Terms Accessibility Testing Checklist

## Quick Start Testing Guide

### Prerequisites
- Screen reader installed (NVDA for Windows, VoiceOver for macOS)
- Browser with developer tools
- Test proteins with GO terms loaded in comparison modal

### Basic Keyboard Navigation Test (5 minutes)

1. **Open the comparison modal** with 2-3 proteins
2. **Tab to GO Terms panel** - should see focus indicator
3. **Press Enter** to expand panel (if collapsed)
4. **Tab through toolbar**:
   - Mode toggle (intersection/union)
   - Search input
5. **Tab into domain sections**:
   - Press Enter to expand/collapse
6. **Tab into tree nodes**:
   - Press Enter/Space to expand nodes with children
   - Press ArrowRight to expand
   - Press ArrowLeft to collapse
7. **Verify**: No keyboard traps, all elements reachable

### Basic Screen Reader Test (10 minutes)

1. **Start screen reader** (NVDA: Ctrl+Alt+N, VoiceOver: Cmd+F5)
2. **Navigate to GO Terms panel**
3. **Listen for announcements**:
   - Panel name and purpose
   - Term count
   - Mode descriptions
4. **Switch modes** - listen for announcement
5. **Type in search** - listen for results count
6. **Navigate tree** - listen for term details
7. **Verify**: All information conveyed via audio

---

## Detailed Testing Checklist

## 1. Keyboard Navigation Tests

### Panel Level Navigation
- [ ] **Tab to panel header** - focus visible
- [ ] **Enter/Space on header** - toggles expansion
- [ ] **Expansion state** - announced to screen reader
- [ ] **Tab order** - logical (toolbar → domains → legend)
- [ ] **Shift+Tab** - reverse navigation works
- [ ] **No keyboard traps** - can always tab away

### Toolbar Navigation
- [ ] **Tab to mode toggle** - focus on first radio button
- [ ] **Arrow keys** - navigate between intersection/union
- [ ] **Enter/Space** - selects mode option
- [ ] **Tab to search input** - focus visible in input
- [ ] **Type in search** - text appears, debounced filtering works
- [ ] **Tab to clear button** - appears when text present
- [ ] **Enter/Space on clear** - clears search
- [ ] **Escape in search** - (optional) clears search

### Domain Section Navigation
- [ ] **Tab to domain header** - focus visible
- [ ] **Enter/Space** - toggles section expansion
- [ ] **Expansion state** - visually indicated
- [ ] **Tab into content** - when expanded
- [ ] **Skip collapsed sections** - tab moves to next section

### Tree Navigation
- [ ] **Tab to first tree node** - focus visible
- [ ] **Tab between nodes** - moves through tree
- [ ] **Enter on node with children** - toggles expansion
- [ ] **Space on node with children** - toggles expansion
- [ ] **ArrowRight on collapsed node** - expands it
- [ ] **ArrowLeft on expanded node** - collapses it
- [ ] **ArrowDown** - moves to next node (browser default)
- [ ] **ArrowUp** - moves to previous node (browser default)
- [ ] **Focus indicator** - always visible
- [ ] **Nested nodes** - keyboard accessible

### Focus Indicators
- [ ] **All focusable elements** - have visible focus indicator
- [ ] **Focus indicator color** - sufficient contrast (blue outline)
- [ ] **Focus indicator size** - 2px outline with 2px offset
- [ ] **Light mode** - focus visible
- [ ] **Dark mode** - focus visible
- [ ] **High contrast mode** - focus visible

---

## 2. Screen Reader Tests (NVDA/JAWS/VoiceOver)

### Panel Announcements
- [ ] **Panel role** - announced as "region"
- [ ] **Panel label** - "Gene Ontology terms comparison panel"
- [ ] **Panel header** - "GO Term Annotations"
- [ ] **Term count** - announced (e.g., "5 terms")
- [ ] **Expansion state** - "expanded" or "collapsed"
- [ ] **Expand/collapse button** - purpose clear

### Toolbar Announcements
- [ ] **Toolbar role** - announced as "toolbar"
- [ ] **Toolbar label** - "GO terms filtering and search controls"
- [ ] **Mode toggle label** - "Comparison mode: choose between intersection or union view"
- [ ] **Intersection option** - "Intersection, Show only GO terms shared by all proteins"
- [ ] **Union option** - "Union, Show all GO terms from any protein"
- [ ] **Search input label** - "Search GO terms by ID or name"
- [ ] **Match count** - announced as status (e.g., "5 matches")

### Mode Change Announcements
- [ ] **Switch to intersection** - "Switched to intersection mode. Showing only GO terms shared by all proteins."
- [ ] **Switch to union** - "Switched to union mode. Showing all GO terms from any protein."
- [ ] **Announcement timing** - immediate after mode change
- [ ] **Announcement interruption** - polite (doesn't interrupt current reading)

### Search Announcements
- [ ] **Search results** - "Found 5 matching GO terms"
- [ ] **No results** - "No GO terms match your search"
- [ ] **Announcement timing** - after debounce (300ms)
- [ ] **Match count updates** - announced as status

### Domain Section Announcements
- [ ] **Section role** - announced as "region"
- [ ] **Section label** - domain name (e.g., "Biological Process GO terms section")
- [ ] **Section header** - domain name with icon
- [ ] **Term count** - announced (e.g., "3 terms")
- [ ] **Expansion state** - "expanded" or "collapsed"
- [ ] **Empty state** - clear message when no terms

### Tree Announcements
- [ ] **Tree role** - announced as "tree"
- [ ] **Tree label** - "GO terms hierarchy with X terms"
- [ ] **Tree selection model** - "not multiselectable"

### Tree Node Announcements
- [ ] **Node role** - announced as "treeitem"
- [ ] **Node level** - nesting level announced (e.g., "level 1", "level 2")
- [ ] **Node label** - complete information:
  - Term name
  - GO ID
  - Expansion state (if has children)
  - Child count (if has children)
  - Protein membership (in union mode)
  - Shared status (if shared by all)
- [ ] **Example**: "muscle contraction, GO:0006936, expanded, 2 child terms, present in TPM1, TPM2, shared by all proteins"
- [ ] **Expansion state** - "expanded" or "collapsed"
- [ ] **Leaf nodes** - no expansion state announced

### Protein Badge Announcements
- [ ] **Badge container** - announced as "list"
- [ ] **Badge container label** - "Proteins with this GO term"
- [ ] **Each badge** - announced as "listitem"
- [ ] **Badge label** - "Present in protein [name]"
- [ ] **Tooltip** - accessible via keyboard focus

### Legend Announcements
- [ ] **Legend role** - announced as "region"
- [ ] **Legend label** - "Legend explaining protein colors and comparison modes"
- [ ] **Protein list** - announced as "list"
- [ ] **Each protein** - announced as "listitem" with name
- [ ] **Color indicators** - hidden from screen reader (aria-hidden)
- [ ] **Mode explanation** - read clearly

### Empty State Announcements
- [ ] **No GO terms** - "No GO term annotations available"
- [ ] **No intersection** - "No shared GO terms across selected proteins"
- [ ] **No search results** - "No GO terms match your search"
- [ ] **Empty domain** - "No [domain] annotations available"

---

## 3. ARIA Attribute Tests

### Verify ARIA Attributes (Browser DevTools)

#### GOTermsPanel
```html
<div role="region" aria-labelledby="go-terms-panel-title" aria-label="Gene Ontology terms comparison panel">
  <button aria-expanded="true" aria-controls="go-terms-panel-content" aria-label="Collapse GO terms panel">
  <div id="go-terms-panel-content">
  <div role="status" aria-live="polite" aria-atomic="true"> <!-- screen reader announcements -->
```

#### GOTermsToolbar
```html
<div role="toolbar" aria-label="GO terms filtering and search controls">
  <div role="radiogroup" aria-label="Comparison mode: choose between intersection or union view">
    <input type="radio" aria-describedby="mode-intersection-desc">
    <input type="radio" aria-describedby="mode-union-desc">
  <input aria-label="Search GO terms by ID or name" aria-describedby="search-results-count">
  <span id="search-results-count" role="status" aria-live="polite">
```

#### GODomainSection
```html
<div role="region" aria-labelledby="go-domain-biological_process-header" aria-label="Biological Process GO terms section">
  <button aria-expanded="true" aria-controls="go-domain-biological_process-content" aria-label="Collapse Biological Process section with 5 terms">
  <div id="go-domain-biological_process-content">
```

#### GOTermTree
```html
<div role="tree" aria-label="GO terms hierarchy with 5 terms" aria-multiselectable="false">
```

#### GOTermNode
```html
<div role="treeitem" aria-expanded="true" aria-level="1" aria-label="muscle contraction, GO:0006936, expanded, 2 child terms, present in TPM1, TPM2, shared by all proteins" tabindex="0">
  <button aria-label="Collapse muscle contraction" aria-hidden="false" tabindex="-1">
  <div role="list" aria-label="Proteins with this GO term">
    <div role="listitem" aria-label="Present in protein TPM1">
```

#### GOTermsLegend
```html
<div role="region" aria-labelledby="go-legend-title" aria-label="Legend explaining protein colors and comparison modes">
  <div role="list" aria-labelledby="go-legend-proteins">
    <div role="listitem">
```

---

## 4. Visual Testing

### Focus Indicators
- [ ] **Visible in light mode** - blue outline clear
- [ ] **Visible in dark mode** - blue outline clear
- [ ] **Sufficient contrast** - meets WCAG AA (3:1)
- [ ] **Not obscured** - by other elements
- [ ] **Consistent style** - across all components

### Color Contrast
- [ ] **Text on background** - meets WCAG AA (4.5:1 for normal text)
- [ ] **Protein badges** - text readable on colored backgrounds
- [ ] **Domain headers** - colored text readable
- [ ] **Search highlight** - yellow background readable
- [ ] **Disabled states** - sufficient contrast

### Zoom and Reflow
- [ ] **200% zoom** - content readable and usable
- [ ] **400% zoom** - no horizontal scrolling
- [ ] **Text reflow** - wraps appropriately
- [ ] **No content loss** - at high zoom levels

### High Contrast Mode
- [ ] **Windows High Contrast** - all elements visible
- [ ] **Focus indicators** - visible in high contrast
- [ ] **Borders** - visible in high contrast
- [ ] **Icons** - visible in high contrast

---

## 5. Functional Accessibility Tests

### Mode Switching
- [ ] **Keyboard switch** - works via arrow keys
- [ ] **Screen reader announcement** - immediate
- [ ] **Visual update** - immediate
- [ ] **Focus retention** - stays on mode toggle

### Search Functionality
- [ ] **Keyboard input** - works normally
- [ ] **Debouncing** - 300ms delay
- [ ] **Results update** - visually and announced
- [ ] **Clear button** - keyboard accessible
- [ ] **Focus management** - stays in search or moves to clear button

### Tree Expansion
- [ ] **Keyboard expand** - Enter/Space/ArrowRight
- [ ] **Keyboard collapse** - Enter/Space/ArrowLeft
- [ ] **Screen reader announcement** - state change announced
- [ ] **Visual update** - immediate
- [ ] **Focus retention** - stays on toggled node

### Tooltips
- [ ] **Keyboard trigger** - focus shows tooltip
- [ ] **Screen reader** - tooltip content announced
- [ ] **Escape to close** - (if applicable)
- [ ] **Hover trigger** - still works for mouse users

### Error States
- [ ] **No GO terms** - message announced
- [ ] **No intersection** - message announced
- [ ] **No search results** - message announced
- [ ] **Loading state** - announced (if implemented)

---

## 6. Cross-Browser Testing

### Chrome/Edge (Chromium)
- [ ] **Keyboard navigation** - works
- [ ] **Focus indicators** - visible
- [ ] **ARIA attributes** - recognized
- [ ] **Screen reader** - NVDA works

### Firefox
- [ ] **Keyboard navigation** - works
- [ ] **Focus indicators** - visible
- [ ] **ARIA attributes** - recognized
- [ ] **Screen reader** - NVDA works

### Safari
- [ ] **Keyboard navigation** - works
- [ ] **Focus indicators** - visible
- [ ] **ARIA attributes** - recognized
- [ ] **Screen reader** - VoiceOver works

---

## 7. Screen Reader Specific Tests

### NVDA (Windows)
- [ ] **Browse mode** - can read all content
- [ ] **Focus mode** - can interact with controls
- [ ] **Mode switching** - automatic and manual
- [ ] **Live regions** - announcements heard
- [ ] **Tree navigation** - works with arrow keys
- [ ] **Forms mode** - search input works

### JAWS (Windows)
- [ ] **Virtual cursor** - can read all content
- [ ] **PC cursor** - can interact with controls
- [ ] **Cursor switching** - automatic and manual
- [ ] **Live regions** - announcements heard
- [ ] **Tree navigation** - works with arrow keys
- [ ] **Forms mode** - search input works

### VoiceOver (macOS)
- [ ] **VO cursor** - can read all content
- [ ] **VO+Space** - activates controls
- [ ] **Live regions** - announcements heard
- [ ] **Tree navigation** - works with VO+arrow keys
- [ ] **Rotor** - can navigate by landmarks/headings

---

## 8. WCAG 2.1 Compliance Verification

### Level A
- [ ] **1.1.1 Non-text Content** - All icons have text alternatives
- [ ] **2.1.1 Keyboard** - All functionality keyboard accessible
- [ ] **2.1.2 No Keyboard Trap** - Can navigate away from all elements
- [ ] **3.3.2 Labels or Instructions** - All inputs labeled
- [ ] **4.1.1 Parsing** - Valid HTML/ARIA
- [ ] **4.1.2 Name, Role, Value** - All components properly identified

### Level AA
- [ ] **1.4.3 Contrast (Minimum)** - Text contrast ≥ 4.5:1
- [ ] **1.4.5 Images of Text** - No images of text used
- [ ] **2.4.6 Headings and Labels** - Descriptive labels
- [ ] **2.4.7 Focus Visible** - Focus indicators visible
- [ ] **3.2.4 Consistent Identification** - Similar elements consistent
- [ ] **4.1.3 Status Messages** - Status changes announced

---

## Testing Tools

### Browser Extensions
- **axe DevTools** - Automated accessibility testing
- **WAVE** - Visual accessibility evaluation
- **Lighthouse** - Accessibility audit in Chrome DevTools

### Screen Readers
- **NVDA** - Free, Windows (https://www.nvaccess.org/)
- **JAWS** - Commercial, Windows (https://www.freedomscientific.com/products/software/jaws/)
- **VoiceOver** - Built-in, macOS/iOS

### Keyboard Testing
- **Tab key** - Forward navigation
- **Shift+Tab** - Backward navigation
- **Arrow keys** - Tree/radio navigation
- **Enter/Space** - Activation
- **Escape** - Cancel/close (where applicable)

### Color Contrast Tools
- **WebAIM Contrast Checker** - https://webaim.org/resources/contrastchecker/
- **Chrome DevTools** - Built-in contrast checker

---

## Common Issues to Watch For

### Keyboard Navigation
- ❌ Keyboard traps (can't tab away)
- ❌ Missing focus indicators
- ❌ Illogical tab order
- ❌ Can't reach all interactive elements

### Screen Reader
- ❌ Missing labels on inputs/buttons
- ❌ Decorative elements not hidden
- ❌ Status changes not announced
- ❌ Overly verbose announcements
- ❌ Confusing tree structure

### Visual
- ❌ Low contrast text
- ❌ Color as only indicator
- ❌ Content hidden at high zoom
- ❌ Focus indicator not visible

### Functional
- ❌ Tooltips not keyboard accessible
- ❌ Error states not announced
- ❌ Mode changes not announced
- ❌ Search results not announced

---

## Reporting Issues

When reporting accessibility issues, include:
1. **Component** - Which component has the issue
2. **Issue type** - Keyboard, screen reader, visual, etc.
3. **Steps to reproduce** - Exact steps to see the issue
4. **Expected behavior** - What should happen
5. **Actual behavior** - What actually happens
6. **Browser/SR** - Browser and screen reader used
7. **WCAG criterion** - Which guideline is violated (if applicable)

Example:
```
Component: GOTermNode
Issue type: Screen reader
Steps: 1. Navigate to tree node with NVDA, 2. Listen to announcement
Expected: Should announce "muscle contraction, GO:0006936, present in TPM1"
Actual: Only announces "muscle contraction"
Browser/SR: Chrome 120 / NVDA 2023.3
WCAG: 4.1.2 Name, Role, Value
```

---

## Quick Reference: Keyboard Shortcuts

| Action | Key |
|--------|-----|
| Navigate forward | Tab |
| Navigate backward | Shift+Tab |
| Activate button/toggle | Enter or Space |
| Expand node | Enter, Space, or ArrowRight |
| Collapse node | Enter, Space, or ArrowLeft |
| Navigate radio buttons | Arrow keys |
| Clear search | Tab to clear button, then Enter |

## Quick Reference: Screen Reader Commands

### NVDA
| Action | Command |
|--------|---------|
| Start/Stop | Ctrl+Alt+N |
| Read next | Down arrow |
| Read previous | Up arrow |
| Next heading | H |
| Next landmark | D |
| Next button | B |
| Forms mode | Enter (automatic) |

### VoiceOver
| Action | Command |
|--------|---------|
| Start/Stop | Cmd+F5 |
| Read next | VO+Right arrow |
| Read previous | VO+Left arrow |
| Activate | VO+Space |
| Open rotor | VO+U |
