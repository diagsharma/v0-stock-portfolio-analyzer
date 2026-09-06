import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { isSupabaseConfigured } from './server'

/**
 * Refresh the Supabase auth session on every request, from proxy.ts.
 *
 * Access tokens are short-lived, so without this a signed-in user is quietly
 * signed out again as soon as their token expires. Calling getUser() here
 * refreshes it and writes the rotated cookies onto the outgoing response.
 *
 * Auth is optional in the same way persistence is: with Supabase unconfigured
 * the app still runs anonymously, so this is a no-op rather than an error.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request })

  if (!isSupabaseConfigured()) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}
