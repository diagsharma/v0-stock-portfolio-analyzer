import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * OAuth redirect target. Google sends the user back here with a one-time
 * code, which is exchanged for a session and written to cookies before the
 * user lands back on the app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error_description') ?? searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/?authError=${encodeURIComponent(error)}`)
  }

  if (code) {
    const supabase = await createClient()

    if (supabase) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        return NextResponse.redirect(
          `${origin}/?authError=${encodeURIComponent(exchangeError.message)}`
        )
      }
    }
  }

  return NextResponse.redirect(origin)
}
