import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapRowToRecord } from '@/lib/backtests'

// Returns the signed-in user's saved backtest runs, newest first.
//
// History is per account. A run records the portfolio that produced it, so
// reading the table unscoped -- as this route used to -- showed every user the
// symbols and weights of everyone else. The user_id filter is the fix; the RLS
// policy added in scripts/004 enforces the same rule at the database.
//
// A signed-out or unconfigured caller gets an empty list rather than an error,
// so the History panel simply shows nothing instead of breaking the page.
export async function GET() {
  const supabase = await createClient()

  if (!supabase) {
    return NextResponse.json([])
  }

  const { data: auth } = await supabase.auth.getUser()

  if (!auth.user) {
    return NextResponse.json([])
  }

  const { data, error } = await supabase
    .from('backtests')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    // A missing or mismatched table must not break the page.
    return NextResponse.json([])
  }

  return NextResponse.json((data ?? []).map(mapRowToRecord))
}
