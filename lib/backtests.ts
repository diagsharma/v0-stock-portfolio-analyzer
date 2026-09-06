import type { BacktestRecord } from './types'

// Maps a raw Supabase row (snake_case) to the camelCase BacktestRecord used in the app.
export function mapRowToRecord(row: Record<string, unknown>): BacktestRecord {
  return {
    id: row.id as string,
    name: (row.name as string | null) ?? null,
    assets: (row.assets as BacktestRecord['assets']) ?? [],
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    initialInvestment: Number(row.initial_investment),
    status: row.status as BacktestRecord['status'],
    metrics: (row.metrics as BacktestRecord['metrics']) ?? null,
    portfolioHistory: (row.portfolio_history as BacktestRecord['portfolioHistory']) ?? null,
    assetReturns: (row.asset_returns as BacktestRecord['assetReturns']) ?? null,
    priceOnlyMetrics: (row.price_only_metrics as BacktestRecord['priceOnlyMetrics']) ?? null,
    dividendYield:
      row.dividend_yield === null || row.dividend_yield === undefined
        ? null
        : Number(row.dividend_yield),
    assetDividendYields:
      (row.asset_dividend_yields as BacktestRecord['assetDividendYields']) ?? null,
    error: (row.error as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
