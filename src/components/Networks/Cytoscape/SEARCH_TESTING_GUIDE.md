# GO Terms Search and Filtering - Testing Guide

## Quick Test Scenarios

### Scenario 1: Basic Search by Term Name
1. Open the protein comparison modal with multiple proteins
2. Expand the GO Terms Panel
3. Type "muscle" in the search box
4. **Expected Results:**
   - Terms containing "muscle" are highlighted in yellow
   - Parent terms of matching terms are included
   - Match count shows in toolbar (e.g., "3 matches")
   - Non-matching terms are filtered out

### Scenario 2: Search by GO ID
1. In the search box, type "GO:0006936"
2. **Expected Results:**
   - The specific term with that ID is highlighted
   - Its parent terms are included in the results
   - Match count shows "1 match"

### Scenario 3: Debouncing Behavior
1. Type quickly: "m-u-s-c-l-e" (one letter at a time, fast)
2. **Expected Results:**
   - Input shows each letter immediately
   - Filtering happens ~300ms after you stop typing
   - No lag or stuttering in the UI

### Scenario 4: Clear Search
1. Type any search term
2. Click the X button in the search input
3. **Expected Results:**
   - Search input is cleared
   - All GO terms are shown again
   - Match count disappears
   - Highlighting is removed

### Scenario 5: No Results
1. Type "zzzzzzz" or any non-existent term
2. **Expected Results:**
   - Message: "No GO terms match your search"
   - Suggestion: "Try a different search term or clear the filter"
   - No terms are displayed

### Scenario 6: Hierarchy Maintenance
1. Search for a specific child term (e.g., "muscle contraction")
2. **Expected Results:**
   - The matching term is shown and highlighted
   - Its parent terms are also shown (not highlighted)
   - Tree structure is maintained
   - You can see the full path from root to the matching term

### Scenario 7: Intersection vs Union Mode
1. Switch to Intersection mode
2. Search for a term
3. Switch to Union mode
4. **Expected Results:**
   - Search persists across mode changes
   - Filtering works in both modes
   - Match count updates appropriately

### Scenario 8: Multiple Domains
1. Search for a term that appears in multiple domains
2. **Expected Results:**
   - Matching terms are highlighted in all domains
   - Each domain shows its own filtered results
   - Total match count includes all domains

### Scenario 9: Partial Matching
1. Search for "bind" (partial word)
2. **Expected Results:**
   - Terms like "actin binding", "protein binding" are matched
   - Partial matches are highlighted
   - Case-insensitive matching works

### Scenario 10: Accessibility
1. Use Tab key to navigate to search input
2. Type a search term
3. Tab to the clear button
4. Press Enter to clear
5. **Expected Results:**
   - All elements are keyboard accessible
   - Screen reader announces match count
   - Clear button is focusable and activatable

## Visual Indicators Checklist

- [ ] Search input has placeholder text
- [ ] Clear button (X) appears when typing
- [ ] Match count appears in toolbar when searching
- [ ] Matching terms have yellow background (light mode)
- [ ] Matching terms have dark yellow background (dark mode)
- [ ] Hover states work on highlighted terms
- [ ] No results message is centered and clear
- [ ] Parent terms are shown but not highlighted

## Performance Checklist

- [ ] No lag when typing in search input
- [ ] Filtering happens after 300ms delay
- [ ] No excessive re-renders
- [ ] Smooth transitions between filtered states
- [ ] Large term lists (100+) filter quickly

## Edge Cases to Test

1. **Empty Search:** Clear button works, all terms shown
2. **Single Character:** Search works with 1 character
3. **Special Characters:** Search for "GO:" works
4. **Case Sensitivity:** "MUSCLE" matches "muscle contraction"
5. **Whitespace:** Leading/trailing spaces are trimmed
6. **Rapid Mode Switching:** Search persists when toggling modes
7. **Rapid Domain Collapsing:** Search persists when collapsing/expanding domains
8. **Very Long Search:** Input handles long strings gracefully

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

## Accessibility Testing

Test with:
- [ ] Keyboard only (no mouse)
- [ ] Screen reader (NVDA/JAWS/VoiceOver)
- [ ] High contrast mode
- [ ] Zoom at 200%

## Known Limitations

1. **Hierarchy Display:** Currently shows flat list with parent relationships. Full tree visualization is a future enhancement.
2. **Search Scope:** Searches only ID and name, not evidence codes or other metadata.
3. **Regex Support:** No regex or advanced query syntax (simple substring matching only).

## Troubleshooting

### Issue: Search doesn't work
- Check browser console for errors
- Verify `filterGOTerms` function is imported correctly
- Check that `searchQuery` state is being updated

### Issue: Debouncing not working
- Verify 300ms timeout is set correctly
- Check that cleanup function is returning in useEffect
- Test with console.log to see timing

### Issue: Highlighting not visible
- Check theme colors (yellow.50, yellow.900)
- Verify `isHighlighted` logic in GOTermNode
- Test in both light and dark modes

### Issue: Match count incorrect
- Verify `totalTermCount` calculation in GOTermsPanel
- Check that filtering is applied to all domains
- Ensure count includes parent terms

## Success Criteria

All features are working correctly when:
1. ✅ Search input responds immediately to typing
2. ✅ Filtering happens after 300ms delay
3. ✅ Matching terms are highlighted
4. ✅ Parent terms are included in results
5. ✅ Match count is accurate
6. ✅ Clear button works
7. ✅ No results state is shown appropriately
8. ✅ All features are keyboard accessible
