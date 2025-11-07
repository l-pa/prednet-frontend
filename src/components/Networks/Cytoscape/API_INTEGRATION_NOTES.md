# Protein Features API Integration

## Overview
The ProteinComparisonModal now uses a custom React Query hook (`useProteinFeatures`) to fetch protein feature data from the backend API.

## Implementation Details

### Custom Hook: `useProteinFeatures`
**Location:** `frontend/src/hooks/useProteinFeatures.ts`

**Features:**
- Uses TanStack Query (React Query) for data fetching and caching
- Integrates with the OpenAPI client configuration for base URL and authentication
- Handles authentication tokens from localStorage
- Provides comprehensive error handling with user-friendly messages
- Implements 1-hour stale time (protein features don't change frequently)
- Automatic retry on failure (2 attempts)

**Usage:**
```typescript
const { data, isLoading, error, refetch } = useProteinFeatures({
  networkName: "my-network",
  proteins: ["YPL273W", "YBR160W"],
  enabled: true, // Optional, defaults to true
})
```

### Updated Component: `ProteinComparisonModal`
**Location:** `frontend/src/components/Networks/Cytoscape/ProteinComparisonModal.tsx`

**Changes:**
- Removed manual fetch logic and state management
- Now uses `useProteinFeatures` hook for data fetching
- Simplified error handling using React Query's built-in error state
- Retry functionality now uses React Query's `refetch` method
- Maintains all existing UI states (loading, error, partial failure, success)

## API Endpoint

**Endpoint:** `GET /api/v1/proteins/{network_name}/features`

**Query Parameters:**
- `proteins` (required): Comma-separated list of protein identifiers
- `name_mode` (optional): "systematic" or "gene" (default: "systematic")
- `organism_id` (optional): NCBI taxonomy ID (default: "559292" for S. cerevisiae)

**Response Format:**
```json
{
  "proteins": [
    {
      "protein": "YPL273W",
      "sequence_length": 325,
      "features": [
        {
          "type": "Domain",
          "description": "Hcy-binding",
          "start": 6,
          "end": 321
        }
      ],
      "error": null
    }
  ]
}
```

## Error Handling

The hook provides user-friendly error messages for common scenarios:
- **404**: "Network not found. Please check the network name."
- **401**: "Authentication required. Please log in again."
- **503**: "Protein database temporarily unavailable. Please try again later."
- **5xx**: "Server error occurred. Please try again later."
- **Other**: Generic error message with details

## Testing

### Manual Testing
The endpoint can be tested directly:
```bash
curl "http://localhost:8000/api/v1/proteins/test/features?proteins=YPL273W,YBR160W"
```

### Integration Testing
1. Start the backend server
2. Start the frontend development server
3. Navigate to a network view
4. Select 2+ proteins from the sidebar
5. Click "View Comparison"
6. Verify protein features are displayed correctly

## Benefits of This Approach

1. **Separation of Concerns**: Data fetching logic is isolated in a reusable hook
2. **Caching**: React Query automatically caches responses, reducing API calls
3. **Error Handling**: Centralized error handling with automatic retries
4. **Type Safety**: Full TypeScript support with proper type definitions
5. **Testability**: Hook can be easily mocked for component testing
6. **Performance**: Automatic request deduplication and background refetching
7. **Developer Experience**: React Query DevTools integration for debugging

## Future Enhancements

Once the OpenAPI client is regenerated with the new endpoint:
1. Replace axios calls with generated client methods
2. Update type imports to use generated types
3. Remove manual URL construction

The current implementation is production-ready and will work seamlessly when the client is regenerated.
