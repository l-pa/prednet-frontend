import { useEffect, useState } from "react"
import { Button, HStack, Text } from "@chakra-ui/react"
import { FiSettings } from "react-icons/fi"

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"

type NameMode = 'systematic' | 'gene'
type Renderer = 'cytoscape' | 'sigma' | 'reagraph' | 'graphin'

function GlobalSettings() {
  const [open, setOpen] = useState(false)
  const [nameMode, setNameMode] = useState<NameMode>(() => {
    try {
      const raw = localStorage.getItem("network.style")
      const parsed = raw ? JSON.parse(raw) : undefined
      const v = parsed?.nameMode
      return v === 'gene' ? 'gene' : 'systematic'
    } catch {
      return 'systematic'
    }
  })
  const [renderer, setRenderer] = useState<Renderer>(() => {
    try {
      const stored = localStorage.getItem('network.renderer')
      return (stored === 'sigma' || stored === 'cytoscape' || stored === 'reagraph' || stored === 'graphin') ? (stored as Renderer) : 'cytoscape'
    } catch {
      return 'cytoscape'
    }
  })

  // sync from storage changes (other tabs or components)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      try {
        if (!e.key || e.key === 'network.style') {
          const raw = localStorage.getItem('network.style')
          const parsed = raw ? JSON.parse(raw) : {}
          const v = parsed?.nameMode
          setNameMode(v === 'gene' ? 'gene' : 'systematic')
        }
        if (!e.key || e.key === 'network.renderer') {
          const r = localStorage.getItem('network.renderer') as Renderer | null
          setRenderer((r === 'sigma' || r === 'cytoscape' || r === 'reagraph' || r === 'graphin') ? r : 'cytoscape')
        }
      } catch {}
    }
    const onCustom = () => onStorage(new StorageEvent('storage', { key: 'network.style' }))
    const onRendererCustom = () => onStorage(new StorageEvent('storage', { key: 'network.renderer' }))
    window.addEventListener('storage', onStorage)
    window.addEventListener('network-style-changed', onCustom as any)
    window.addEventListener('network-renderer-changed', onRendererCustom as any)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('network-style-changed', onCustom as any)
      window.removeEventListener('network-renderer-changed', onRendererCustom as any)
    }
  }, [])

  const persist = (mode: NameMode) => {
    try {
      const raw = localStorage.getItem('network.style')
      const prev = raw ? JSON.parse(raw) : {}
      localStorage.setItem('network.style', JSON.stringify({ ...prev, nameMode: mode }))
      // Notify listeners in this tab
      window.dispatchEvent(new Event('network-style-changed'))
    } catch {}
  }

  const persistRenderer = (r: Renderer) => {
    try {
      localStorage.setItem('network.renderer', r)
      window.dispatchEvent(new Event('network-renderer-changed'))
    } catch {}
  }

  return (
    <DialogRoot open={open} onOpenChange={(e) => setOpen(e.open)}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <HStack gap={1}>
            <FiSettings />
            Settings
          </HStack>
        </Button>
      </DialogTrigger>
      <DialogContent portalled>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <HStack gap={2} align="center">
            <Text fontSize="sm">Node names</Text>
            <select
              value={nameMode}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const v = e.target.value === 'gene' ? 'gene' : 'systematic'
                setNameMode(v)
                persist(v)
              }}
              style={{ fontSize: '13px', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', background: 'transparent' }}
            >
              <option value="systematic">Systematic</option>
              <option value="gene">Gene</option>
            </select>
          </HStack>
          <HStack gap={2} align="center" mt={3}>
            <Text fontSize="sm">Network renderer</Text>
            <select
              value={renderer}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const value = e.target.value
                const v: Renderer = (value === 'sigma' || value === 'reagraph' || value === 'graphin') ? (value as Renderer) : 'cytoscape'
                setRenderer(v)
                persistRenderer(v)
              }}
              style={{ fontSize: '13px', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', background: 'transparent' }}
            >
              <option value="cytoscape">Cytoscape</option>
              <option value="sigma">Sigma</option>
              <option value="reagraph">Reagraph</option>
              <option value="graphin">Graphin</option>
              </select>
          </HStack>
        </DialogBody>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default GlobalSettings


