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
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'text-2xl font-bold',
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
