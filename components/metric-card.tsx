'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface MetricInfo {
  // What the number is, in plain words.
  what: string
  // What a beginner can do with it.
  use: string
}

interface MetricCardProps {
  title: string
  value: string
  description?: string
  trend?: 'positive' | 'negative' | 'neutral'
  info?: MetricInfo
}

export function MetricCard({ title, value, description, trend = 'neutral', info }: MetricCardProps) {
  // Controlled so a tap opens it too: touch screens have no hover, and Radix
  // tooltips otherwise close on click.
  const [open, setOpen] = useState(false)

  const card = (
    // Two of these sit side by side from the narrowest screen up, which leaves
    // roughly 110px of content on a small phone. The padding and the value
    // scale down to fit rather than letting figures spill out of the card.
    <Card
      className={cn(
        'gap-2 border-border bg-card py-4 sm:gap-3 sm:py-6',
        info &&
          'cursor-help outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring'
      )}
      tabIndex={info ? 0 : undefined}
      aria-label={info ? `${title}: ${value}` : undefined}
    >
      <CardHeader className="px-4 pb-0 sm:px-6">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
          {title}
          {info && <Info className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div
          className={cn(
            'text-xl leading-tight font-bold tabular-nums break-words sm:text-2xl',
            trend === 'positive' && 'text-success',
            trend === 'negative' && 'text-destructive',
            trend === 'neutral' && 'text-foreground'
          )}
        >
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )

  if (!info) return card

  return (
    <Tooltip open={open} onOpenChange={setOpen} delayDuration={150}>
      <TooltipTrigger
        asChild
        onClick={(e) => {
          // Skips Radix's close-on-click so a tap opens the tip.
          e.preventDefault()
          setOpen(true)
        }}
      >
        {card}
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6} collisionPadding={12} className="max-w-72 space-y-1.5 px-3 py-2 text-left text-wrap">
        <p className="font-semibold">{title}</p>
        <p>{info.what}</p>
        <p>
          <span className="font-semibold">How to use it: </span>
          {info.use}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
