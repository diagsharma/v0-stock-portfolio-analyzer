import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * True when both Supabase environment variables are present.
 *
 * Persistence is optional: the project brief puts saved history out of scope
 * and states that no database is required for the MVP. Running a backtest must
 * therefore work with no Supabase project configured at all.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Create a server-side Supabase client, or return null when the project is not
 * configured. Callers must handle null rather than assuming a client exists.
 */
export async function createClient() {
  if (!isSupabaseConfigured()) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - can be ignored
          }
        },
      },
    }
  )
}
