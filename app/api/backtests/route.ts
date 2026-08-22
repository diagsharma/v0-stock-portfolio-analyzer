import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapRowToRecord } from '@/lib/backtests'

// Returns all saved backtest runs, newest first.
//
// History is an optional extra: the project brief puts persistence out of
// scope, so with no Supabase project configured this returns an empty list
// rather than an error, and the History panel simply shows nothing.
export async function GET() {
  const supabase = await createClient()

  if (!supabase) {
    return NextResponse.json([])
  }

  const { data, error } = await supabase
    .from('backtests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // A missing or mismatched table must not break the page.
    return NextResponse.json([])
  }

  return NextResponse.json((data ?? []).map(mapRowToRecord))
}
