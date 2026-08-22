import * as React from 'react'

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * Track whether the viewport is below the mobile breakpoint.
 *
 * Uses useSyncExternalStore rather than an effect that calls setState on mount.
 * That pattern renders once with the wrong value and then immediately again
 * with the right one, which flashes desktop layout on mobile and triggers the
 * react-hooks/set-state-in-effect rule. The server snapshot returns false so
 * markup stays stable through hydration.
 */
export function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false
  )
}
