'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { PortfolioForm } from '@/components/portfolio-form'
import { ResultsDashboard } from '@/components/results-dashboard'
import { BacktestHistory } from '@/components/backtest-history'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, TrendingUp } from 'lucide-react'
import type { BacktestRequest, BacktestRecord } from '@/lib/types'

export default function Home() {
  const [record, setRecord] = useState<BacktestRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { mutate } = useSWRConfig()

  const runBacktest = async (request: BacktestRequest) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run backtest')
      }

      setRecord(data as BacktestRecord)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setRecord(null)
    } finally {
      setIsLoading(false)
      // Refresh the saved-runs list so the new run appears immediately.
      mutate('/api/backtests')
    }
  }

  const showResults =
    record && record.status === 'completed' && record.metrics && record.portfolioHistory && record.assetReturns

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground text-balance">
              Portfolio Backtester
            </h1>
          </div>
          <p className="text-muted-foreground">
            Analyze historical performance of your portfolio allocation strategy using real market data.
          </p>
        </header>

        <div className="grid lg:grid-cols-[400px_1fr] gap-8">
          <aside className="space-y-6">
            <PortfolioForm onSubmit={runBacktest} isLoading={isLoading} />
            <BacktestHistory onSelect={setRecord} selectedId={record?.id} />
          </aside>

          <section className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {showResults && (
              <ResultsDashboard
                metrics={record.metrics!}
                portfolioHistory={record.portfolioHistory!}
                assetReturns={record.assetReturns!}
                initialInvestment={record.initialInvestment}
                benchmark={record.benchmark}
                benchmarkMetrics={record.benchmarkMetrics}
                benchmarkHistory={record.benchmarkHistory}
                requestedStartDate={record.startDate}
                effectiveStartDate={record.effectiveStartDate}
              />
            )}

            {!showResults && !error && !isLoading && (
              <div className="flex items-center justify-center h-[400px] rounded-lg border border-dashed border-border bg-card/50">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Backtest Results Yet
                  </h3>
                  <p className="text-muted-foreground max-w-sm text-pretty">
                    Configure your portfolio allocation and date range, then click
                    &ldquo;Run Backtest&rdquo; to see historical performance.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
