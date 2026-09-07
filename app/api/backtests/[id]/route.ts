import { NextResponse } from 'next/server'

import { requireUser } from '@/lib/supabase/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // This route previously took no account of who was asking, so any visitor
  // could delete any run by guessing its id.
  const auth = await requireUser('Sign in to manage your backtest history')

  if ('error' in auth) return auth.error

  const { supabase, user } = auth
  const { id } = await params

  // Scoped by user_id as well as id: RLS enforces this too, but a route that
  // states the ownership rule itself cannot be broken by a policy change.
  const { error } = await supabase
    .from('backtests')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
