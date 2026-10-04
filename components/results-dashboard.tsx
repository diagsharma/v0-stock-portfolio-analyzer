'use client'

import { Info } from 'lucide-react'

import { MetricCard } from '@/components/metric-card'
import { PortfolioChart } from '@/components/portfolio-chart'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { BacktestMetrics, PortfolioDataPoint } from '@/lib/types'

interface ResultsDashboardProps {
  metrics: BacktestMetrics
  portfolioHistory: PortfolioDataPoint[]
  assetReturns: Record<string, number>
  initialInvestment: number
  benchmarkMetrics?: BacktestMetrics | null
  benchmarkHistory?: PortfolioDataPoint[] | null
  benchmark?: string
  requestedStartDate?: string
  effectiveStartDate?: string
  priceOnlyMetrics?: BacktestMetrics | null
  dividendYield?: number | null
  assetDividendYields?: Record<string, number> | null
}

const formatPercent = (value: number, showSign = true) => {
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// Plain-language help shown on hover, written for first-time investors.
const METRIC_INFO = {
  totalReturn: {
    what: 'How much your money grew or shrank over the whole period, with dividends reinvested. +50% means $10,000 became $15,000.',
    use: 'Compare it with the S&P 500 figure underneath. If the index did better, simply buying an index fund would have beaten these picks.',
  },
  dividendYield: {
    what: 'Cash that companies paid to shareholders, shown as a yearly percentage of what the portfolio was worth. Here it is reinvested to buy more shares.',
    use: 'A higher yield means more income without selling anything. The line underneath shows how much of your total return came from dividends.',
  },
  annualizedReturn: {
    what: 'Your average growth per year (CAGR), as if the portfolio had grown at a steady rate. It lets you compare periods of different lengths.',
    use: 'Compare it with other options, like a savings account paying 4% a year. US stocks have historically averaged roughly 10% a year.',
  },
  volatility: {
    what: 'How much the value swung up and down, measured over a year. A higher number means a bumpier ride.',
    use: 'Ask yourself whether you could stay calm through swings this size. Mixing in bonds or other sectors usually lowers it.',
  },
  sharpeRatio: {
    what: 'How much return you earned for each unit of risk taken, after subtracting what a risk-free investment (assumed 2% a year) would have paid.',
    use: 'Use it to compare portfolios: higher is better. Below 0 means a risk-free account would have done better, around 1 is good and above 2 is excellent.',
  },
  maxDrawdown: {
    what: 'The biggest fall from a high point to a later low point. −35% means $10,000 dropped to $6,500 at its worst before recovering.',
    use: 'This is the loss you would have had to sit through. If a drop like this would make you sell in a panic, consider a less risky mix.',
  },
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
  requestedStartDate,
  effectiveStartDate,
  priceOnlyMetrics,
  dividendYield,
  assetDividendYields,
}: ResultsDashboardProps) {
  const label = benchmarkName(benchmark)
  // What reinvested dividends added on top of price movement alone. Runs saved
  // before dividends were modelled have no price-only figure to compare with.
  const dividendContribution = priceOnlyMetrics
    ? metrics.totalReturn - priceOnlyMetrics.totalReturn
    : null
  // Surfaced rather than silently applied: if one holding is younger than the
  // requested range, the whole comparison shifts to the shorter window.
  const windowTrimmed =
    requestedStartDate &&
    effectiveStartDate &&
    effectiveStartDate.slice(0, 7) !== requestedStartDate.slice(0, 7)
  const beatBenchmark =
    benchmarkMetrics && metrics.totalReturn > benchmarkMetrics.totalReturn

  return (
    <div className="space-y-6">
      {windowTrimmed && (
        <div className="flex gap-2 rounded-lg border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-pretty">
            One or more holdings have less price history than the range you
            chose, so this backtest covers{' '}
            <strong className="text-foreground">
              {effectiveStartDate} onwards
            </strong>
            . The {label} is measured over the same window, so the comparison
            stays like-for-like.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Total Return"
          info={METRIC_INFO.totalReturn}
          value={formatPercent(metrics.totalReturn)}
          description={
            benchmarkMetrics
              ? `${label} ${formatPercent(benchmarkMetrics.totalReturn)}`
              : undefined
          }
          trend={metrics.totalReturn >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          title="Dividend Yield"
          info={METRIC_INFO.dividendYield}
          value={
            dividendYield === null || dividendYield === undefined
              ? '—'
              : formatPercent(dividendYield, false)
          }
          description={
            dividendContribution === null
              ? 'Annualized, reinvested'
              : `${formatPercent(dividendContribution)} of total return`
          }
          trend={dividendYield ? 'positive' : 'neutral'}
        />
        <MetricCard
          title="Annualized Return"
          info={METRIC_INFO.annualizedReturn}
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
          info={METRIC_INFO.volatility}
          value={formatPercent(metrics.volatility, false)}
          description="Annualized std dev"
        />
        <MetricCard
          title="Sharpe Ratio"
          info={METRIC_INFO.sharpeRatio}
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
          info={METRIC_INFO.maxDrawdown}
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
            {dividendContribution !== null && priceOnlyMetrics && (
              <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                Price movement alone accounts for{' '}
                <strong className="text-foreground">
                  {formatPercent(priceOnlyMetrics.totalReturn)}
                </strong>{' '}
                of that. The remaining{' '}
                <strong className="text-foreground">
                  {dividendContribution.toFixed(2)} percentage points
                </strong>{' '}
                came from dividends being reinvested as they were paid, which
                then compounded for the rest of the period.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Individual Asset Returns</CardTitle>
          <CardDescription>
            Total return with dividends reinvested, and each holding&rsquo;s
            annualized yield over the period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(assetReturns).map(([symbol, returnValue]) => {
              const yieldValue = assetDividendYields?.[symbol]

              return (
                <div
                  key={symbol}
                  className="flex items-center justify-between rounded-lg bg-secondary p-3"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{symbol}</span>
                    {yieldValue !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {yieldValue > 0
                          ? `${yieldValue.toFixed(2)}% yield`
                          : 'No dividends'}
                      </p>
                    )}
                  </div>
                  <span
                    className={
                      returnValue >= 0 ? 'text-success' : 'text-destructive'
                    }
                  >
                    {formatPercent(returnValue)}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
