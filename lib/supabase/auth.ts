import { NextResponse } from 'next/server'

import { createClient } from './server'

/**
 * Resolve the signed-in user for a route handler, or the response to return
 * when there isn't one.
 *
 * Row Level Security already scopes every query to auth.uid(), but checking
 * here as well means a signed-out caller gets an explicit 401 rather than a
 * silently empty result.
 *
 * Narrow with `if ('error' in auth) return auth.error` before using the rest.
 */
export async function requireUser(unauthenticatedMessage = 'Sign in to save portfolios') {
  const supabase = await createClient()

  if (!supabase) {
    return {
      error: NextResponse.json({ error: 'Storage is not configured' }, { status: 503 }),
    }
  }

  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    return {
      error: NextResponse.json({ error: unauthenticatedMessage }, { status: 401 }),
    }
  }

  return { supabase, user: data.user }
}
