'use client'

import { useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import { AlertCircle, Plus, Save, Upload } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { subYears } from 'date-fns'
import { toast } from 'sonner'

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
import { parsePortfolioCsv } from '@/backend/utils/portfolioCsv'
import { MAX_TICKERS } from '@/backend/utils/validation'
import type { Asset, BacktestRequest } from '@/lib/types'

// Mirrors the server-side rule in backend/utils/validation.js. Validating here
// too means an obviously bad symbol never costs a network round trip.
const TICKER_PATTERN = /^[A-Z]{1,5}$/

// The API enforces this same limit on both running and saving a portfolio, so
// it is imported rather than repeated: a local copy drifting out of step is how
// the form came to offer more holdings than either endpoint would accept.
const MAX_ASSETS = MAX_TICKERS

// Beyond this the sidebar grows taller than the results next to it, so the list
// scrolls instead. Hand-entered portfolios rarely reach it; imported ones do.
const SCROLL_ASSETS_ABOVE = 8

// A portfolio of ten tickers is a few hundred bytes; anything approaching this
// is the wrong file, and reading it would just freeze the tab.
const MAX_CSV_BYTES = 512 * 1024

interface PortfolioFormProps {
  onSubmit: (request: BacktestRequest) => void
  isLoading: boolean
  // Assets and name live in the parent so a saved portfolio can be loaded into
  // the form, both on demand and automatically on a return visit.
  assets: Asset[]
  onAssetsChange: (assets: Asset[]) => void
  name: string
  onNameChange: (name: string) => void
  canSave: boolean
}

/** Format a Date as YYYY-MM-DD using local fields, so the day never shifts. */
function toLocalISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function PortfolioForm({
  onSubmit,
  isLoading,
  assets,
  onAssetsChange: setAssets,
  name,
  onNameChange: setName,
  canSave,
}: PortfolioFormProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subYears(new Date(), 5),
    to: new Date(),
  })
  const [initialInvestment, setInitialInvestment] = useState(10000)
  const [submitted, setSubmitted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [csvErrors, setCsvErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate } = useSWRConfig()

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

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    // Clearing the input lets the same file be picked again after a fix,
    // which otherwise fires no change event at all.
    event.target.value = ''

    if (!file) return

    setCsvErrors([])

    if (file.size > MAX_CSV_BYTES) {
      setCsvErrors(['That file is too large to be a portfolio.'])
      return
    }

    let text: string

    try {
      text = await file.text()
    } catch {
      setCsvErrors(['That file could not be read.'])
      return
    }

    const { assets: parsed, errors, notes } = parsePortfolioCsv(text, {
      maxAssets: MAX_ASSETS,
    })

    if (errors.length > 0) {
      setCsvErrors(errors)
      return
    }

    setAssets(parsed)
    // A fresh import starts clean: old per-row errors refer to rows that are
    // no longer on screen.
    setSubmitted(false)
    toast.success(`Imported ${parsed.length} holdings from ${file.name}`, {
      description: notes.length > 0 ? notes.join(' ') : undefined,
    })
  }

  // Only the allocation is saved -- the date range and amount are properties
  // of a particular run, not of the portfolio itself.
  const handleSave = async () => {
    setSubmitted(true)

    if (assetErrors.size > 0 || !isValidWeight) return

    setIsSaving(true)

    try {
      const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          assets: assets.map((a) => ({ ...a, symbol: a.symbol.trim().toUpperCase() })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not save this portfolio')
      }

      toast.success(`Saved "${data.name}"`)
      mutate('/api/portfolios')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not save this portfolio'
      )
    } finally {
      setIsSaving(false)
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
            <div
              className={`space-y-3 ${
                assets.length > SCROLL_ASSETS_ABOVE
                  ? 'max-h-96 overflow-y-auto pr-2'
                  : ''
              }`}
            >
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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAsset}
                disabled={assets.length >= MAX_ASSETS}
                className="flex-1"
              >
                <Plus className="mr-2 h-4 w-4" />
                {assets.length >= MAX_ASSETS
                  ? `Maximum ${MAX_ASSETS} assets`
                  : 'Add Asset'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={handleCsvUpload}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              CSV: one holding per row as{' '}
              <code className="text-foreground">SPY,60</code>. A header row is
              optional, and leaving the weights out splits them evenly.
            </p>

            {csvErrors.length > 0 && (
              <div
                role="alert"
                className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="space-y-1 text-xs text-destructive">
                  <p className="font-medium">That file was not imported.</p>
                  <ul className="space-y-0.5">
                    {csvErrors.slice(0, 5).map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                    {csvErrors.length > 5 && (
                      <li>…and {csvErrors.length - 5} more.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
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

          <div className="space-y-2">
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
            {canSave && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Spinner className="mr-2" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Portfolio
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
