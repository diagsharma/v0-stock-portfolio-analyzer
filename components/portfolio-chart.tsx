'use client'

import { format } from 'date-fns'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PortfolioDataPoint } from '@/lib/types'

interface PortfolioChartProps {
  data: PortfolioDataPoint[]
  initialInvestment: number
}

export function PortfolioChart({ data, initialInvestment }: PortfolioChartProps) {
  const chartData = data.map(point => ({
    date: point.date,
    value: point.value,
    formattedDate: format(new Date(point.date), 'MMM yyyy'),
  }))

  const minValue = Math.min(...data.map(d => d.value))
  const maxValue = Math.max(...data.map(d => d.value))
  const padding = (maxValue - minValue) * 0.1
  const yDomain = [Math.floor(minValue - padding), Math.ceil(maxValue + padding)]

  const finalValue = data[data.length - 1]?.value || initialInvestment
  const isPositive = finalValue >= initialInvestment

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Portfolio Value Over Time</CardTitle>
        <CardDescription>
          Starting from ${initialInvestment.toLocaleString()} to $
          {finalValue.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? 'oklch(0.72 0.19 145)' : 'oklch(0.55 0.22 25)'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? 'oklch(0.72 0.19 145)' : 'oklch(0.55 0.22 25)'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 285)" />
              <XAxis
                dataKey="formattedDate"
                stroke="oklch(0.65 0 0)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="oklch(0.65 0 0)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={yDomain}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.18 0.005 285)',
                  border: '1px solid oklch(0.28 0.01 285)',
                  borderRadius: '8px',
                  color: 'oklch(0.98 0 0)',
                }}
                labelStyle={{ color: 'oklch(0.65 0 0)' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? 'oklch(0.72 0.19 145)' : 'oklch(0.55 0.22 25)'}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
