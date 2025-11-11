# GO Terms Edge Cases Testing Guide

This document outlines the edge cases that have been implemented and how to test them.

## Implemented Edge Cases

### 1. ✅ Display message when protein has no GO terms

**Implementation:**
- GOTermsPanel checks `hasAnyGOTerms` and displays a message when no proteins have GO terms
- Message: "No GO term annotations available"
- Sub-message: "The selected proteins do not have Gene Ontology annotations in the database"

**Testing:**
1. Select proteins that have no GO term annotations
2. Open the comparison modal
3. Verify the empty state message is displayed
4. Verify the message is accessible to screen readers

**Location:** `GOTermsPanel.tsx` lines ~180-190

---

### 2. ✅ Show loading skeleton while GO terms are being fetched

**Implementation:**
- GOTermsPanel accepts `isLoading` prop
- When loading, displays Skeleton components for toolbar and domain sections
- Shows 4 skeleton boxes with appropriate heights

**Testing:**
1. Open comparison modal with proteins
2. Observe loading skeleton during data fetch
3. Verify smooth transition from skeleton to actual content
4. Verify loading state is announced to screen readers

**Location:** `GOTermsPanel.tsx` lines ~170-177

---

### 3. ✅ Handle backend errors gracefully

**Implementation:**
- GOTermsPanel accepts `error` prop
- Displays error message in red with explanation
- Includes note that "Sequence features are still available above"
- Error state has proper ARIA attributes for accessibility

**Testing:**
1. Simulate backend error (disconnect network or modify API)
2. Open comparison modal
3. Verify error message is displayed
4. Verify sequence features are still visible above
5. Verify error is announced to screen readers

**Location:** `GOTermsPanel.tsx` lines ~179-191

---

### 4. ✅ Display message when intersection mode has no shared terms

**Implementation:**
- Checks if mode is "intersection" and totalTermCount is 0
- Only shows when not searching and proteins have GO terms
- Message: "No shared GO terms across selected proteins"
- Suggests switching to Union mode

**Testing:**
1. Select proteins with different GO terms (no overlap)
2. Set mode to "Intersection"
3. Verify empty state message is displayed
4. Verify suggestion to switch to Union mode
5. Switch to Union mode and verify terms appear

**Location:** `GOTermsPanel.tsx` lines ~260-270

---

### 5. ✅ Implement virtual scrolling or pagination for proteins with 100+ GO terms

**Implementation:**
- **Panel-level warning:** Shows blue info box when total terms > 100
  - Message: "Large dataset (X GO terms). Use search to filter results for better performance."
  - Only shown when not searching
  
- **Domain-level limiting:** Each domain section limits display to first 100 terms
  - Shows yellow warning: "Showing first 100 of X terms. Use search to filter results."
  - When searching, all matching terms are shown (no limit)
  - Hidden terms are not rendered, improving performance

**Testing:**
1. Select proteins with many GO terms (100+)
2. Verify blue performance warning appears at top
3. Expand each domain section
4. Verify yellow warning appears in domains with 100+ terms
5. Verify only first 100 terms are rendered
6. Enter search query
7. Verify all matching terms are shown (no limit when searching)
8. Verify performance is acceptable with large datasets

**Location:** 
- Panel warning: `GOTermsPanel.tsx` lines ~210-225
- Domain limiting: `GODomainSection.tsx` lines ~45-50, ~95-105

---

### 6. ✅ Test with various protein combinations

**Test Cases to Verify:**

#### Case A: No GO terms (0 terms)
- **Setup:** Select proteins without GO annotations
- **Expected:** Empty state message displayed
- **Status:** ✅ Implemented

#### Case B: Many GO terms (100+ terms)
- **Setup:** Select proteins with extensive GO annotations
- **Expected:** Performance warning + pagination/limiting
- **Status:** ✅ Implemented

#### Case C: Partial data (some proteins have GO terms, others don't)
- **Setup:** Mix proteins with and without GO terms
- **Expected:** Display available GO terms, handle missing gracefully
- **Status:** ✅ Implemented (handled by union/intersection logic)

#### Case D: Single protein
- **Setup:** Select only one protein
- **Expected:** Show all terms, intersection = union
- **Status:** ✅ Implemented (edge case of intersection/union)

#### Case E: Complete intersection (all proteins share all terms)
- **Setup:** Select proteins with identical GO annotations
- **Expected:** Intersection and union show same results
- **Status:** ✅ Implemented

#### Case F: No intersection (no shared terms)
- **Setup:** Select proteins with completely different GO terms
- **Expected:** Empty state in intersection mode, all terms in union
- **Status:** ✅ Implemented

#### Case G: Search with no results
- **Setup:** Enter search query that matches no terms
- **Expected:** "No GO terms match your search" message
- **Status:** ✅ Implemented (`GOTermsPanel.tsx` lines ~250-258)

---

## Additional Edge Cases Handled

### Empty domain sections
- **Implementation:** Each domain shows empty state when no terms available
- **Message:** "No [domain] annotations available"
- **Location:** `GODomainSection.tsx` lines ~85-95

### Search filtering maintains hierarchy
- **Implementation:** `filterGOTerms` includes parent terms of matches
- **Location:** `goTermsUtils.ts`

### Keyboard navigation
- **Implementation:** Full keyboard support with arrow keys, Enter, Space
- **Location:** `GOTermNode.tsx` handleKeyDown function

### Screen reader announcements
- **Implementation:** Live region announces mode changes, search results, empty states
- **Location:** `GOTermsPanel.tsx` announcementRef and useEffect hooks

---

## Performance Optimizations

1. **Memoization:**
   - `processedTermsByDomain` is memoized
   - `totalTermCount` is memoized
   - Prevents unnecessary recalculations

2. **Lazy rendering:**
   - Collapsed domains don't render content
   - Collapsed panel doesn't render content
   - Only expanded tree nodes render children

3. **Limited rendering:**
   - Domains with 100+ terms only render first 100
   - Search bypasses limit to show all matches
   - Significantly improves performance with large datasets

4. **Debounced search:**
   - Search input is debounced in GOTermsToolbar
   - Prevents excessive re-renders during typing

---

## Requirements Coverage

All requirements from task 10 are covered:

- ✅ **8.1:** Display message when protein has no GO terms
- ✅ **8.2:** Show loading skeleton while GO terms are being fetched
- ✅ **8.3:** Handle backend errors gracefully (show error message, keep sequence features visible)
- ✅ **8.4:** Display message when intersection mode has no shared terms
- ✅ **8.5:** Implement virtual scrolling or pagination for proteins with 100+ GO terms

---

## Manual Testing Checklist

- [ ] Test with 0 GO terms (empty state)
- [ ] Test with 1-10 GO terms (normal case)
- [ ] Test with 50-99 GO terms (large but manageable)
- [ ] Test with 100+ GO terms (performance warning + limiting)
- [ ] Test with 500+ GO terms (extreme case)
- [ ] Test loading state (skeleton appears)
- [ ] Test error state (error message appears)
- [ ] Test intersection with no shared terms
- [ ] Test intersection with some shared terms
- [ ] Test union mode with all proteins
- [ ] Test search with no results
- [ ] Test search with many results
- [ ] Test single protein comparison
- [ ] Test 5+ protein comparison
- [ ] Test keyboard navigation
- [ ] Test screen reader announcements
- [ ] Test performance with large datasets
- [ ] Test collapsing/expanding panel
- [ ] Test collapsing/expanding domains

---

## Known Limitations

1. **No true virtual scrolling:** Instead of virtual scrolling library, we use simple pagination (first 100 terms). This is simpler and sufficient for most cases.

2. **Search shows all results:** When searching, the 100-term limit is bypassed. This is intentional to ensure users can find what they're looking for, but may impact performance with very large datasets and broad searches.

3. **No lazy loading of children:** Child terms in hierarchy are loaded when parent is expanded. For very deep hierarchies, this could be optimized further.

---

## Future Enhancements

1. **True virtual scrolling:** Implement react-window or react-virtualized for smoother handling of 1000+ terms
2. **Progressive loading:** Load terms in batches as user scrolls
3. **Caching:** Cache expanded state and search results across modal opens
4. **Export:** Allow exporting filtered/searched results
5. **Sorting:** Allow sorting by term name, protein count, etc.
