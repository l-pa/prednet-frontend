/**
 * Test script to verify GO Terms API integration
 * 
 * This script can be run in the browser console to test the API integration
 * when the backend is running.
 * 
 * Usage:
 * 1. Start the backend: docker compose up backend
 * 2. Open browser console on the frontend
 * 3. Copy and paste this script
 * 4. Call: testGOTermsAPI(['YAL001C', 'YAL002W'])
 */

import axios from 'axios'
import type { ProteinFeatureData } from '@/components/Networks/Cytoscape/types'

interface ProteinFeaturesResponse {
  proteins: ProteinFeatureData[]
}

/**
 * Test the GO Terms API integration
 */
export async function testGOTermsAPI(
  proteins: string[],
  networkName: string = 'BioGRIDCC24Y',
  baseUrl: string = 'http://localhost:8000'
): Promise<void> {
  console.log('🧪 Testing GO Terms API Integration...')
  console.log(`📋 Proteins: ${proteins.join(', ')}`)
  console.log(`🌐 Network: ${networkName}`)
  console.log(`🔗 Base URL: ${baseUrl}`)
  console.log('')

  try {
    // Make API request
    const url = `${baseUrl}/api/v1/proteins/${encodeURIComponent(networkName)}/features`
    const proteinsParam = proteins.join(',')
    
    console.log(`📡 Fetching: ${url}?proteins=${proteinsParam}`)
    
    const response = await axios.get<ProteinFeaturesResponse>(url, {
      params: { proteins: proteinsParam },
    })

    console.log('✅ API Response received')
    console.log('')

    // Verify response structure
    if (!response.data || !response.data.proteins) {
      console.error('❌ Invalid response structure')
      console.log('Response:', response.data)
      return
    }

    console.log(`📊 Received data for ${response.data.proteins.length} proteins`)
    console.log('')

    // Check each protein
    for (const protein of response.data.proteins) {
      console.log(`🧬 Protein: ${protein.protein}`)
      console.log(`  📏 Sequence Length: ${protein.sequence_length || 'N/A'}`)
      console.log(`  🔬 Features: ${protein.features?.length || 0}`)
      
      // Check GO terms
      if (protein.go_terms) {
        const bp = protein.go_terms.biological_process?.length || 0
        const cc = protein.go_terms.cellular_component?.length || 0
        const mf = protein.go_terms.molecular_function?.length || 0
        const total = bp + cc + mf

        console.log(`  🧬 GO Terms: ${total} total`)
        console.log(`    • Biological Process: ${bp}`)
        console.log(`    • Cellular Component: ${cc}`)
        console.log(`    • Molecular Function: ${mf}`)

        // Show sample GO terms
        if (bp > 0) {
          const sample = protein.go_terms.biological_process[0]
          console.log(`    Sample BP: ${sample.id} - ${sample.name}`)
        }
        if (cc > 0) {
          const sample = protein.go_terms.cellular_component[0]
          console.log(`    Sample CC: ${sample.id} - ${sample.name}`)
        }
        if (mf > 0) {
          const sample = protein.go_terms.molecular_function[0]
          console.log(`    Sample MF: ${sample.id} - ${sample.name}`)
        }
      } else {
        console.log(`  🧬 GO Terms: None`)
      }

      if (protein.error) {
        console.log(`  ⚠️  Error: ${protein.error}`)
      }

      console.log('')
    }

    // Summary
    const proteinsWithGOTerms = response.data.proteins.filter(p => 
      p.go_terms && (
        p.go_terms.biological_process.length > 0 ||
        p.go_terms.cellular_component.length > 0 ||
        p.go_terms.molecular_function.length > 0
      )
    ).length

    console.log('📈 Summary:')
    console.log(`  ✅ Proteins with GO terms: ${proteinsWithGOTerms}/${response.data.proteins.length}`)
    console.log(`  ❌ Proteins without GO terms: ${response.data.proteins.length - proteinsWithGOTerms}/${response.data.proteins.length}`)
    
    if (proteinsWithGOTerms > 0) {
      console.log('')
      console.log('✅ GO Terms API Integration: SUCCESS')
      console.log('   The backend is correctly returning GO terms data!')
    } else {
      console.log('')
      console.log('⚠️  GO Terms API Integration: PARTIAL')
      console.log('   The API is working but no GO terms were found for these proteins.')
      console.log('   This may be normal if the proteins have no GO annotations in UniProt.')
    }

  } catch (error) {
    console.error('❌ API Request Failed')
    if (axios.isAxiosError(error)) {
      console.error(`   Status: ${error.response?.status}`)
      console.error(`   Message: ${error.message}`)
      console.error(`   Response:`, error.response?.data)
    } else {
      console.error(`   Error:`, error)
    }
    console.log('')
    console.log('💡 Troubleshooting:')
    console.log('   1. Make sure the backend is running: docker compose up backend')
    console.log('   2. Check the backend URL is correct')
    console.log('   3. Verify the network name exists')
    console.log('   4. Check browser console for CORS errors')
  }
}

/**
 * Test with common yeast proteins
 */
export async function testWithYeastProteins(): Promise<void> {
  // Common yeast proteins that should have GO terms
  const proteins = ['YAL001C', 'YAL002W', 'YAL003W']
  await testGOTermsAPI(proteins)
}

/**
 * Test with a single protein
 */
export async function testWithSingleProtein(protein: string = 'YAL001C'): Promise<void> {
  await testGOTermsAPI([protein])
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.testGOTermsAPI = testGOTermsAPI
  // @ts-ignore
  window.testWithYeastProteins = testWithYeastProteins
  // @ts-ignore
  window.testWithSingleProtein = testWithSingleProtein
  
  console.log('🧪 GO Terms API Test Functions Available:')
  console.log('   • testGOTermsAPI(proteins, networkName?, baseUrl?)')
  console.log('   • testWithYeastProteins()')
  console.log('   • testWithSingleProtein(protein?)')
}
