'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

/**
 * Registers the service worker in public/sw.js and drives its update flow.
 *
 * Production only: `next dev` serves unhashed assets and relies on HMR, both of
 * which a caching worker fights. Exercise the PWA with `npm run build && npm start`.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const container = navigator.serviceWorker

    // A first install also changes the controller, because the worker claims
    // open pages as soon as it activates. Only a change after that is an
    // update worth reloading for.
    const hadController = Boolean(container.controller)
    let reloading = false

    const onControllerChange = () => {
      if (!hadController || reloading) return
      reloading = true
      // The new worker serves a different build, so the page and its chunks
      // have to come from the same one.
      window.location.reload()
    }

    container.addEventListener('controllerchange', onControllerChange)

    let registration: ServiceWorkerRegistration | undefined

    // Never swap the worker out from under a running page. The user decides
    // when to take the update, which matters when a backtest is on screen.
    const offerUpdate = (worker: ServiceWorker) => {
      toast('A new version is available', {
        duration: Infinity,
        action: {
          label: 'Reload',
          onClick: () => worker.postMessage({ type: 'SKIP_WAITING' }),
        },
      })
    }

    const watch = (reg: ServiceWorkerRegistration) => {
      registration = reg

      // Already waiting from an earlier visit.
      if (reg.waiting && container.controller) offerUpdate(reg.waiting)

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing
        if (!installing) return

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && container.controller) {
            offerUpdate(installing)
          }
        })
      })
    }

    const register = () => {
      container
        // updateViaCache 'none' keeps the browser's own HTTP cache out of the
        // update check, so a corrected worker can never be masked by a cached
        // copy of the broken one it replaces.
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(watch)
        // Failing to register only costs offline support, so it stays silent.
        .catch(() => undefined)
    }

    // Waiting for load keeps the worker's precache off the critical path.
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register)

    // Returning to an installed app is the moment an update is most welcome,
    // and on mobile it is often the only navigation that ever happens.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        registration?.update().catch(() => undefined)
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('load', register)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      container.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  return null
}
