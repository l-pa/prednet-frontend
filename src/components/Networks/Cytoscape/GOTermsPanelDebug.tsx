/**
 * Debug version of GOTermsPanel to diagnose GO terms data flow
 * 
 * This component adds console logging to help debug why GO terms aren't showing
 */

import { useEffect } from "react"
import type { ProteinFeatureData } from "./types"

interface GOTermsPanelDebugProps {
  proteinData: ProteinFeatureData[] | null
}

export function GOTermsPanelDebug({ proteinData }: GOTermsPanelDebugProps) {
  useEffect(() => {
    console.group("🔍 GO Terms Panel Debug")
    console.log("proteinData:", proteinData)
    
    if (!proteinData) {
      console.log("❌ proteinData is null/undefined")
      console.groupEnd()
      return
    }
    
    console.log(`✅ proteinData has ${proteinData.length} proteins`)
    
    proteinData.forEach((protein, index) => {
      console.group(`Protein ${index + 1}: ${protein.protein}`)
      console.log("sequence_length:", protein.sequence_length)
      console.log("features count:", protein.features?.length || 0)
      console.log("error:", protein.error)
      console.log("go_terms:", protein.go_terms)
      
      if (protein.go_terms) {
        console.log("✅ GO terms object exists")
        console.log("  biological_process:", protein.go_terms.biological_process?.length || 0)
        console.log("  cellular_component:", protein.go_terms.cellular_component?.length || 0)
        console.log("  molecular_function:", protein.go_terms.molecular_function?.length || 0)
        
        // Show sample terms
        if (protein.go_terms.biological_process?.length > 0) {
          console.log("  Sample BP term:", protein.go_terms.biological_process[0])
        }
      } else {
        console.log("❌ go_terms is null/undefined")
      }
      
      console.groupEnd()
    })
    
    // Check hasAnyGOTerms logic
    const hasAnyGOTerms = proteinData.some(
      (p) =>
        p.go_terms &&
        (p.go_terms.biological_process.length > 0 ||
          p.go_terms.cellular_component.length > 0 ||
          p.go_terms.molecular_function.length > 0)
    )
    
    console.log("hasAnyGOTerms:", hasAnyGOTerms)
    
    if (!hasAnyGOTerms) {
      console.log("❌ No GO terms found in any protein")
      console.log("Checking each protein:")
      proteinData.forEach((p, i) => {
        console.log(`  Protein ${i}: go_terms exists?`, !!p.go_terms)
        if (p.go_terms) {
          console.log(`    BP: ${p.go_terms.biological_process?.length || 0}`)
          console.log(`    CC: ${p.go_terms.cellular_component?.length || 0}`)
          console.log(`    MF: ${p.go_terms.molecular_function?.length || 0}`)
        }
      })
    }
    
    console.groupEnd()
  }, [proteinData])
  
  return null
}

export default GOTermsPanelDebug
