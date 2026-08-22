'use client'

import { useState } from 'react'
import { AlertCircle, Plus } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { subYears } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { AssetRow } from '@/components/asset-row'
import { DateRangePicker } from '@/components/date-range-picker'
import type { Asset, BacktestRequest } from '@/lib/types'

// Mirrors the server-side rule in backend/utils/validation.js. Validating here
// too means an obviously bad symbol never costs a network round trip.
const TICKER_PATTERN = /^[A-Z]{1,5}$/
const MAX_ASSETS = 10

interface PortfolioFormProps {
  onSubmit: (request: BacktestRequest) => void
  isLoading: boolean
}

/** Format a Date as YYYY-MM-DD using local fields, so the day never shifts. */
function toLocalISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function PortfolioForm({ onSubmit, isLoading }: PortfolioFormProps) {
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', symbol: 'SPY', weight: 60 },
    { id: '2', symbol: 'BND', weight: 40 },
  ])
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subYears(new Date(), 5),
    to: new Date(),
  })
  const [initialInvestment, setInitialInvestment] = useState(10000)
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0)
  const isValidWeight = Math.abs(totalWeight - 100) < 0.01

  // Per-asset symbol errors, only surfaced once the user has tried to submit.
  const assetErrors = new Map<string, string>()
  const seen = new Set<string>()

  for (const asset of assets) {
    const symbol = asset.symbol.trim().toUpperCase()

    if (symbol === '') {
      assetErrors.set(asset.id, 'Enter a ticker symbol')
    } else if (!TICKER_PATTERN.test(symbol)) {
      assetErrors.set(asset.id, 'Use 1-5 letters, e.g. AAPL')
    } else if (seen.has(symbol)) {
      assetErrors.set(asset.id, `${symbol} is already in the portfolio`)
    }

    seen.add(symbol)
  }

  const dateError =
    dateRange?.from && dateRange?.to && dateRange.from >= dateRange.to
      ? 'Start date must be before end date'
      : !dateRange?.from || !dateRange?.to
        ? 'Choose a start and end date'
        : null

  const investmentError =
    !Number.isFinite(initialInvestment) || initialInvestment <= 0
      ? 'Enter an amount greater than zero'
      : null

  const formErrors: string[] = []

  if (assetErrors.size > 0) formErrors.push('Fix the highlighted ticker symbols')
  if (!isValidWeight) formErrors.push('Asset weights must total 100%')
  if (dateError) formErrors.push(dateError)
  if (investmentError) formErrors.push(investmentError)

  const isValid = formErrors.length === 0

  const addAsset = () => {
    if (assets.length >= MAX_ASSETS) return
    setAssets([...assets, { id: Date.now().toString(), symbol: '', weight: 0 }])
  }

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    setAssets(assets.map((a) => (a.id === id ? { ...a, ...updates } : a)))
  }

  const removeAsset = (id: string) => {
    if (assets.length > 1) {
      setAssets(assets.filter((a) => a.id !== id))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    // Nothing leaves the browser until every rule passes.
    if (!isValid || !dateRange?.from || !dateRange?.to) return

    onSubmit({
      name: name.trim() || undefined,
      assets: assets.map((a) => ({ ...a, symbol: a.symbol.trim().toUpperCase() })),
      startDate: toLocalISODate(dateRange.from),
      endDate: toLocalISODate(dateRange.to),
      initialInvestment,
    })
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Portfolio Configuration</CardTitle>
        <CardDescription>
          Add up to {MAX_ASSETS} assets with their allocation weights. Weights must
          sum to 100%.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="portfolio-name" className="text-foreground">
              Name (optional)
            </Label>
            <Input
              id="portfolio-name"
              type="text"
              placeholder="e.g. Balanced 60/40"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">
                Assets{' '}
                <span className="text-muted-foreground">
                  ({assets.length}/{MAX_ASSETS})
                </span>
              </Label>
              <span
                className={`text-sm ${
                  isValidWeight ? 'text-success' : 'text-destructive'
                }`}
              >
                Total: {totalWeight.toFixed(1)}%
              </span>
            </div>
            <div className="space-y-3">
              {assets.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  onUpdate={updateAsset}
                  onRemove={removeAsset}
                  canRemove={assets.length > 1}
                  error={submitted ? assetErrors.get(asset.id) : undefined}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAsset}
              disabled={assets.length >= MAX_ASSETS}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {assets.length >= MAX_ASSETS ? 'Maximum 10 assets' : 'Add Asset'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Date Range</Label>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
            {submitted && dateError && (
              <p className="text-xs text-destructive">{dateError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="investment" className="text-foreground">
              Initial Investment ($)
            </Label>
            <Input
              id="investment"
              type="number"
              min={1}
              value={initialInvestment}
              onChange={(e) =>
                setInitialInvestment(parseFloat(e.target.value) || 0)
              }
              aria-invalid={Boolean(submitted && investmentError)}
              className="bg-input"
            />
            {submitted && investmentError && (
              <p className="text-xs text-destructive">{investmentError}</p>
            )}
          </div>

          {submitted && !isValid && (
            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <ul className="space-y-0.5 text-xs text-destructive">
                {formErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                Running Backtest...
              </>
            ) : (
              'Run Backtest'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
