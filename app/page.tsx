'use client'

import { useState, useEffect } from 'react'
import { PortfolioForm } from '@/components/portfolio-form'
import { ResultsDashboard } from '@/components/results-dashboard'
import { BacktestHistory } from '@/components/backtest-history'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, Check } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useBacktestHistory } from '@/hooks/useBacktestHistory'
import type { BacktestRequest, BacktestResult, DbBacktest } from '@/lib/types'

export default function Home() {
  const { userId, isLoading: userLoading } = useUser()
  const { backtests, addBacktest } = useBacktestHistory(userId)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastRequest, setLastRequest] = useState<BacktestRequest | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const runBacktest = async (request: BacktestRequest) => {
    setIsLoading(true)
    setError(null)
    setLastRequest(request)

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

      setResult(data)
      setSavedSuccess(false)

      // Auto-save backtest to database
      if (userId && data.metrics) {
        try {
          await fetch('/api/backtests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              assets: request.assets,
              startDate: request.startDate,
              endDate: request.endDate,
              initialInvestment: request.initialInvestment,
              totalReturn: data.metrics.totalReturn,
              annualizedReturn: data.metrics.annualizedReturn,
              volatility: data.metrics.volatility,
              sharpeRatio: data.metrics.sharpeRatio,
              maxDrawdown: data.metrics.maxDrawdown,
            }),
          })
          setSavedSuccess(true)
          setTimeout(() => setSavedSuccess(false), 3000)
        } catch (err) {
          console.error('[v0] Failed to save backtest:', err)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectBacktest = (backtest: DbBacktest) => {
    // Load selected backtest results
    setLastRequest({
      assets: backtest.assets,
      startDate: backtest.start_date,
      endDate: backtest.end_date,
      initialInvestment: backtest.initial_investment,
    })

    if (backtest.total_return !== null) {
      setResult({
        metrics: {
          totalReturn: backtest.total_return,
          annualizedReturn: backtest.annualized_return || 0,
          volatility: backtest.volatility || 0,
          sharpeRatio: backtest.sharpe_ratio || 0,
          maxDrawdown: backtest.max_drawdown || 0,
        },
        portfolioHistory: [],
        assetReturns: {},
      })
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Portfolio Backtester
            </h1>
          </div>
          <p className="text-muted-foreground">
            Analyze historical performance of your portfolio allocation strategy using real market data.
          </p>
        </header>

        {!userLoading && userId && (
          <div className="mb-6 text-sm text-muted-foreground">
            User ID: <span className="font-mono text-xs">{userId.substring(0, 8)}...</span>
          </div>
        )}

        <div className="grid lg:grid-cols-[400px_1fr_300px] gap-6">
          <aside className="flex flex-col gap-6">
            <PortfolioForm onSubmit={runBacktest} isLoading={isLoading} />
            {backtests.length > 0 && (
              <BacktestHistory
                backtests={backtests}
                onSelectBacktest={handleSelectBacktest}
              />
            )}
          </aside>

          <section className="space-y-6">
            {savedSuccess && (
              <Alert className="border-success bg-success/5">
                <Check className="h-4 w-4 text-success" />
                <AlertTitle className="text-success">Backtest Saved</AlertTitle>
                <AlertDescription className="text-success/90">
                  Your backtest results have been saved to your history.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && lastRequest && (
              <ResultsDashboard
                result={result}
                initialInvestment={lastRequest.initialInvestment}
              />
            )}

            {!result && !error && !isLoading && (
              <div className="flex items-center justify-center h-[400px] rounded-lg border border-dashed border-border bg-card/50">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Backtest Results Yet
                  </h3>
                  <p className="text-muted-foreground max-w-sm">
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
