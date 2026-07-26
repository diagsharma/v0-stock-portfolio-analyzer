import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapRowToRecord } from '@/lib/backtests'

// Returns all saved backtest runs, newest first.
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('backtests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json((data ?? []).map(mapRowToRecord))
}
