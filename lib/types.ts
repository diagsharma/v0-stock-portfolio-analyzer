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
  error: string | null
  createdAt: string
  updatedAt: string
}
