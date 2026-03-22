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
