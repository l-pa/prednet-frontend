# Cola Layout Warnings Implementation Summary

## Task 17: Add cola layout warnings and recommendations

### Overview
Implemented warnings and recommendations for the cola layout algorithm when used with large networks (>1000 nodes), as cola has O(n²) complexity and can cause performance issues with large graphs.

### Changes Made

#### 1. PerformanceWarning Component (`PerformanceWarning.tsx`)
- **Added `currentLayout` prop** to detect when cola is selected
- **Added cola-specific warning logic**:
  - Shows warning when cola is selected for networks >1000 nodes
  - Displays custom title: "Cola Layout Not Recommended"
  - Provides cola-specific recommendations:
    - "Cola layout is not recommended for networks with more than 1,000 nodes"
    - "Cola has O(n²) complexity and may take a very long time or freeze the browser"
    - "Switch to fcose or cose-bilkent for better performance with large networks"
    - "For fastest results, use grid layout instead"
- **Added action buttons for cola warning**:
  - "Switch to Fcose" button (primary recommendation)
  - "Switch to Grid" button (fastest alternative)
- **Updated warning display logic** to show warning for cola even if tier is optimal/moderate

#### 2. Types (`types.ts`)
- **Updated `PerformanceWarningProps` interface**:
  - Added optional `currentLayout?: string` prop

#### 3. CytoscapeNetwork Component (`CytoscapeNetwork.tsx`)
- **Imported `getColaOptionsForSize`** from performanceUtils
- **Updated warning display condition**:
  - Shows warning when cola is selected for networks >1000 nodes, regardless of performance tier
- **Passed `currentLayout` prop** to PerformanceWarning component
- **Added cola-specific layout configuration**:
  - Uses `getColaOptionsForSize(nodeCount)` to get optimized cola options based on network size
  - Applied in both `handleRunLayout` and the elements useEffect

#### 4. NetworkToolbar Component (`NetworkToolbar.tsx`)
- **Cola already present** in `availableLayouts` array (no changes needed)

### Performance Optimization
The implementation uses size-based optimization for cola layout:
- **<500 nodes**: Full quality settings (optimal)
- **500-1000 nodes**: Reduced quality for better performance (acceptable)
- **>1000 nodes**: Minimal quality for fastest completion (discouraged, warning shown)

### User Experience
1. When a user selects cola layout for a network >1000 nodes:
   - A warning banner appears at the top of the visualization
   - The warning explains why cola is not recommended
   - Two action buttons provide quick alternatives:
     - "Switch to Fcose" (recommended force-directed alternative)
     - "Switch to Grid" (fastest layout)
2. The warning can be dismissed by the user
3. Layout preferences are stored in session storage when user switches layouts

### Requirements Satisfied
- ✅ 8.4: Display warning when cola is selected for networks >1000 nodes
- ✅ 8.4: Suggest alternative layouts (fcose, cose-bilkent) for large networks
- ✅ 8.4: Cola is available in NetworkToolbar layout selector dropdown
- ✅ 8.4: Update PerformanceWarning component to detect cola layout selection

### Testing Recommendations
To test this implementation:
1. Load a network with >1000 nodes
2. Select "cola" from the layout dropdown
3. Verify warning appears with title "Cola Layout Not Recommended"
4. Verify recommendations mention fcose and cose-bilkent as alternatives
5. Click "Switch to Fcose" button and verify layout changes
6. Click "Switch to Grid" button and verify layout changes
7. Verify warning can be dismissed
8. Test with networks <1000 nodes and verify no cola-specific warning appears

### Files Modified
- `frontend/src/components/Networks/Cytoscape/PerformanceWarning.tsx`
- `frontend/src/components/Networks/Cytoscape/types.ts`
- `frontend/src/components/Networks/CytoscapeNetwork.tsx`

### Related Documentation
- See `performanceUtils.ts` for cola layout configuration details
- See `design.md` for cola layout integration design
- See `requirements.md` for requirement 8.4 details
