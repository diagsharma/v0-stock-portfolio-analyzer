'use client'

import { Calendar, TrendingUp, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { DbBacktest } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

interface BacktestHistoryProps {
  backtests: DbBacktest[]
  onSelectBacktest: (backtest: DbBacktest) => void
  onDeleteBacktest?: (id: string) => void
}

export function BacktestHistory({
  backtests,
  onSelectBacktest,
  onDeleteBacktest,
}: BacktestHistoryProps) {
  if (backtests.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Backtest History</CardTitle>
          <CardDescription>No backtests saved yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Backtest History</CardTitle>
        <CardDescription>{backtests.length} saved backtest(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {backtests.map((backtest) => (
            <div
              key={backtest.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer"
              onClick={() => onSelectBacktest(backtest)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {backtest.assets.map(a => a.symbol).join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(backtest.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {backtest.total_return !== null && (
                  <div className="mt-1 text-sm">
                    <span
                      className={
                        backtest.total_return >= 0
                          ? 'text-success'
                          : 'text-destructive'
                      }
                    >
                      {backtest.total_return >= 0 ? '+' : ''}{backtest.total_return.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
              {onDeleteBacktest && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteBacktest(backtest.id)
                  }}
                  className="ml-2 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
