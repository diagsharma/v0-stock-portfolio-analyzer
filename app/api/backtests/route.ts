import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SaveBacktestRequest {
  userId: string
  assets: { symbol: string; weight: number }[]
  startDate: string
  endDate: string
  initialInvestment: number
  totalReturn?: number
  annualizedReturn?: number
  volatility?: number
  sharpeRatio?: number
  maxDrawdown?: number
}

// POST /api/backtests - Save a backtest result
export async function POST(request: Request) {
  try {
    const body: SaveBacktestRequest = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('backtests')
      .insert({
        user_id: body.userId,
        assets: body.assets,
        start_date: body.startDate,
        end_date: body.endDate,
        initial_investment: body.initialInvestment,
        total_return: body.totalReturn,
        annualized_return: body.annualizedReturn,
        volatility: body.volatility,
        sharpe_ratio: body.sharpeRatio,
        max_drawdown: body.maxDrawdown,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving backtest:', error)
      return NextResponse.json(
        { error: 'Failed to save backtest' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
