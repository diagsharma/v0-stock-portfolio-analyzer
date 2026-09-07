'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker in public/sw.js.
 *
 * Production only: `next dev` serves unhashed assets and relies on HMR, both of
 * which a caching worker fights. Exercise the PWA with `npm run build && npm start`.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      // Failing to register only costs offline support, so it stays silent.
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
    }

    // Waiting for load keeps the worker's precache off the critical path.
    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
