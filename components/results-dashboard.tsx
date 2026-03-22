'use client'

import { MetricCard } from '@/components/metric-card'
import { PortfolioChart } from '@/components/portfolio-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BacktestResult } from '@/lib/types'

interface ResultsDashboardProps {
  result: BacktestResult
  initialInvestment: number
}

export function ResultsDashboard({ result, initialInvestment }: ResultsDashboardProps) {
  const { metrics, portfolioHistory, assetReturns } = result

  const formatPercent = (value: number, showSign = true) => {
    const sign = showSign && value > 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Return"
          value={formatPercent(metrics.totalReturn)}
          trend={metrics.totalReturn >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          title="Annualized Return"
          value={formatPercent(metrics.annualizedReturn)}
          trend={metrics.annualizedReturn >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          title="Volatility"
          value={formatPercent(metrics.volatility, false)}
          description="Annualized std dev"
        />
        <MetricCard
          title="Sharpe Ratio"
          value={metrics.sharpeRatio.toFixed(2)}
          description="Risk-adjusted return"
          trend={metrics.sharpeRatio >= 1 ? 'positive' : metrics.sharpeRatio >= 0 ? 'neutral' : 'negative'}
        />
        <MetricCard
          title="Max Drawdown"
          value={`-${metrics.maxDrawdown.toFixed(2)}%`}
          description="Largest peak-to-trough"
          trend="negative"
        />
      </div>

      <PortfolioChart data={portfolioHistory} initialInvestment={initialInvestment} />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Individual Asset Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(assetReturns).map(([symbol, returnValue]) => (
              <div key={symbol} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="font-medium text-foreground">{symbol}</span>
                <span
                  className={
                    returnValue >= 0 ? 'text-success' : 'text-destructive'
                  }
                >
                  {formatPercent(returnValue)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
