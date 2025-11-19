import { useQuery } from "@tanstack/react-query"
import { ProteinsService } from "@/client"

export interface GORelation {
  id: string
  relation: string
}

export interface GOTermHierarchy {
  id: string
  name: string
  parents: GORelation[] | string[]  // Support both old and new format
  children: GORelation[] | string[]  // Support both old and new format
  ancestors: string[]
  aspect: string | null
  all_relations?: GORelation[]  // Optional for backward compatibility
}

export interface GOHierarchyResponse {
  terms: Record<string, GOTermHierarchy>
  root_terms: string[]
}

/**
 * Hook to fetch GO term hierarchy from QuickGO API via backend
 * 
 * @param goIds - Array of GO IDs to fetch hierarchy for
 * @param includeAncestors - Whether to include all ancestor terms
 * @param enabled - Whether the query should run
 */
export function useGOHierarchy(
  goIds: string[],
  includeAncestors = true,
  enabled = true
) {
  return useQuery({
    queryKey: ["go-hierarchy", goIds.sort().join(","), includeAncestors],
    queryFn: async () => {
      if (goIds.length === 0) {
        return { terms: {}, root_terms: [] }
      }

      const response = await ProteinsService.getGoHierarchy({
        goIds: goIds.join(","),
        includeAncestors: includeAncestors,
      })

      return response as any as GOHierarchyResponse
    },
    enabled: enabled && goIds.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour - GO hierarchy doesn't change often
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 2,
  })
}
