'use client'

import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/**
 * The currently signed-in user, or null.
 *
 * Sign-in happens through a redirect, so the session has to be read on mount
 * and then kept in step with onAuthStateChange -- which also covers the token
 * refreshes the middleware performs and sign-outs from another tab.
 *
 * With Supabase unconfigured this reports "signed out, not loading" so the app
 * still runs anonymously, exactly as backtests do without a database.
 */
export function useUser() {
  const supabase = useMemo(() => (isConfigured ? createClient() : null), [])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(isConfigured)

  useEffect(() => {
    if (!supabase) return

    let active = true

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setUser(data.user ?? null)
      setIsLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [supabase])

  return { user, isLoading, supabase, isConfigured }
}
