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
}

export function AssetRow({ asset, onUpdate, onRemove, canRemove }: AssetRowProps) {
  return (
    <div className="flex items-center gap-3">
      <Input
        placeholder="Symbol (e.g., AAPL)"
        value={asset.symbol}
        onChange={(e) => onUpdate(asset.id, { symbol: e.target.value.toUpperCase() })}
        className="flex-1 bg-input"
      />
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={100}
          value={asset.weight}
          onChange={(e) => onUpdate(asset.id, { weight: parseFloat(e.target.value) || 0 })}
          className="w-20 bg-input"
        />
        <span className="text-muted-foreground text-sm">%</span>
      </div>
      <Button
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
  )
}
