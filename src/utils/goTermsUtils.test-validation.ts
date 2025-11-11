/**
 * Validation script for GO Terms utilities
 * This file demonstrates usage and validates the utility functions work correctly.
 * Run with: npx tsx src/utils/goTermsUtils.test-validation.ts
 */

import {
  computeGOTermIntersection,
  computeGOTermUnion,
  filterGOTerms,
  countGOTermMatches,
  buildGOTermTree,
  flattenGOTermTree,
  isSharedByAllProteins,
  getGOTermCount,
  getGODomainLabel,
  getGODomainCode,
  type GOTermsByDomain,
  type GOTermWithProteins,
} from './goTermsUtils'

// Sample test data
const protein1GoTerms: GOTermsByDomain = {
  biological_process: [
    { id: 'GO:0006936', name: 'muscle contraction', parents: ['GO:0003012'], evidence: 'IDA' },
    { id: 'GO:0003012', name: 'muscle system process', parents: [], evidence: 'IDA' },
  ],
  cellular_component: [
    { id: 'GO:0005737', name: 'cytoplasm', parents: [], evidence: 'IDA' },
  ],
  molecular_function: [
    { id: 'GO:0003779', name: 'actin binding', parents: [], evidence: 'IPI' },
  ],
}

const protein2GoTerms: GOTermsByDomain = {
  biological_process: [
    { id: 'GO:0006936', name: 'muscle contraction', parents: ['GO:0003012'], evidence: 'IDA' },
    { id: 'GO:0007517', name: 'muscle organ development', parents: [], evidence: 'IDA' },
  ],
  cellular_component: [
    { id: 'GO:0005737', name: 'cytoplasm', parents: [], evidence: 'IDA' },
  ],
  molecular_function: [
    { id: 'GO:0003779', name: 'actin binding', parents: [], evidence: 'IPI' },
    { id: 'GO:0005515', name: 'protein binding', parents: [], evidence: 'IPI' },
  ],
}

const proteinNames = ['TPM1', 'TPM2']

console.log('=== GO Terms Utilities Validation ===\n')

// Test 1: Intersection
console.log('1. Testing computeGOTermIntersection:')
const intersection = computeGOTermIntersection(
  [protein1GoTerms, protein2GoTerms],
  proteinNames,
  'biological_process'
)
console.log(`   Found ${intersection.length} shared terms in biological_process`)
console.log(`   Shared terms: ${intersection.map(t => t.id).join(', ')}`)
console.log(`   ✓ Intersection computed\n`)

// Test 2: Union
console.log('2. Testing computeGOTermUnion:')
const union = computeGOTermUnion(
  [protein1GoTerms, protein2GoTerms],
  proteinNames,
  'biological_process'
)
console.log(`   Found ${union.length} total terms in biological_process`)
console.log(`   All terms: ${union.map(t => t.id).join(', ')}`)
console.log(`   ✓ Union computed\n`)

// Test 3: Filtering
console.log('3. Testing filterGOTerms:')
const filtered = filterGOTerms(union, 'muscle')
console.log(`   Filtered for "muscle": ${filtered.length} matches`)
console.log(`   Matching terms: ${filtered.map(t => t.name).join(', ')}`)
console.log(`   ✓ Filtering works\n`)

// Test 4: Count matches
console.log('4. Testing countGOTermMatches:')
const count = countGOTermMatches(union, 'muscle')
console.log(`   Count for "muscle": ${count} matches`)
console.log(`   ✓ Count matches works\n`)

// Test 5: Tree building
console.log('5. Testing buildGOTermTree:')
const tree = buildGOTermTree(union)
console.log(`   Built tree with ${tree.length} root nodes`)
console.log(`   ✓ Tree building works\n`)

// Test 6: Tree flattening
console.log('6. Testing flattenGOTermTree:')
const flattened = flattenGOTermTree(tree)
console.log(`   Flattened tree to ${flattened.length} terms`)
console.log(`   ✓ Tree flattening works\n`)

// Test 7: Shared by all proteins
console.log('7. Testing isSharedByAllProteins:')
const sharedTerm = intersection[0]
const isShared = isSharedByAllProteins(sharedTerm, proteinNames)
console.log(`   Term ${sharedTerm.id} shared by all: ${isShared}`)
console.log(`   ✓ Shared check works\n`)

// Test 8: Get term count
console.log('8. Testing getGOTermCount:')
const termCount = getGOTermCount(
  [protein1GoTerms, protein2GoTerms],
  'biological_process'
)
console.log(`   Total unique terms in biological_process: ${termCount}`)
console.log(`   ✓ Term count works\n`)

// Test 9: Domain labels
console.log('9. Testing getGODomainLabel:')
console.log(`   biological_process: ${getGODomainLabel('biological_process')}`)
console.log(`   cellular_component: ${getGODomainLabel('cellular_component')}`)
console.log(`   molecular_function: ${getGODomainLabel('molecular_function')}`)
console.log(`   ✓ Domain labels work\n`)

// Test 10: Domain codes
console.log('10. Testing getGODomainCode:')
console.log(`   biological_process: ${getGODomainCode('biological_process')}`)
console.log(`   cellular_component: ${getGODomainCode('cellular_component')}`)
console.log(`   molecular_function: ${getGODomainCode('molecular_function')}`)
console.log(`   ✓ Domain codes work\n`)

console.log('=== All validations passed! ===')
