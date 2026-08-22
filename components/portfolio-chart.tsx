'use client'

import { format } from 'date-fns'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { PortfolioDataPoint } from '@/lib/types'

// Categorical identity colors, validated for colorblind separation against the
// dark card surface (normal-vision dE 29.3, deutan 27.9). Blue and green are
// close under tritanopia, so the benchmark is also dashed -- identity never
// rests on hue alone.
const PORTFOLIO_COLOR = 'oklch(0.65 0.18 250)'
const BENCHMARK_COLOR = 'oklch(0.65 0.19 145)'

const AXIS_COLOR = 'oklch(0.65 0 0)'
const GRID_COLOR = 'oklch(0.28 0.01 285)'

interface PortfolioChartProps {
  data: PortfolioDataPoint[]
  benchmarkData?: PortfolioDataPoint[]
  benchmarkLabel?: string
  initialInvestment: number
}

interface TooltipEntry {
  name: string
  value: number
  color: string
}

/**
 * Shared crosshair tooltip listing every series at the hovered date, plus the
 * gap between them so the comparison does not have to be done by eye.
 */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  const portfolio = payload.find((p) => p.name === 'Your Portfolio')?.value
  const benchmark = payload.find((p) => p.name !== 'Your Portfolio')?.value
  const difference =
    portfolio !== undefined && benchmark !== undefined
      ? portfolio - benchmark
      : null

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="mb-1.5 text-xs text-muted-foreground">{label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">
              ${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </li>
        ))}
      </ul>
      {difference !== null && (
        <p className="mt-1.5 border-t border-border pt-1.5 text-xs text-muted-foreground">
          Difference{' '}
          <span className="font-medium tabular-nums text-foreground">
            {difference >= 0 ? '+' : '-'}$
            {Math.abs(difference).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </span>
        </p>
      )}
    </div>
  )
}

export function PortfolioChart({
  data,
  benchmarkData,
  benchmarkLabel = 'S&P 500',
  initialInvestment,
}: PortfolioChartProps) {
  const benchmarkByDate = new Map(
    (benchmarkData ?? []).map((point) => [point.date, point.value])
  )

  const chartData = data.map((point) => ({
    date: point.date,
    portfolio: point.value,
    benchmark: benchmarkByDate.get(point.date) ?? null,
    formattedDate: format(new Date(`${point.date}T00:00:00`), 'MMM yyyy'),
  }))

  // One shared axis across both series -- they are both dollar values grown
  // from the same starting investment, so a second scale would misrepresent
  // the comparison.
  const allValues = [
    ...data.map((d) => d.value),
    ...(benchmarkData ?? []).map((d) => d.value),
  ]
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const padding = (maxValue - minValue) * 0.1 || 1
  const yDomain = [Math.floor(minValue - padding), Math.ceil(maxValue + padding)]

  const finalValue = data[data.length - 1]?.value ?? initialInvestment
  const finalBenchmark = benchmarkData?.[benchmarkData.length - 1]?.value

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Portfolio Value Over Time</CardTitle>
        <CardDescription>
          ${initialInvestment.toLocaleString()} grew to $
          {finalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          {finalBenchmark !== undefined && (
            <>
              {' '}
              &middot; {benchmarkLabel} reached $
              {finalBenchmark.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_COLOR}
                vertical={false}
              />
              <XAxis
                dataKey="formattedDate"
                stroke={AXIS_COLOR}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke={AXIS_COLOR}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={52}
                domain={yDomain}
                tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: AXIS_COLOR, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Legend
                verticalAlign="top"
                align="left"
                height={32}
                iconType="plainline"
                wrapperStyle={{ fontSize: 12 }}
                // Recharts tints legend labels with the series color by
                // default. Keep the text in the muted ink token and let the
                // line swatch beside it carry identity.
                formatter={(value: string) => (
                  <span style={{ color: AXIS_COLOR }}>{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="portfolio"
                name="Your Portfolio"
                stroke={PORTFOLIO_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              {benchmarkData && benchmarkData.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  name={benchmarkLabel}
                  stroke={BENCHMARK_COLOR}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
