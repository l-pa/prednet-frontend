/**
 * GO Terms Data Processing Utilities
 * 
 * This module provides utility functions for processing Gene Ontology (GO) terms
 * in the protein comparison feature, including intersection/union computation,
 * search/filtering, and tree structure building.
 * 
 * Performance optimizations:
 * - Memoization of expensive computations (intersection, union, tree building)
 * - Efficient Set-based operations for term matching
 * - Cached results with stable keys
 */

import type { GOTerm, GOTermsByDomain } from '@/components/Networks/Cytoscape/types'

// ============================================================================
// Types
// ============================================================================

// Re-export core types from centralized types file
export type { GOTerm, GOTermsByDomain } from '@/components/Networks/Cytoscape/types'

export interface GOTermWithProteins extends GOTerm {
  proteins: string[]
  children?: GOTermWithProteins[]
}

export type GODomain = 'biological_process' | 'cellular_component' | 'molecular_function'
export type ComparisonMode = 'intersection' | 'union'

// ============================================================================
// Memoization Cache
// ============================================================================

// Simple memoization cache for expensive computations
const memoCache = new Map<string, any>()

/**
 * Creates a stable cache key from function arguments.
 */
function createCacheKey(prefix: string, ...args: any[]): string {
  return `${prefix}:${JSON.stringify(args)}`
}

/**
 * Clears the memoization cache. Useful for testing or memory management.
 */
export function clearMemoCache(): void {
  memoCache.clear()
}

// ============================================================================
// Intersection Computation
// ============================================================================

/**
 * Computes the intersection of GO terms across multiple proteins for a specific domain.
 * Returns only GO terms that are present in ALL proteins.
 * 
 * This function is memoized for performance - repeated calls with the same inputs
 * will return cached results.
 * 
 * @param proteinGoTerms - Array of GO terms by domain for each protein
 * @param proteinNames - Array of protein names (for result metadata)
 * @param domain - The GO domain to compute intersection for
 * @returns Array of GO terms with protein membership (all proteins)
 */
export function computeGOTermIntersection(
  proteinGoTerms: (GOTermsByDomain | null | undefined)[],
  proteinNames: string[],
  domain: GODomain
): GOTermWithProteins[] {
  // Check memoization cache
  const cacheKey = createCacheKey('intersection', proteinGoTerms, proteinNames, domain)
  if (memoCache.has(cacheKey)) {
    return memoCache.get(cacheKey)
  }

  // Filter out proteins without GO terms
  const validProteinTerms = proteinGoTerms
    .map((terms, index) => ({
      terms: terms?.[domain] || [],
      name: proteinNames[index]
    }))
    .filter(p => p.terms.length > 0)

  if (validProteinTerms.length === 0) {
    const result: GOTermWithProteins[] = []
    memoCache.set(cacheKey, result)
    return result
  }

  // If only one protein, return all its terms
  if (validProteinTerms.length === 1) {
    const result = validProteinTerms[0].terms.map(term => ({
      ...term,
      proteins: [validProteinTerms[0].name]
    }))
    memoCache.set(cacheKey, result)
    return result
  }

  // Build sets of GO IDs for each protein
  const proteinTermSets = validProteinTerms.map(p => 
    new Set(p.terms.map(t => t.id))
  )

  // Find intersection - terms present in all proteins
  const intersectionIds = new Set<string>()
  const firstSet = proteinTermSets[0]

  for (const termId of firstSet) {
    if (proteinTermSets.every(set => set.has(termId))) {
      intersectionIds.add(termId)
    }
  }

  // Build result with all protein names
  const allProteinNames = validProteinTerms.map(p => p.name)
  const termMap = new Map<string, GOTerm>()

  // Collect term details from first protein (all have same terms in intersection)
  for (const term of validProteinTerms[0].terms) {
    if (intersectionIds.has(term.id)) {
      termMap.set(term.id, term)
    }
  }

  const result = Array.from(termMap.values()).map(term => ({
    ...term,
    proteins: allProteinNames
  }))

  // Cache the result
  memoCache.set(cacheKey, result)
  return result
}

// ============================================================================
// Union Computation
// ============================================================================

/**
 * Computes the union of GO terms across multiple proteins for a specific domain.
 * Returns all GO terms present in ANY protein, with protein membership tracked.
 * 
 * This function is memoized for performance - repeated calls with the same inputs
 * will return cached results.
 * 
 * @param proteinGoTerms - Array of GO terms by domain for each protein
 * @param proteinNames - Array of protein names
 * @param domain - The GO domain to compute union for
 * @returns Array of GO terms with protein membership
 */
export function computeGOTermUnion(
  proteinGoTerms: (GOTermsByDomain | null | undefined)[],
  proteinNames: string[],
  domain: GODomain
): GOTermWithProteins[] {
  // Check memoization cache
  const cacheKey = createCacheKey('union', proteinGoTerms, proteinNames, domain)
  if (memoCache.has(cacheKey)) {
    return memoCache.get(cacheKey)
  }

  const termMap = new Map<string, GOTermWithProteins>()

  // Iterate through each protein's GO terms
  proteinGoTerms.forEach((goTerms, index) => {
    const proteinName = proteinNames[index]
    const terms = goTerms?.[domain] || []

    for (const term of terms) {
      if (!termMap.has(term.id)) {
        termMap.set(term.id, {
          ...term,
          proteins: []
        })
      }
      
      const existingTerm = termMap.get(term.id)!
      if (!existingTerm.proteins.includes(proteinName)) {
        existingTerm.proteins.push(proteinName)
      }
    }
  })

  const result = Array.from(termMap.values())
  
  // Cache the result
  memoCache.set(cacheKey, result)
  return result
}

// ============================================================================
// Search and Filtering
// ============================================================================

/**
 * Filters GO terms by search query (matches GO ID or term name).
 * Maintains hierarchy by including parent terms of matching children.
 * 
 * @param terms - Array of GO terms to filter
 * @param query - Search query string
 * @returns Filtered array of GO terms
 */
export function filterGOTerms(
  terms: GOTermWithProteins[],
  query: string
): GOTermWithProteins[] {
  if (!query || query.trim() === '') {
    return terms
  }

  const lowerQuery = query.toLowerCase().trim()
  const matches = new Set<string>()
  const termMap = new Map(terms.map(t => [t.id, t]))

  // Helper function to recursively add all ancestors
  const addAncestors = (termId: string, visited = new Set<string>()) => {
    if (visited.has(termId)) return // Prevent infinite loops
    visited.add(termId)
    
    const term = termMap.get(termId)
    if (!term) return
    
    matches.add(termId)
    
    // Recursively add all parents
    for (const parentId of term.parents) {
      if (termMap.has(parentId)) {
        addAncestors(parentId, visited)
      }
    }
  }

  // Find matching terms and add their ancestors
  for (const term of terms) {
    if (
      term.id.toLowerCase().includes(lowerQuery) ||
      term.name.toLowerCase().includes(lowerQuery)
    ) {
      addAncestors(term.id)
    }
  }

  return terms.filter(t => matches.has(t.id))
}

/**
 * Searches GO terms and returns match count.
 * 
 * @param terms - Array of GO terms to search
 * @param query - Search query string
 * @returns Number of matching terms
 */
export function countGOTermMatches(
  terms: GOTermWithProteins[],
  query: string
): number {
  if (!query || query.trim() === '') {
    return terms.length
  }

  const lowerQuery = query.toLowerCase().trim()
  let count = 0

  for (const term of terms) {
    if (
      term.id.toLowerCase().includes(lowerQuery) ||
      term.name.toLowerCase().includes(lowerQuery)
    ) {
      count++
    }
  }

  return count
}

// ============================================================================
// Tree Structure Building
// ============================================================================

/**
 * Builds a hierarchical tree structure from a flat list of GO terms.
 * Terms with no parents (or parents not in the set) become root nodes.
 * 
 * This function is memoized for performance - repeated calls with the same inputs
 * will return cached results.
 * 
 * Note: This prepares for future hierarchy visualization. Currently returns
 * a flat structure as UniProt doesn't provide full parent relationships.
 * 
 * @param terms - Flat array of GO terms with parent references
 * @returns Array of root GO terms with children nested
 */
export function buildGOTermTree(
  terms: GOTermWithProteins[]
): GOTermWithProteins[] {
  if (terms.length === 0) {
    return []
  }

  // Check memoization cache
  const cacheKey = createCacheKey('tree', terms)
  if (memoCache.has(cacheKey)) {
    return memoCache.get(cacheKey)
  }

  // Create a map for quick lookup
  const termMap = new Map<string, GOTermWithProteins>()
  
  // Initialize all terms with empty children array
  for (const term of terms) {
    termMap.set(term.id, {
      ...term,
      children: []
    })
  }

  const roots: GOTermWithProteins[] = []

  // Build parent-child relationships
  for (const term of terms) {
    const node = termMap.get(term.id)!
    
    if (term.parents.length === 0) {
      // No parents - this is a root node
      roots.push(node)
    } else {
      // Try to attach to parent(s)
      let attachedToParent = false
      
      for (const parentId of term.parents) {
        const parent = termMap.get(parentId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(node)
          attachedToParent = true
        }
      }
      
      // If no parent found in the set, treat as root
      if (!attachedToParent) {
        roots.push(node)
      }
    }
  }

  // Cache the result
  memoCache.set(cacheKey, roots)
  return roots
}

/**
 * Flattens a GO term tree back into a flat list.
 * Useful for operations that need to work with all terms.
 * 
 * @param tree - Array of root GO terms with nested children
 * @returns Flat array of all GO terms
 */
export function flattenGOTermTree(
  tree: GOTermWithProteins[]
): GOTermWithProteins[] {
  const result: GOTermWithProteins[] = []

  function traverse(node: GOTermWithProteins) {
    result.push(node)
    if (node.children) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  for (const root of tree) {
    traverse(root)
  }

  return result
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a GO term is shared by all proteins in the comparison.
 * 
 * @param term - GO term with protein membership
 * @param allProteins - Array of all protein names in comparison
 * @returns True if term is present in all proteins
 */
export function isSharedByAllProteins(
  term: GOTermWithProteins,
  allProteins: string[]
): boolean {
  if (term.proteins.length !== allProteins.length) {
    return false
  }
  
  const termProteinSet = new Set(term.proteins)
  return allProteins.every(protein => termProteinSet.has(protein))
}

/**
 * Gets the count of GO terms for a specific domain across all proteins.
 * 
 * @param proteinGoTerms - Array of GO terms by domain for each protein
 * @param domain - The GO domain to count
 * @returns Total count of unique GO terms in the domain
 */
export function getGOTermCount(
  proteinGoTerms: (GOTermsByDomain | null | undefined)[],
  domain: GODomain
): number {
  const uniqueTerms = new Set<string>()
  
  for (const goTerms of proteinGoTerms) {
    const terms = goTerms?.[domain] || []
    for (const term of terms) {
      uniqueTerms.add(term.id)
    }
  }
  
  return uniqueTerms.size
}

/**
 * Gets a human-readable label for a GO domain.
 * 
 * @param domain - The GO domain key
 * @returns Human-readable domain label
 */
export function getGODomainLabel(domain: GODomain): string {
  const labels: Record<GODomain, string> = {
    biological_process: 'Biological Process',
    cellular_component: 'Cellular Component',
    molecular_function: 'Molecular Function'
  }
  return labels[domain]
}

/**
 * Gets a short code for a GO domain (BP, CC, MF).
 * 
 * @param domain - The GO domain key
 * @returns Short domain code
 */
export function getGODomainCode(domain: GODomain): string {
  const codes: Record<GODomain, string> = {
    biological_process: 'BP',
    cellular_component: 'CC',
    molecular_function: 'MF'
  }
  return codes[domain]
}
