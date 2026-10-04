'use client'

import { useSyncExternalStore } from 'react'
import { Copy, Share2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buildShareContent, shareLinks } from '@/lib/share'
import type { BacktestRecord } from '@/lib/types'

// The phone's own share sheet reaches every installed app, so it is offered
// first wherever the browser has one. Read through a store so server and
// client render the same menu.
const subscribe = () => () => {}
const hasNativeShare = () => typeof navigator !== 'undefined' && 'share' in navigator

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function ShareBacktest({ record }: { record: BacktestRecord }) {
  const canNativeShare = useSyncExternalStore(subscribe, hasNativeShare, () => false)

  const content = () => buildShareContent(record, window.location.origin)

  const openWindow = (url: string) =>
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=640')

  const shareNative = async () => {
    const { summary, url } = content()
    try {
      // The summary already ends with the link, so it is not passed twice.
      await navigator.share({ title: 'My portfolio backtest', text: summary })
    } catch (err) {
      // Dismissing the sheet is not an error worth reporting.
      if (err instanceof Error && err.name === 'AbortError') return
      if (await copy(summary)) toast.success('Summary copied to share anywhere')
      else toast.error(`Could not share. Link: ${url}`)
    }
  }

  // LinkedIn and Facebook only take a link, so the overview goes on the
  // clipboard for the user to paste into the post.
  const shareLinkOnly = async (network: 'linkedin' | 'facebook') => {
    const c = content()
    openWindow(shareLinks(c)[network])
    if (await copy(c.summary)) {
      toast.success('Summary copied', {
        description: 'Paste it into your post so people see your results.',
      })
    }
  }

  const copySummary = async () => {
    if (await copy(content().summary)) toast.success('Summary and link copied')
    else toast.error('Could not copy to the clipboard')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Share your results and invite others to try their own portfolio
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canNativeShare && (
          <>
            <DropdownMenuItem onSelect={shareNative}>
              <Smartphone className="h-4 w-4" />
              Share via…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={() => openWindow(shareLinks(content()).x)}>
          <span className="w-4 text-center font-bold" aria-hidden>𝕏</span>
          X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => shareLinkOnly('linkedin')}>
          <span className="w-4 text-center text-xs font-bold" aria-hidden>in</span>
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => shareLinkOnly('facebook')}>
          <span className="w-4 text-center font-bold" aria-hidden>f</span>
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openWindow(shareLinks(content()).whatsapp)}>
          <span className="w-4 text-center text-xs font-bold" aria-hidden>W</span>
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openWindow(shareLinks(content()).reddit)}>
          <span className="w-4 text-center text-xs font-bold" aria-hidden>r/</span>
          Reddit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={copySummary}>
          <Copy className="h-4 w-4" />
          Copy summary
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
