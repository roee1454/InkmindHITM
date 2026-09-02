import { useEffect } from 'react'
import { useIsMobile } from '@/hooks/use-media-query'
import { useMcpUiStore } from '../store/mcpUiStore'
import { McpBubble } from './McpBubble'
import { McpPanel } from './McpPanel'

/** Composes the bubble + panel and owns the ⌘K/Ctrl+K shortcut (desktop only, per doc §6) — the
 *  one thing to mount in the dashboard's root chrome. */
export function McpAssistant() {
  const isMobile = useIsMobile()
  const open = useMcpUiStore((s) => s.open)
  const setActiveConversation = useMcpUiStore((s) => s.setActiveConversation)

  useEffect(() => {
    if (isMobile) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setActiveConversation(null)
        open()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile, open, setActiveConversation])

  return <McpPanel anchor={<McpBubble />} />
}
