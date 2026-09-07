'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Chromium-only, so it is not in lib.dom.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'backtester:install-dismissed'

// Safari in private mode throws on storage access rather than returning null.
function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // A prompt that reappears next visit beats crashing the page.
  }
}

function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// iOS fires no beforeinstallprompt, and only Safari can add to the home screen,
// so those users get written instructions instead of a button.
function isIosSafari() {
  const ua = window.navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
}

// These read the browser, not React state, and cannot change during a visit.
// useSyncExternalStore is how they reach render without risking a hydration
// mismatch: the server snapshot hides the prompt, and the client re-reads it.
const noopSubscribe = () => () => {}
const alwaysSuppressed = () => true
const neverIos = () => false

function suppressedSnapshot() {
  return isInstalled() || readDismissed()
}

export function InstallPrompt() {
  const suppressed = useSyncExternalStore(noopSubscribe, suppressedSnapshot, alwaysSuppressed)
  const iosEligible = useSyncExternalStore(noopSubscribe, isIosSafari, neverIos)

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // Suppress the browser's own mini-infobar so ours is the only ask.
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setDeferred(null)
      setClosed(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    rememberDismissed()
    setClosed(true)
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    // The event is single use whichever way the user answered.
    setDeferred(null)
    setClosed(true)
  }

  const mode = closed || suppressed ? 'none' : deferred ? 'prompt' : iosEligible ? 'ios' : 'none'

  if (mode === 'none') return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:left-auto sm:right-4 sm:w-96"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      role="dialog"
      aria-label="Install Portfolio Backtester"
    >
      <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="rounded-lg bg-primary/10 p-2">
          <Download className="h-5 w-5 text-primary" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Install Portfolio Backtester</p>

          {mode === 'prompt' ? (
            <>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">
                Add it to your home screen for a full-screen app that opens straight to your
                portfolios.
              </p>
              <Button size="sm" className="mt-3" onClick={install}>
                Install
              </Button>
            </>
          ) : (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <span>Tap</span>
              <Share className="inline h-4 w-4 shrink-0" aria-label="the Share button" />
              <span>in Safari, then &ldquo;Add to Home Screen&rdquo;.</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
