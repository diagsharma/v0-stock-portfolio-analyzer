'use client'

import useSWR from 'swr'
import { Clock, Loader2, CheckCircle2, XCircle, Trash2, History } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { BacktestRecord, BacktestStatus } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusConfig: Record<
  BacktestStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: { label: 'Pending', icon: Clock, className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', icon: Loader2, className: 'bg-primary/10 text-primary' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-success/10 text-success' },
  failed: { label: 'Failed', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
}

interface BacktestHistoryProps {
  onSelect: (record: BacktestRecord) => void
  selectedId?: string | null
}

export function BacktestHistory({ onSelect, selectedId }: BacktestHistoryProps) {
  // Poll so that in-progress runs update to completed/failed automatically.
  const { data, error, isLoading, mutate } = useSWR<BacktestRecord[]>(
    '/api/backtests',
    fetcher,
    { refreshInterval: 4000 }
  )

  const records = Array.isArray(data) ? data : []

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await fetch(`/api/backtests/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <History className="h-5 w-5" />
          History
        </CardTitle>
        <CardDescription>Previously run backtests and their status.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading history...</p>
        )}
        {error && (
          <p className="text-sm text-destructive">Failed to load history.</p>
        )}
        {!isLoading && !error && records.length === 0 && (
          <p className="text-sm text-muted-foreground">No saved backtests yet.</p>
        )}

        {records.length > 0 && (
          <ScrollArea className="h-[320px] pr-3">
            <ul className="space-y-2">
              {records.map((record) => {
                const config = statusConfig[record.status]
                const Icon = config.icon
                const isActive = record.id === selectedId
                const symbols = record.assets.map((a) => a.symbol).join(', ')

                return (
                  <li key={record.id}>
                    <button
                      type="button"
                      onClick={() => record.status === 'completed' && onSelect(record)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-secondary/40 hover:bg-secondary'
                      } ${record.status === 'completed' ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {record.name || symbols || 'Untitled backtest'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {symbols || '—'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(record.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant="secondary"
                            className={`gap-1 ${config.className}`}
                          >
                            <Icon
                              className={`h-3 w-3 ${
                                record.status === 'in_progress' ? 'animate-spin' : ''
                              }`}
                            />
                            {config.label}
                          </Badge>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => handleDelete(e, record.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleDelete(e as unknown as React.MouseEvent, record.id)
                              }
                            }}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete backtest"
                          >
                            <Trash2 className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                      {record.status === 'failed' && record.error && (
                        <p className="mt-2 text-xs text-destructive">{record.error}</p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
