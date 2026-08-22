'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Asset } from '@/lib/types'

interface AssetRowProps {
  asset: Asset
  onUpdate: (id: string, updates: Partial<Asset>) => void
  onRemove: (id: string) => void
  canRemove: boolean
  error?: string
}

export function AssetRow({
  asset,
  onUpdate,
  onRemove,
  canRemove,
  error,
}: AssetRowProps) {
  const errorId = `asset-error-${asset.id}`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Symbol (e.g. AAPL)"
          value={asset.symbol}
          onChange={(e) =>
            onUpdate(asset.id, { symbol: e.target.value.toUpperCase() })
          }
          // Five letters is the longest valid US exchange symbol, so stop the
          // input before it can hold something that cannot validate.
          maxLength={5}
          aria-label="Ticker symbol"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`flex-1 bg-input ${error ? 'border-destructive' : ''}`}
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            value={asset.weight}
            onChange={(e) =>
              onUpdate(asset.id, { weight: parseFloat(e.target.value) || 0 })
            }
            aria-label="Allocation weight, percent"
            className="w-20 bg-input"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(asset.id)}
          disabled={!canRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove asset</span>
        </Button>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
