import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { OpenAPI } from "@/client"
import type { ProteinFeatureData } from "@/components/Networks/Cytoscape/types"

interface UseProteinFeaturesParams {
  networkName: string
  proteins: string[]
  enabled?: boolean
  source?: "uniprot" | "stringdb"
}

interface ProteinFeaturesResponse {
  proteins: ProteinFeatureData[]
}

export function useProteinFeatures({
  networkName,
  proteins,
  enabled = true,
  source = "uniprot",
}: UseProteinFeaturesParams) {
  return useQuery({
    queryKey: ["protein-features", networkName, proteins.sort().join(","), source],
    queryFn: async () => {
      if (proteins.length === 0) {
        throw new Error("No proteins specified")
      }

      const proteinsParam = proteins.join(",")
      const baseUrl = OpenAPI.BASE || "http://localhost:8000"
      const url = `${baseUrl}/api/v1/proteins/${encodeURIComponent(networkName)}/features`
      
      try {
        // Get auth token from localStorage
        const token = localStorage.getItem("access_token")
        
        const response = await axios.get<ProteinFeaturesResponse>(url, {
          params: {
            proteins: proteinsParam,
            source: source,
          },
          headers: token ? {
            Authorization: `Bearer ${token}`,
          } : {},
        })

        return response.data
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status
          // Handle specific HTTP error codes with user-friendly messages
          if (status === 404) {
            throw new Error("Network not found. Please check the network name.")
          } else if (status === 503) {
            throw new Error("Protein database temporarily unavailable. Please try again later.")
          } else if (status === 401) {
            throw new Error("Authentication required. Please log in again.")
          } else if (status && status >= 500) {
            throw new Error("Server error occurred. Please try again later.")
          } else {
            throw new Error(`Failed to fetch protein features: ${error.message}`)
          }
        }
        throw error
      }
    },
    enabled: enabled && proteins.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour - protein features don't change often
    retry: 2,
  })
}
