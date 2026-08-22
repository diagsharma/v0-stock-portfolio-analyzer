import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapRowToRecord } from '@/lib/backtests'
import type { Asset, PortfolioDataPoint } from '@/lib/types'

import {
  fetchMultipleTickers,
} from '@/backend/services/marketData'
import {
  calculatePortfolioReturns,
  calculateMetrics,
} from '@/backend/utils/calculations'
import {
  validateTicker,
  validateTickers,
  validateDateRange,
} from '@/backend/utils/validation'

const DEFAULT_BENCHMARK = 'SPY'

interface BacktestBody {
  name?: string
  // The UI sends weighted assets; the documented API shape sends plain tickers.
  assets?: Asset[]
  tickers?: string[]
  startDate: string
  endDate: string
  initialInvestment?: number
  benchmark?: string
}

/**
 * Accept either request shape and reduce both to a normalized form.
 *
 * The brief specifies {tickers: [...]} with equal weighting; the existing UI
 * sends {assets: [{symbol, weight}]}, which is a superset. Supporting both
 * keeps the documented contract while letting the current form keep its
 * custom-weight feature.
 */
function normalizeRequest(body: BacktestBody) {
  const rawSymbols = body.assets?.length
    ? body.assets.map((a) => a.symbol)
    : body.tickers ?? []

  const tickers = validateTickers(rawSymbols)
  const { startDate, endDate } = validateDateRange(body.startDate, body.endDate)
  const benchmark = validateTicker(body.benchmark || DEFAULT_BENCHMARK)

  let weights: Record<string, number> | undefined

  if (body.assets?.length) {
    const total = body.assets.reduce((sum, a) => sum + a.weight, 0)

    if (Math.abs(total - 100) > 0.01) {
      throw Object.assign(new Error('Asset weights must sum to 100%'), {
        statusCode: 400,
      })
    }

    weights = {}
    for (const asset of body.assets) {
      weights[asset.symbol.trim().toUpperCase()] = asset.weight
    }
  }

  const initialInvestment = Number(body.initialInvestment ?? 10000)

  if (!Number.isFinite(initialInvestment) || initialInvestment <= 0) {
    throw Object.assign(new Error('Initial investment must be a positive number'), {
      statusCode: 400,
    })
  }

  return { tickers, startDate, endDate, benchmark, weights, initialInvestment }
}

/** Rescale a base-100 series into dollars for the results dashboard. */
function toDollars(
  series: { date: string; value: number }[],
  initialInvestment: number
): PortfolioDataPoint[] {
  return series.map((point) => ({
    date: point.date,
    value: Math.round(point.value * initialInvestment) / 100,
  }))
}

export async function POST(request: Request) {
  try {
    const body: BacktestBody = await request.json()
    const {
      tickers,
      startDate,
      endDate,
      benchmark,
      weights,
      initialInvestment,
    } = normalizeRequest(body)

    // One parallel batch for the portfolio plus the benchmark. The benchmark is
    // only added when it is not already part of the portfolio.
    const symbols = tickers.includes(benchmark) ? tickers : [...tickers, benchmark]
    const priceData = await fetchMultipleTickers(symbols, { startDate, endDate })

    const portfolioPrices = Object.fromEntries(
      tickers.map((ticker) => [ticker, priceData[ticker]])
    )

    const portfolioSeries = calculatePortfolioReturns(
      portfolioPrices,
      startDate,
      endDate,
      weights
    )

    if (portfolioSeries.length < 2) {
      throw Object.assign(
        new Error(
          'Not enough overlapping trading days for the selected assets and date range'
        ),
        { statusCode: 400 }
      )
    }

    const benchmarkSeries = calculatePortfolioReturns(
      { [benchmark]: priceData[benchmark] },
      startDate,
      endDate
    )

    const metrics = calculateMetrics(portfolioSeries)
    const benchmarkMetrics = calculateMetrics(benchmarkSeries)

    // Per-asset total return over the same window, for the dashboard.
    const assetReturns: Record<string, number> = {}

    for (const ticker of tickers) {
      const prices = priceData[ticker]
      const first = prices[0]?.close
      const last = prices[prices.length - 1]?.close

      if (first && last) {
        assetReturns[ticker] = Math.round(((last - first) / first) * 10000) / 100
      }
    }

    const portfolioHistory = toDollars(portfolioSeries, initialInvestment)
    const benchmarkHistory = toDollars(benchmarkSeries, initialInvestment)

    const result = {
      id: crypto.randomUUID(),
      name: body.name?.trim() || null,
      assets: body.assets ?? tickers.map((t) => ({ id: t, symbol: t, weight: 100 / tickers.length })),
      startDate,
      endDate,
      initialInvestment,
      status: 'completed' as const,
      benchmark,
      metrics,
      benchmarkMetrics,
      portfolioHistory,
      benchmarkHistory,
      // Base-100 series, the shape the documented API contract specifies.
      portfolioReturns: portfolioSeries,
      benchmarkReturns: benchmarkSeries,
      assetReturns,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Persistence is best-effort. The brief puts saved history out of scope, so
    // a missing or misconfigured database must never fail a backtest.
    const supabase = await createClient()

    if (supabase) {
      try {
        const { data } = await supabase
          .from('backtests')
          .insert({
            name: result.name,
            assets: result.assets,
            start_date: startDate,
            end_date: endDate,
            initial_investment: initialInvestment,
            status: 'completed',
            metrics,
            portfolio_history: portfolioHistory,
            asset_returns: assetReturns,
          })
          .select()
          .single()

        if (data) {
          return NextResponse.json({ ...result, ...mapRowToRecord(data) })
        }
      } catch {
        // Fall through and return the computed result unsaved.
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    const status =
      (error as { statusCode?: number })?.statusCode ??
      (error as { status?: number })?.status ??
      500
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'

    return NextResponse.json({ error: message }, { status })
  }
}
