import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/backtests/[userId] - Fetch a user's backtest history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('backtests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching backtests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch backtest history' },
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
