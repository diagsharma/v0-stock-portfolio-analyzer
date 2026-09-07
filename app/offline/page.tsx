import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Offline | Portfolio Backtester',
  description: 'You are offline. Reconnect to run a backtest.',
}

// The service worker precaches this page and serves it when a navigation fails,
// so it has to render without any data of its own.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <div className="text-center">
        <div className="mx-auto mb-4 w-fit rounded-lg bg-muted p-3">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">You&rsquo;re offline</h1>
        <p className="mx-auto mb-6 max-w-sm text-pretty text-muted-foreground">
          Backtests need live market data, so this one has to wait for your connection. Everything
          you have already saved is still there.
        </p>
        <Button asChild>
          <Link href="/">Try again</Link>
        </Button>
      </div>
    </main>
  )
}
