'use client'

import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { PortfolioForm } from '@/components/portfolio-form'
import { ResultsDashboard } from '@/components/results-dashboard'
import { BacktestHistory } from '@/components/backtest-history'
import { SavedPortfolios } from '@/components/saved-portfolios'
import { UserMenu } from '@/components/auth/user-menu'
import { useUser } from '@/components/auth/use-user'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, TrendingUp } from 'lucide-react'
import type {
  Asset,
  BacktestRequest,
  BacktestRecord,
  SavedPortfolio,
} from '@/lib/types'

const DEFAULT_ASSETS: Asset[] = [
  { id: '1', symbol: 'SPY', weight: 60 },
  { id: '2', symbol: 'BND', weight: 40 },
]

interface FormState {
  assets: Asset[]
  name: string
  // The saved portfolio these assets came from, or null once they are edited.
  loadedId: string | null
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function Home() {
  const [record, setRecord] = useState<BacktestRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useUser()
  const { mutate } = useSWRConfig()

  // Same SWR key as SavedPortfolios, so the two share one request.
  const { data: savedPortfolios } = useSWR<SavedPortfolio[]>(
    user ? '/api/portfolios' : null,
    fetcher
  )

  // What the user has typed or explicitly loaded. Null means "untouched this
  // visit", which is what lets the form follow the saved data below.
  const [formState, setFormState] = useState<FormState | null>(null)

  // A returning user's most recent portfolio fills the form, so they don't have
  // to clear the stock 60/40 every visit. Derived during render rather than
  // synced in an effect: once formState is set, it wins permanently, so this
  // can never overwrite work in progress -- including when SWR revalidates.
  const mostRecent = savedPortfolios?.[0]

  const form: FormState =
    formState ??
    (mostRecent?.assets?.length
      ? { assets: mostRecent.assets, name: mostRecent.name, loadedId: mostRecent.id }
      : { assets: DEFAULT_ASSETS, name: '', loadedId: null })

  // Editing the allocation detaches it from whichever portfolio it came from,
  // so the "In the form" marker does not claim an edited copy is the saved one.
  const handleAssetsChange = (assets: Asset[]) =>
    setFormState({ ...form, assets, loadedId: null })

  const handleNameChange = (name: string) => setFormState({ ...form, name })

  const loadPortfolio = (portfolio: SavedPortfolio) =>
    setFormState({
      assets: portfolio.assets,
      name: portfolio.name,
      loadedId: portfolio.id,
    })

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
    <main className="min-h-dvh bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground text-balance">
                Portfolio Backtester
              </h1>
            </div>
            <UserMenu />
          </div>
          <p className="text-muted-foreground">
            Analyze historical performance of your portfolio allocation strategy using real market data,
            with dividends reinvested as they are paid.
          </p>
        </header>

        <div className="grid lg:grid-cols-[400px_1fr] gap-8">
          <aside className="space-y-6">
            <PortfolioForm
              onSubmit={runBacktest}
              isLoading={isLoading}
              assets={form.assets}
              onAssetsChange={handleAssetsChange}
              name={form.name}
              onNameChange={handleNameChange}
              canSave={Boolean(user)}
            />
            {user && (
              <>
                <SavedPortfolios onLoad={loadPortfolio} loadedId={form.loadedId} />
                {/* History is per account, so it only means anything once
                    there is an account to scope it to. */}
                <BacktestHistory onSelect={setRecord} selectedId={record?.id} />
              </>
            )}
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
                priceOnlyMetrics={record.priceOnlyMetrics}
                dividendYield={record.dividendYield}
                assetDividendYields={record.assetDividendYields}
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
