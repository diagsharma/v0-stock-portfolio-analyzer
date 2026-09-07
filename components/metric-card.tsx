import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string
  description?: string
  trend?: 'positive' | 'negative' | 'neutral'
}

export function MetricCard({ title, value, description, trend = 'neutral' }: MetricCardProps) {
  return (
    // Two of these sit side by side from the narrowest screen up, which leaves
    // roughly 110px of content on a small phone. The padding and the value
    // scale down to fit rather than letting figures spill out of the card.
    <Card className="gap-2 border-border bg-card py-4 sm:gap-3 sm:py-6">
      <CardHeader className="px-4 pb-0 sm:px-6">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
          {title}
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
}
