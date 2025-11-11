# GO Terms Utilities Documentation

This document describes the GO terms data processing utilities implemented for the protein comparison feature.

## Overview

The `goTermsUtils.ts` module provides a comprehensive set of utility functions for processing Gene Ontology (GO) terms in the protein comparison visualization. These utilities handle intersection/union computation, search/filtering, and tree structure building.

## Types

### Core Types

```typescript
interface GOTerm {
  id: string              // GO:0006936
  name: string            // muscle contraction
  parents: string[]       // Parent GO IDs
  evidence?: string       // Evidence code (IDA, IPI, etc.)
}

interface GOTermsByDomain {
  biological_process: GOTerm[]
  cellular_component: GOTerm[]
  molecular_function: GOTerm[]
}

interface GOTermWithProteins extends GOTerm {
  proteins: string[]           // Which proteins have this term
  children?: GOTermWithProteins[]  // For hierarchy
}

type GODomain = 'biological_process' | 'cellular_component' | 'molecular_function'
type ComparisonMode = 'intersection' | 'union'
```

### Extended ProteinFeatureData

The existing `ProteinFeatureData` type has been extended to include GO terms:

```typescript
interface ProteinFeatureData {
  protein: string
  sequence_length: number | null
  features: ProteinFeature[]
  go_terms?: GOTermsByDomain | null  // NEW
  error: string | null
}
```

## Functions

### Intersection Computation

#### `computeGOTermIntersection(proteinGoTerms, proteinNames, domain)`

Computes GO terms that are present in ALL proteins for a specific domain.

**Parameters:**
- `proteinGoTerms`: Array of GO terms by domain for each protein
- `proteinNames`: Array of protein names
- `domain`: The GO domain to compute intersection for

**Returns:** Array of GO terms with protein membership (all proteins)

**Example:**
```typescript
const intersection = computeGOTermIntersection(
  [protein1.go_terms, protein2.go_terms],
  ['TPM1', 'TPM2'],
  'biological_process'
)
// Returns only terms present in both TPM1 and TPM2
```

### Union Computation

#### `computeGOTermUnion(proteinGoTerms, proteinNames, domain)`

Computes all GO terms present in ANY protein for a specific domain.

**Parameters:**
- `proteinGoTerms`: Array of GO terms by domain for each protein
- `proteinNames`: Array of protein names
- `domain`: The GO domain to compute union for

**Returns:** Array of GO terms with protein membership tracked

**Example:**
```typescript
const union = computeGOTermUnion(
  [protein1.go_terms, protein2.go_terms],
  ['TPM1', 'TPM2'],
  'biological_process'
)
// Returns all terms from both proteins, with membership tracked
```

### Search and Filtering

#### `filterGOTerms(terms, query)`

Filters GO terms by search query (matches GO ID or term name). Maintains hierarchy by including parent terms of matching children.

**Parameters:**
- `terms`: Array of GO terms to filter
- `query`: Search query string

**Returns:** Filtered array of GO terms

**Example:**
```typescript
const filtered = filterGOTerms(allTerms, 'muscle')
// Returns terms with 'muscle' in ID or name, plus their parents
```

#### `countGOTermMatches(terms, query)`

Counts how many GO terms match the search query.

**Parameters:**
- `terms`: Array of GO terms to search
- `query`: Search query string

**Returns:** Number of matching terms

**Example:**
```typescript
const count = countGOTermMatches(allTerms, 'muscle')
// Returns: 2 (if 2 terms match 'muscle')
```

### Tree Structure Building

#### `buildGOTermTree(terms)`

Builds a hierarchical tree structure from a flat list of GO terms using parent relationships.

**Parameters:**
- `terms`: Flat array of GO terms with parent references

**Returns:** Array of root GO terms with children nested

**Example:**
```typescript
const tree = buildGOTermTree(flatTerms)
// Returns hierarchical structure with root nodes
```

#### `flattenGOTermTree(tree)`

Flattens a GO term tree back into a flat list.

**Parameters:**
- `tree`: Array of root GO terms with nested children

**Returns:** Flat array of all GO terms

**Example:**
```typescript
const flat = flattenGOTermTree(tree)
// Returns all terms in a flat array
```

### Helper Functions

#### `isSharedByAllProteins(term, allProteins)`

Checks if a GO term is present in all proteins.

**Parameters:**
- `term`: GO term with protein membership
- `allProteins`: Array of all protein names

**Returns:** Boolean indicating if term is shared

#### `getGOTermCount(proteinGoTerms, domain)`

Gets the count of unique GO terms for a specific domain.

**Parameters:**
- `proteinGoTerms`: Array of GO terms by domain for each protein
- `domain`: The GO domain to count

**Returns:** Total count of unique GO terms

#### `getGODomainLabel(domain)`

Gets a human-readable label for a GO domain.

**Parameters:**
- `domain`: The GO domain key

**Returns:** Human-readable label (e.g., "Biological Process")

#### `getGODomainCode(domain)`

Gets a short code for a GO domain.

**Parameters:**
- `domain`: The GO domain key

**Returns:** Short code (e.g., "BP", "CC", "MF")

## Usage Examples

### Basic Intersection/Union

```typescript
import {
  computeGOTermIntersection,
  computeGOTermUnion,
  type GODomain
} from '@/utils/goTermsUtils'

// Get shared terms
const sharedTerms = computeGOTermIntersection(
  proteinData.map(p => p.go_terms),
  proteinData.map(p => p.protein),
  'biological_process'
)

// Get all terms
const allTerms = computeGOTermUnion(
  proteinData.map(p => p.go_terms),
  proteinData.map(p => p.protein),
  'biological_process'
)
```

### Search and Filter

```typescript
import { filterGOTerms, countGOTermMatches } from '@/utils/goTermsUtils'

// Filter terms
const filtered = filterGOTerms(terms, searchQuery)

// Count matches
const matchCount = countGOTermMatches(terms, searchQuery)
```

### Tree Building

```typescript
import { buildGOTermTree, flattenGOTermTree } from '@/utils/goTermsUtils'

// Build hierarchy
const tree = buildGOTermTree(flatTerms)

// Flatten back
const flat = flattenGOTermTree(tree)
```

## Implementation Notes

### Hierarchy Support

The tree building functions are designed to support GO term hierarchy visualization. However, UniProt doesn't always provide complete parent relationships. The current implementation:

1. Uses parent IDs from UniProt data when available
2. Treats terms without parents (or parents not in the set) as root nodes
3. Supports multiple parents per term (GO is a directed acyclic graph)

### Performance Considerations

- All functions use efficient Set-based operations for lookups
- Tree building is O(n) where n is the number of terms
- Filtering maintains hierarchy by including parent terms
- Functions handle null/undefined GO terms gracefully

### Edge Cases Handled

- Proteins with no GO terms (returns empty arrays)
- Single protein comparisons (returns all terms)
- Empty search queries (returns all terms)
- Terms with parents not in the current set (treated as roots)
- Duplicate protein names in term membership (prevented)

## Testing

A validation script is provided at `goTermsUtils.test-validation.ts` that demonstrates usage and validates all functions work correctly.

Run with:
```bash
npx tsx src/utils/goTermsUtils.test-validation.ts
```

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 3.2**: Intersection mode computation
- **Requirement 3.3**: Union mode computation with protein membership
- **Requirement 7.2**: Search/filter by GO ID or name
- **Requirement 7.3**: Maintain hierarchy when filtering
- **Requirement 7.4**: Display match count

## Next Steps

These utilities are ready to be used by the GO terms UI components:
- GOTermsPanel
- GOTermsToolbar
- GODomainSection
- GOTermTree
- GOTermNode

The types are also ready for the backend API client regeneration once the backend implements GO terms support.
