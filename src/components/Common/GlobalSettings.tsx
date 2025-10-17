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

  // sync from storage changes (other tabs or components)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== 'network.style') return
      try {
        const raw = localStorage.getItem('network.style')
        const parsed = raw ? JSON.parse(raw) : {}
        const v = parsed?.nameMode
        setNameMode(v === 'gene' ? 'gene' : 'systematic')
      } catch {}
    }
    const onCustom = () => onStorage(new StorageEvent('storage', { key: 'network.style' }))
    window.addEventListener('storage', onStorage)
    window.addEventListener('network-style-changed', onCustom as any)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('network-style-changed', onCustom as any)
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

  return (
    <DialogRoot open={open} onOpenChange={(e) => setOpen(e.open)}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" leftIcon={<FiSettings />}>Settings</Button>
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
        </DialogBody>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default GlobalSettings


