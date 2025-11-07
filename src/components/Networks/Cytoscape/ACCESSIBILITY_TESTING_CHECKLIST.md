# Accessibility Testing Checklist

Use this checklist to manually verify accessibility features in the Cytoscape performance components.

## Pre-Testing Setup

- [ ] Test in both light and dark modes
- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader enabled
- [ ] Test at different zoom levels (100%, 150%, 200%)
- [ ] Test with browser extensions disabled (to avoid interference)

## PerformanceIndicator Component

### Visual Testing
- [ ] Badge displays with correct color for each tier (green/yellow/orange/red)
- [ ] Text is readable in both light and dark modes
- [ ] Hover state shows visual feedback (opacity change)
- [ ] Focus indicator is clearly visible (blue outline with offset)
- [ ] Tooltip appears on hover and focus
- [ ] Tooltip content is readable and properly formatted

### Keyboard Testing
- [ ] Can tab to the indicator
- [ ] Focus indicator is visible when focused
- [ ] Pressing Enter opens tooltip
- [ ] Pressing Space opens tooltip
- [ ] Pressing Escape closes tooltip
- [ ] Tab order is logical

### Screen Reader Testing
- [ ] Announces "Performance tier: [tier name]. [X] nodes, [Y] edges"
- [ ] Announces "Press Enter or Space to view details"
- [ ] Tooltip content is read when opened
- [ ] Network size information is announced
- [ ] Performance tips are read as a list
- [ ] Estimated layout time is announced (when available)

### Color Contrast Testing
- [ ] Badge color meets 3:1 contrast ratio
- [ ] Text meets 4.5:1 contrast ratio (normal text)
- [ ] Focus indicator meets 3:1 contrast ratio
- [ ] All colors work in dark mode

## PerformanceWarning Component

### Visual Testing
- [ ] Warning displays with correct color scheme for tier
- [ ] Border and background colors are appropriate
- [ ] Icon color matches tier severity
- [ ] Text is readable in both light and dark modes
- [ ] Dismiss button is visible and clickable
- [ ] Action button (Switch to Grid Layout) is visible for large networks
- [ ] Recommendations list is properly formatted

### Keyboard Testing
- [ ] Can tab to dismiss button
- [ ] Can tab to action button (when visible)
- [ ] Focus indicators are clearly visible
- [ ] Pressing Enter/Space activates buttons
- [ ] Tab order is logical (dismiss button last)

### Screen Reader Testing
- [ ] Announces as "Alert" when displayed
- [ ] Reads warning title (e.g., "Large Network Detected")
- [ ] Announces node and edge count
- [ ] Reads "Recommendations:" heading
- [ ] Reads all recommendation items as a list
- [ ] Dismiss button announces "Dismiss [tier] warning"
- [ ] Action button announces "Switch to grid layout for better performance"

### Color Contrast Testing
- [ ] Warning background meets contrast requirements
- [ ] Border color is visible
- [ ] Text meets 4.5:1 contrast ratio
- [ ] Icon color meets 3:1 contrast ratio
- [ ] All colors work in dark mode

### Functional Testing
- [ ] Warning appears for moderate/large/extreme tiers
- [ ] Warning does not appear for optimal tier
- [ ] Dismiss button hides the warning
- [ ] Dismissal persists for the session
- [ ] Action button switches to grid layout
- [ ] Warning reappears for different tier levels

## LayoutProgressOverlay Component

### Visual Testing
- [ ] Overlay covers the canvas area
- [ ] Background is semi-transparent
- [ ] Content box is centered and readable
- [ ] Spinner is visible and animating
- [ ] Text is readable in both light and dark modes
- [ ] Cancel button appears after 2 seconds
- [ ] Elapsed time updates every second
- [ ] Estimated time appears after 3 seconds
- [ ] Warning message appears after 5 seconds

### Keyboard Testing
- [ ] Can tab to cancel button (when visible)
- [ ] Focus indicator is clearly visible on cancel button
- [ ] Pressing Enter/Space cancels the layout
- [ ] Focus is managed properly after cancellation

### Screen Reader Testing
- [ ] Announces as "Dialog" when displayed
- [ ] Reads "Loading network..." or "Computing network layout..."
- [ ] Announces node and edge count (loading state)
- [ ] Announces layout algorithm name (computing state)
- [ ] Reads elapsed time updates (after 1 second)
- [ ] Announces estimated time (after 3 seconds)
- [ ] Reads warning message (after 5 seconds)
- [ ] Cancel button announces "Cancel layout computation and apply grid layout"
- [ ] Updates are announced via aria-live regions

### Color Contrast Testing
- [ ] Overlay background is visible but not too dark
- [ ] Content box background meets contrast requirements
- [ ] Text meets 4.5:1 contrast ratio
- [ ] Spinner color is visible
- [ ] Cancel button meets contrast requirements
- [ ] All colors work in dark mode

### Functional Testing
- [ ] Overlay appears immediately when loading starts
- [ ] Shows "Loading network..." during initial load
- [ ] Transitions to "Computing network layout..." when layout starts
- [ ] Elapsed time updates correctly
- [ ] Estimated time is reasonable
- [ ] Cancel button appears at correct time
- [ ] Cancelling stops the layout and applies grid layout
- [ ] Overlay disappears when layout completes

## Cross-Component Testing

### Integration Testing
- [ ] Performance indicator updates when network changes
- [ ] Warning appears/disappears based on network size
- [ ] Progress overlay works with all layout algorithms
- [ ] Components work together without conflicts
- [ ] State is managed correctly across components

### Responsive Testing
- [ ] Components work at mobile viewport (320px)
- [ ] Components work at tablet viewport (768px)
- [ ] Components work at desktop viewport (1024px+)
- [ ] Text wraps appropriately at small sizes
- [ ] Buttons remain clickable at all sizes

### Performance Testing
- [ ] Components render quickly
- [ ] No layout shifts when components appear
- [ ] Animations are smooth
- [ ] No memory leaks with repeated use
- [ ] Screen reader announcements don't overwhelm

## Browser Testing

Test in the following browsers:

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] Safari iOS (latest)
- [ ] Chrome Android (latest)

## Screen Reader Testing

Test with the following screen readers:

### Windows
- [ ] NVDA (free, recommended)
- [ ] JAWS (if available)

### macOS
- [ ] VoiceOver (built-in)

### Mobile
- [ ] VoiceOver (iOS)
- [ ] TalkBack (Android)

## Automated Testing Tools

Run these automated tests:

- [ ] Lighthouse Accessibility Audit (Chrome DevTools)
- [ ] axe DevTools Browser Extension
- [ ] WAVE Browser Extension
- [ ] Pa11y (command line tool)

### Expected Results
- Lighthouse: Score 95+
- axe: No violations
- WAVE: No errors
- Pa11y: No errors

## Common Issues to Watch For

### Keyboard Navigation
- ❌ Focus not visible
- ❌ Tab order is illogical
- ❌ Can't reach all interactive elements
- ❌ Keyboard traps

### Screen Readers
- ❌ Missing labels
- ❌ Incorrect roles
- ❌ Too many announcements
- ❌ Unclear button purposes

### Visual
- ❌ Low contrast text
- ❌ Color as only indicator
- ❌ Text too small
- ❌ Poor dark mode support

### Functional
- ❌ Buttons don't work with keyboard
- ❌ Tooltips don't appear on focus
- ❌ Live regions don't announce
- ❌ Focus lost after actions

## Sign-Off

After completing all tests, document your findings:

**Tester Name**: _______________
**Date**: _______________
**Browser/OS**: _______________
**Screen Reader**: _______________

**Overall Assessment**:
- [ ] All tests passed
- [ ] Minor issues found (document below)
- [ ] Major issues found (document below)

**Issues Found**:
1. 
2. 
3. 

**Recommendations**:
1. 
2. 
3. 

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Keyboard Testing](https://webaim.org/articles/keyboard/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
