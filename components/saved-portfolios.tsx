'use client'

import useSWR from 'swr'
import { Bookmark, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { SavedPortfolio } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface SavedPortfoliosProps {
  onLoad: (portfolio: SavedPortfolio) => void
  // The one currently filling the form, so a return visit shows at a glance
  // why the form is not on the default allocation.
  loadedId?: string | null
}

export function SavedPortfolios({ onLoad, loadedId }: SavedPortfoliosProps) {
  const { data, error, isLoading, mutate } = useSWR<SavedPortfolio[]>(
    '/api/portfolios',
    fetcher
  )

  const portfolios = Array.isArray(data) ? data : []

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/portfolios/${id}`, { method: 'DELETE' })

    if (!response.ok) {
      toast.error('Could not delete that portfolio')
      return
    }

    mutate()
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Bookmark className="h-5 w-5" />
          Saved Portfolios
        </CardTitle>
        <CardDescription>
          Allocations saved to your account. Your most recent one fills the form
          when you come back.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <p className="text-sm text-destructive">Failed to load your portfolios.</p>
        )}
        {!isLoading && !error && portfolios.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing saved yet. Build an allocation and choose Save Portfolio.
          </p>
        )}

        {portfolios.length > 0 && (
          <ScrollArea className="max-h-[280px] pr-3">
            <ul className="space-y-2">
              {portfolios.map((portfolio) => (
                <li
                  key={portfolio.id}
                  className={`flex items-start justify-between gap-2 rounded-lg border p-3 ${
                    portfolio.id === loadedId
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-secondary/40'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {portfolio.name}
                      {portfolio.id === loadedId && (
                        <span className="ml-2 text-xs font-normal text-primary">
                          In the form
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {portfolio.assets
                        .map((asset) => `${asset.symbol} ${asset.weight}%`)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onLoad(portfolio)}
                      disabled={portfolio.id === loadedId}
                    >
                      Load
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${portfolio.name}`}
                      onClick={() => handleDelete(portfolio.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
