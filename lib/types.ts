export interface Asset {
  id: string
  symbol: string
  weight: number
}

export interface BacktestRequest {
  name?: string
  assets: Asset[]
  startDate: string
  endDate: string
  initialInvestment: number
}

export interface BacktestMetrics {
  totalReturn: number
  annualizedReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
}

export interface PortfolioDataPoint {
  date: string
  value: number
}

export interface BacktestResult {
  metrics: BacktestMetrics
  portfolioHistory: PortfolioDataPoint[]
  assetReturns: Record<string, number>
  // Benchmark comparison, present whenever the run completed successfully.
  benchmark?: string
  benchmarkMetrics?: BacktestMetrics | null
  benchmarkHistory?: PortfolioDataPoint[] | null
}

export type BacktestStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

// A saved backtest run as stored in Supabase.
export interface BacktestRecord {
  id: string
  name: string | null
  assets: Asset[]
  startDate: string
  endDate: string
  initialInvestment: number
  status: BacktestStatus
  metrics: BacktestMetrics | null
  portfolioHistory: PortfolioDataPoint[] | null
  assetReturns: Record<string, number> | null
  benchmark?: string
  benchmarkMetrics?: BacktestMetrics | null
  benchmarkHistory?: PortfolioDataPoint[] | null
  // The window actually covered, narrower than the requested range when a
  // holding has less price history than was asked for.
  effectiveStartDate?: string
  effectiveEndDate?: string
  error: string | null
  createdAt: string
  updatedAt: string
}
