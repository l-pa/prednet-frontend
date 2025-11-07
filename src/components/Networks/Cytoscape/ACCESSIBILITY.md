# Accessibility Features

This document outlines the accessibility features implemented in the Cytoscape performance components to ensure they are usable by all users, including those using assistive technologies.

## Overview

All performance-related components have been enhanced with comprehensive accessibility features including:
- ARIA labels and descriptions
- Keyboard navigation support
- Live regions for dynamic content
- Focus management
- Screen reader announcements
- Dark mode support

## Components

### PerformanceIndicator

**Location**: `frontend/src/components/Networks/Cytoscape/PerformanceIndicator.tsx`

**Accessibility Features**:
- **ARIA Labels**: Button has descriptive `aria-label` that includes tier, node count, and edge count
- **Role**: Marked as `status` with `aria-live="polite"` for screen reader announcements
- **Keyboard Navigation**: Fully keyboard accessible with `tabIndex={0}`
- **Focus Indicators**: Clear focus outline (2px solid blue) with offset for visibility
- **Hover States**: Visual feedback on hover with opacity change
- **Tooltip**: Properly labeled with `role="tooltip"` and descriptive headings
- **Dark Mode**: Full support with appropriate color contrasts

**Keyboard Shortcuts**:
- `Tab`: Focus on the indicator
- `Enter` or `Space`: Activate to view tooltip details
- `Escape`: Close tooltip (handled by Chakra UI)

**Screen Reader Experience**:
```
"Performance tier: Moderate. 300 nodes, 600 edges. Press Enter or Space to view details."
```

### PerformanceWarning

**Location**: `frontend/src/components/Networks/Cytoscape/PerformanceWarning.tsx`

**Accessibility Features**:
- **ARIA Labels**: Alert has `role="alert"` with `aria-live="polite"` and `aria-atomic="true"`
- **Labeled Regions**: Title has unique ID referenced by `aria-labelledby`
- **Dismiss Button**: Clear `aria-label` describing the action
- **Action Buttons**: Descriptive labels explaining what will happen
- **Focus Indicators**: Clear focus outlines on all interactive elements
- **List Semantics**: Recommendations use proper `<ul>` structure
- **Dark Mode**: Tier-specific colors optimized for both light and dark themes

**Keyboard Shortcuts**:
- `Tab`: Navigate between dismiss button and action buttons
- `Enter` or `Space`: Activate buttons
- `Escape`: Dismiss warning (if implemented)

**Screen Reader Experience**:
```
"Alert: Large Network Detected. Network contains 600 nodes and 1,200 edges.
Recommendations:
- Switch to grid layout for significantly faster rendering
- Edge labels are hidden during viewport changes to improve performance
- Consider filtering your data to reduce network size
- Layout computation may take several seconds"
```

### LayoutProgressOverlay

**Location**: `frontend/src/components/Networks/Cytoscape/LayoutProgressOverlay.tsx`

**Accessibility Features**:
- **Dialog Role**: Marked as `role="dialog"` with `aria-modal="false"` (non-blocking)
- **Labeled Regions**: Title and description properly linked with IDs
- **Live Regions**: Progress updates use `aria-live="polite"` and `aria-atomic="true"`
- **Status Updates**: Elapsed time and estimates announced to screen readers
- **Cancel Button**: Clear label explaining the action and outcome
- **Focus Management**: Cancel button has clear focus indicator
- **Spinner**: Labeled with current operation state
- **Dark Mode**: High contrast colors for readability

**Keyboard Shortcuts**:
- `Tab`: Focus on cancel button (when visible)
- `Enter` or `Space`: Cancel layout and apply grid layout

**Screen Reader Experience**:
```
"Dialog: Computing network layout...
cose-bilkent algorithm
Elapsed: 0:05
Approximately 12 seconds remaining
This may take a while for large networks...
Cancel layout computation and apply grid layout button"
```

## ARIA Attributes Reference

### Live Regions
- `aria-live="polite"`: Announces changes when user is idle (used for status updates)
- `aria-atomic="true"`: Announces entire region content on change

### Roles
- `role="status"`: Indicates status information
- `role="alert"`: Indicates important, time-sensitive information
- `role="dialog"`: Indicates a dialog window
- `role="tooltip"`: Indicates tooltip content

### Labels and Descriptions
- `aria-label`: Provides accessible name for elements
- `aria-labelledby`: References element(s) that label the current element
- `aria-describedby`: References element(s) that describe the current element

## Testing Guidelines

### Keyboard Navigation Testing
1. Use `Tab` to navigate through all interactive elements
2. Verify focus indicators are clearly visible
3. Test `Enter` and `Space` keys on all buttons
4. Ensure `Escape` closes dismissible elements

### Screen Reader Testing
Tested with:
- **NVDA** (Windows)
- **JAWS** (Windows)
- **VoiceOver** (macOS)
- **TalkBack** (Android)

**Test Scenarios**:
1. Navigate to performance indicator and hear status
2. Activate indicator and hear tooltip content
3. Receive warning and hear all recommendations
4. Monitor layout progress with live updates
5. Cancel layout operation

### Color Contrast Testing
All components meet WCAG 2.1 Level AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- Interactive elements: 3:1 contrast ratio

**Tools Used**:
- Chrome DevTools Lighthouse
- axe DevTools
- WAVE Browser Extension

### Dark Mode Testing
All components tested in both light and dark modes:
- ✅ Text remains readable
- ✅ Focus indicators remain visible
- ✅ Color meanings preserved (green=good, red=warning)
- ✅ Sufficient contrast maintained

## Best Practices Implemented

### 1. Semantic HTML
- Use proper heading hierarchy
- Use `<button>` for interactive elements
- Use `<ul>` and `<li>` for lists

### 2. Focus Management
- All interactive elements are keyboard accessible
- Focus indicators are clearly visible
- Focus order follows visual order

### 3. Dynamic Content
- Use `aria-live` regions for updates
- Announce important changes to screen readers
- Avoid overwhelming users with too many announcements

### 4. Clear Labels
- All buttons have descriptive labels
- Icons are marked `aria-hidden="true"`
- Text alternatives provided for visual information

### 5. Error Prevention
- Clear warnings before potentially slow operations
- Ability to cancel long-running operations
- Confirmation of actions through visual and auditory feedback

## Known Limitations

1. **Tooltip Keyboard Access**: Chakra UI tooltips may require additional configuration for full keyboard access in some browsers
2. **Screen Reader Verbosity**: Some screen readers may announce live regions multiple times during rapid updates
3. **Mobile Screen Readers**: Touch gestures may vary by platform

## Future Improvements

1. Add keyboard shortcuts for common actions (e.g., `Ctrl+C` to cancel layout)
2. Implement focus trapping in modal overlays
3. Add skip links for keyboard users
4. Provide audio cues for long operations
5. Add user preference for reduced motion

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Chakra UI Accessibility](https://chakra-ui.com/docs/styled-system/accessibility)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

## Compliance

These components aim to meet:
- ✅ WCAG 2.1 Level AA
- ✅ Section 508
- ✅ EN 301 549 (European Standard)

Last Updated: 2025-11-07
