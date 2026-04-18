export interface Asset {
  id: string
  symbol: string
  weight: number
}

export interface BacktestRequest {
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

// Database types
export interface DbUser {
  id: string
  created_at: string
}

export interface DbBacktest {
  id: string
  user_id: string
  assets: { symbol: string; weight: number }[]
  start_date: string
  end_date: string
  initial_investment: number
  total_return: number | null
  annualized_return: number | null
  volatility: number | null
  sharpe_ratio: number | null
  max_drawdown: number | null
  created_at: string
}
