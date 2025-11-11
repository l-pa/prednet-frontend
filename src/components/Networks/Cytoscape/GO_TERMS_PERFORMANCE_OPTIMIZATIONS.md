# GO Terms Performance Optimizations

This document describes the performance optimizations implemented for the GO Terms comparison feature.

## Overview

The GO Terms feature can handle large datasets (100+ terms per protein, multiple proteins). To ensure smooth performance, we've implemented several optimization strategies:

1. **Memoization** - Cache expensive computations
2. **React.memo** - Prevent unnecessary re-renders
3. **Debouncing** - Reduce search input processing
4. **Lazy Loading** - Only render when panel is expanded
5. **Virtual Scrolling Alternative** - Limit initial rendering for large lists

## Implemented Optimizations

### 1. Memoization in goTermsUtils.ts

**What:** Cache results of expensive computations (intersection, union, tree building)

**How:** 
- Added `memoCache` Map to store computed results
- Each function creates a stable cache key from its inputs
- Returns cached result if available, otherwise computes and caches

**Functions Memoized:**
- `computeGOTermIntersection()` - Caches intersection results per domain
- `computeGOTermUnion()` - Caches union results per domain
- `buildGOTermTree()` - Caches tree structure building

**Benefits:**
- Avoids recomputing same data when switching between modes
- Reduces CPU usage when filtering/searching
- Improves responsiveness for repeated operations

**Cache Management:**
- Cache persists across renders within same session
- Can be cleared with `clearMemoCache()` if needed
- Cache keys are JSON-stringified arguments (stable for same inputs)

### 2. React.memo for Components

**What:** Prevent unnecessary re-renders of components when props haven't changed

**Components Memoized:**
- `GOTermsPanel` - Main panel component
- `GOTermsToolbar` - Toolbar with mode toggle and search
- `GODomainSection` - Individual domain sections (BP, CC, MF)
- `GOTermTree` - Tree structure renderer
- `GOTermNode` - Individual term nodes (most frequently rendered)
- `GOTermsLegend` - Legend component

**Benefits:**
- Reduces re-render cascades
- Improves performance when expanding/collapsing terms
- Prevents unnecessary DOM updates

**Note:** React.memo performs shallow comparison of props. Works well here because:
- Most props are primitives or stable references
- Sets and callbacks are memoized with useCallback

### 3. Debounced Search Input

**What:** Delay search processing until user stops typing

**Implementation:**
- Local state (`localQuery`) for immediate UI feedback
- 300ms debounce timer before triggering actual search
- Timer cleanup on unmount or new input

**Benefits:**
- Reduces number of expensive filter operations
- Improves typing responsiveness
- Prevents UI lag during fast typing

**User Experience:**
- Input field updates immediately (no lag)
- Search results update 300ms after last keystroke
- Clear button resets immediately

### 4. Lazy Loading (Panel Collapsed)

**What:** Skip computation when panel is collapsed

**Implementation:**
- `processedTermsByDomain` checks `isCollapsed` prop
- Returns empty arrays if collapsed
- Computation only happens when panel is expanded

**Benefits:**
- Faster initial page load
- Reduces memory usage when panel not in use
- Improves performance when multiple proteins compared

**User Experience:**
- Panel expands instantly (no delay)
- Data loads on first expansion
- Subsequent expansions use cached data

### 5. Virtual Scrolling Alternative

**What:** Limit rendering for very large term lists (100+ terms)

**Implementation:**
- `GODomainSection` checks if `terms.length > 100`
- Only renders first 100 terms if no search active
- Shows warning message about hidden terms
- Full list rendered when search is active (filtered)

**Benefits:**
- Prevents DOM bloat with hundreds of nodes
- Maintains smooth scrolling
- Reduces initial render time

**User Experience:**
- Warning message: "Showing first 100 of X terms. Use search to filter."
- Search reveals all matching terms (even beyond 100)
- Encourages users to filter large datasets

### 6. useCallback for Event Handlers

**What:** Memoize callback functions to prevent re-creating on every render

**Callbacks Memoized:**
- `handleToggleExpand` - Toggle term expansion
- `handleToggleDomain` - Toggle domain section
- `handleModeChange` - Change intersection/union mode
- `announceToScreenReader` - Screen reader announcements
- `handleInputChange` - Search input change
- `handleClearSearch` - Clear search

**Benefits:**
- Prevents child components from re-rendering
- Works with React.memo to maximize optimization
- Reduces memory allocations

### 7. useMemo for Derived Data

**What:** Cache computed values that depend on props/state

**Values Memoized:**
- `proteinNames` - Extracted from proteinData
- `proteinGoTerms` - Extracted from proteinData
- `hasAnyGOTerms` - Boolean check across all proteins
- `domains` - Array of domain keys
- `processedTermsByDomain` - Filtered terms per domain
- `totalTermCount` - Sum of terms across domains
- `tree` (in GOTermTree) - Built tree structure

**Benefits:**
- Avoids recalculating on every render
- Reduces CPU usage
- Improves render performance

## Performance Metrics

### Before Optimization (Estimated)
- 5 proteins × 100 GO terms each = 500 terms
- Initial render: ~500ms
- Mode switch: ~300ms
- Search keystroke: ~100ms per character
- Re-renders: Frequent cascades

### After Optimization (Estimated)
- Same dataset (500 terms)
- Initial render: ~200ms (lazy loading)
- Mode switch: ~50ms (memoization)
- Search keystroke: ~10ms (debouncing + memoization)
- Re-renders: Minimal (React.memo)

### Large Dataset (1000+ terms)
- Virtual scrolling alternative limits DOM to 100 nodes per domain
- Search still works across full dataset
- Performance remains acceptable

## Testing Performance

### Manual Testing
1. Compare 5 proteins with many GO terms (50+ each)
2. Toggle between intersection/union modes (should be instant)
3. Type in search box rapidly (should not lag)
4. Expand/collapse domains (should be smooth)
5. Expand/collapse individual terms (should be instant)

### Browser DevTools
1. Open React DevTools Profiler
2. Record interaction (mode switch, search, expand)
3. Check for unnecessary re-renders
4. Verify memoization is working

### Performance Monitoring
```javascript
// Add to component for debugging
useEffect(() => {
  console.log('GOTermsPanel rendered', {
    mode,
    searchQuery,
    termCount: totalTermCount,
    isCollapsed
  })
})
```

## Future Optimizations

### 1. True Virtual Scrolling
- Use `react-window` or `react-virtualized`
- Render only visible terms in viewport
- Better for 1000+ term datasets

### 2. Web Workers
- Move heavy computations to background thread
- Intersection/union computation
- Tree building
- Search filtering

### 3. IndexedDB Caching
- Cache GO term data in browser
- Persist across sessions
- Reduce API calls

### 4. Incremental Rendering
- Render domains progressively
- Show loading skeleton per domain
- Improve perceived performance

### 5. Code Splitting
- Lazy load GO terms components
- Only load when comparison modal opens
- Reduce initial bundle size

## Best Practices

### When Adding New Features
1. Use `useMemo` for expensive computations
2. Use `useCallback` for event handlers
3. Wrap components in `React.memo` if frequently rendered
4. Consider lazy loading for optional features
5. Profile with React DevTools before/after

### When Debugging Performance
1. Check React DevTools Profiler for re-renders
2. Verify memoization cache is being used
3. Look for expensive operations in render
4. Check for unnecessary prop changes
5. Monitor memory usage in Chrome DevTools

### When Handling Large Datasets
1. Implement pagination or virtual scrolling
2. Show loading indicators for slow operations
3. Provide search/filter to reduce visible data
4. Consider server-side filtering for very large datasets
5. Warn users about performance implications

## Maintenance Notes

### Cache Management
- Memoization cache grows with unique inputs
- Consider clearing cache periodically if memory is concern
- Cache is per-session (cleared on page reload)

### React.memo Caveats
- Only works if props are stable
- Doesn't help if parent always re-renders with new props
- Use with useCallback/useMemo for best results

### Debouncing Trade-offs
- 300ms delay is good balance
- Shorter = more responsive but more processing
- Longer = less processing but feels sluggish
- Consider making configurable for power users

## Conclusion

These optimizations ensure the GO Terms feature performs well even with large datasets. The combination of memoization, React.memo, debouncing, and lazy loading provides a smooth user experience while maintaining code readability and maintainability.

Key takeaway: **Optimize where it matters** - focus on frequently rendered components and expensive computations, not every single function.
