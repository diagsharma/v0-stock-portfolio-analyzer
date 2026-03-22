'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { subYears } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { AssetRow } from '@/components/asset-row'
import { DateRangePicker } from '@/components/date-range-picker'
import type { Asset, BacktestRequest } from '@/lib/types'

interface PortfolioFormProps {
  onSubmit: (request: BacktestRequest) => void
  isLoading: boolean
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

  const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0)
  const isValidWeight = Math.abs(totalWeight - 100) < 0.01

  const addAsset = () => {
    setAssets([...assets, { id: Date.now().toString(), symbol: '', weight: 0 }])
  }

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    setAssets(assets.map(a => (a.id === id ? { ...a, ...updates } : a)))
  }

  const removeAsset = (id: string) => {
    if (assets.length > 1) {
      setAssets(assets.filter(a => a.id !== id))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dateRange?.from || !dateRange?.to || !isValidWeight) return

    const validAssets = assets.filter(a => a.symbol.trim() !== '' && a.weight > 0)
    if (validAssets.length === 0) return

    onSubmit({
      assets: validAssets,
      startDate: dateRange.from.toISOString().split('T')[0],
      endDate: dateRange.to.toISOString().split('T')[0],
      initialInvestment,
    })
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Portfolio Configuration</CardTitle>
        <CardDescription>
          Add assets with their allocation weights. Weights must sum to 100%.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Assets</Label>
              <span
                className={`text-sm ${
                  isValidWeight ? 'text-success' : 'text-destructive'
                }`}
              >
                Total: {totalWeight.toFixed(1)}%
              </span>
            </div>
            <div className="space-y-3">
              {assets.map(asset => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  onUpdate={updateAsset}
                  onRemove={removeAsset}
                  canRemove={assets.length > 1}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAsset}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Date Range</Label>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
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
              onChange={(e) => setInitialInvestment(parseFloat(e.target.value) || 0)}
              className="bg-input"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              isLoading ||
              !isValidWeight ||
              !dateRange?.from ||
              !dateRange?.to ||
              assets.every(a => a.symbol.trim() === '')
            }
          >
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
