'use client'

import { MetricCard } from '@/components/metric-card'
import { PortfolioChart } from '@/components/portfolio-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BacktestMetrics, PortfolioDataPoint } from '@/lib/types'

interface ResultsDashboardProps {
  metrics: BacktestMetrics
  portfolioHistory: PortfolioDataPoint[]
  assetReturns: Record<string, number>
  initialInvestment: number
  benchmarkMetrics?: BacktestMetrics | null
  benchmarkHistory?: PortfolioDataPoint[] | null
  benchmark?: string
}

const formatPercent = (value: number, showSign = true) => {
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

const benchmarkName = (symbol?: string) =>
  !symbol || symbol === 'SPY' ? 'S&P 500' : symbol

export function ResultsDashboard({
  metrics,
  portfolioHistory,
  assetReturns,
  initialInvestment,
  benchmarkMetrics,
  benchmarkHistory,
  benchmark,
}: ResultsDashboardProps) {
  const label = benchmarkName(benchmark)
  const beatBenchmark =
    benchmarkMetrics && metrics.totalReturn > benchmarkMetrics.totalReturn

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard
          title="Total Return"
          value={formatPercent(metrics.totalReturn)}
          description={
            benchmarkMetrics
              ? `${label} ${formatPercent(benchmarkMetrics.totalReturn)}`
              : undefined
          }
          trend={metrics.totalReturn >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          title="Annualized Return"
          value={formatPercent(metrics.annualizedReturn)}
          description={
            benchmarkMetrics
              ? `${label} ${formatPercent(benchmarkMetrics.annualizedReturn)}`
              : undefined
          }
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
          trend={
            metrics.sharpeRatio >= 1
              ? 'positive'
              : metrics.sharpeRatio >= 0
                ? 'neutral'
                : 'negative'
          }
        />
        <MetricCard
          title="Max Drawdown"
          value={`${metrics.maxDrawdown.toFixed(2)}%`}
          description={
            benchmarkMetrics
              ? `${label} ${benchmarkMetrics.maxDrawdown.toFixed(2)}%`
              : 'Largest peak-to-trough'
          }
          trend="negative"
        />
      </div>

      <PortfolioChart
        data={portfolioHistory}
        benchmarkData={benchmarkHistory ?? undefined}
        benchmarkLabel={label}
        initialInvestment={initialInvestment}
      />

      {benchmarkMetrics && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-pretty leading-relaxed text-muted-foreground">
              Your portfolio returned{' '}
              <strong className="text-foreground">
                {formatPercent(metrics.totalReturn)}
              </strong>{' '}
              compared to the {label}&rsquo;s{' '}
              <strong className="text-foreground">
                {formatPercent(benchmarkMetrics.totalReturn)}
              </strong>{' '}
              return over this period, with a maximum drawdown of{' '}
              <strong className="text-foreground">
                {metrics.maxDrawdown.toFixed(2)}%
              </strong>{' '}
              versus the benchmark&rsquo;s{' '}
              <strong className="text-foreground">
                {benchmarkMetrics.maxDrawdown.toFixed(2)}%
              </strong>
              .{' '}
              {beatBenchmark
                ? `That is ${(metrics.totalReturn - benchmarkMetrics.totalReturn).toFixed(2)} percentage points ahead of the market.`
                : `That is ${(benchmarkMetrics.totalReturn - metrics.totalReturn).toFixed(2)} percentage points behind the market.`}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Individual Asset Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(assetReturns).map(([symbol, returnValue]) => (
              <div
                key={symbol}
                className="flex items-center justify-between rounded-lg bg-secondary p-3"
              >
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
