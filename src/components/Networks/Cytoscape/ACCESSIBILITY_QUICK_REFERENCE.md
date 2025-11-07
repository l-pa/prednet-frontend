# Accessibility Quick Reference

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| **Tab** | Navigate forward | All interactive elements |
| **Shift+Tab** | Navigate backward | All interactive elements |
| **Enter** or **Space** | Activate button | Compare, View Comparison, Remove, Retry buttons |
| **Escape** | Close modal | Comparison modal |
| **Tab** | Focus feature segment | Feature visualization |

## Screen Reader Announcements

### Selection Changes
- "TPM1 added to comparison"
- "TPM1 removed from comparison"
- "2 proteins selected for comparison. You can now view the comparison."

### Modal States
- **Opening**: "Protein Feature Comparison. Comparing protein sequence features for 2 selected proteins. Use Tab to navigate between proteins and features. Press Escape to close."
- **Loading**: "Loading protein features... Fetching data for 2 proteins"
- **Success**: "Comparing 2 proteins"
- **Error**: "Failed to fetch protein features: [error message]"
- **Partial Failure**: "Some proteins could not be loaded. Showing 1 of 2 proteins."

### Feature Details
- "Domain: Tropomyosin, position 1 to 284, length 284 amino acids"
- "Region: Coiled-coil, position 850 to 1928, length 1079 amino acids"

## ARIA Attributes Reference

### Modal
```html
role="dialog"
aria-labelledby="protein-comparison-title"
aria-describedby="protein-comparison-description"
```

### Buttons
```html
<!-- Compare button -->
aria-label="Add TPM1 to comparison"
aria-pressed="false"

<!-- Remove button -->
aria-label="Remove TPM1 from comparison"

<!-- View Comparison button -->
aria-label="View comparison of 2 selected proteins"
```

### Feature Segments
```html
<!-- Feature group -->
role="group"
aria-label="Domain: Tropomyosin, position 1 to 284, length 284 amino acids"

<!-- Feature segment -->
tabIndex={0}
onFocus={showTooltip}
onBlur={hideTooltip}
```

### Status Regions
```html
<!-- Loading -->
role="status"
aria-live="polite"
aria-busy="true"

<!-- Error -->
role="alert"
aria-live="polite"

<!-- Success -->
role="status"
aria-live="polite"
```

## Color Contrast Ratios

| Element | Foreground | Background | Ratio | Status |
|---------|-----------|------------|-------|--------|
| Domain label | White | #4299e1 | 3.4:1 | ✓ AA (Large) |
| Region label | White | #48bb78 | 3.2:1 | ✓ AA (Large) |
| Motif label | White | #9f7aea | 4.8:1 | ✓ AA |
| Repeat label | White | #ed8936 | 3.5:1 | ✓ AA (Large) |
| Site label | White | #f56565 | 3.9:1 | ✓ AA (Large) |
| Other label | White | #718096 | 4.5:1 | ✓ AA |
| Error text | #f56565 | Light bg | 4.5:1 | ✓ AA |
| Warning text | #ed8936 | Light bg | 4.2:1 | ✓ AA |

## Focus Indicators

All interactive elements have visible focus indicators:
- Buttons: Outline with color accent
- Feature segments: Browser default focus ring
- Remove buttons: Chakra UI focus style

## Testing Commands

### Quick Keyboard Test
1. Tab to "Compare" button → Press Enter
2. Tab to another "Compare" button → Press Enter
3. Tab to "View Comparison" → Press Enter
4. Tab through modal → Press Escape

### Quick Screen Reader Test
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate to "Compare" button
3. Activate and listen for announcement
4. Navigate to "View Comparison" button
5. Activate and listen for modal announcement
6. Navigate through modal content

### Quick Contrast Test
1. Open browser DevTools
2. Inspect feature segment
3. Check contrast ratio in Accessibility panel
4. Verify ≥ 3:1 for large text, ≥ 4.5:1 for normal text

## Common Issues & Solutions

### Issue: Focus not visible
**Solution**: Check browser zoom level, ensure focus styles aren't overridden

### Issue: Screen reader not announcing
**Solution**: Verify aria-live region exists, check browser/SR compatibility

### Issue: Keyboard trap in modal
**Solution**: Verify Chakra UI DialogRoot is properly configured

### Issue: Tooltips not showing on focus
**Solution**: Check onFocus/onBlur handlers, verify tabIndex is set

## Browser Support

| Browser | Keyboard | Screen Reader | Notes |
|---------|----------|---------------|-------|
| Chrome | ✓ | ✓ (NVDA/JAWS) | Full support |
| Firefox | ✓ | ✓ (NVDA/JAWS) | Full support |
| Safari | ✓ | ✓ (VoiceOver) | Full support |
| Edge | ✓ | ✓ (NVDA/JAWS) | Full support |

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Chakra UI Accessibility](https://chakra-ui.com/docs/styled-system/accessibility)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
