/*
 * Service worker for the Portfolio Backtester PWA.
 *
 * Bump VERSION whenever the caching rules below change: the activate handler
 * deletes every cache that does not match, which is what evicts stale entries.
 */
const VERSION = 'v1'
const PRECACHE = `backtester-precache-${VERSION}`
const RUNTIME = `backtester-runtime-${VERSION}`

const OFFLINE_URL = '/offline'

// Enough to render something branded with no network at all.
const PRECACHE_URLS = [OFFLINE_URL, '/icons/icon-192.png', '/manifest.webmanifest']

// Hashed build assets are immutable, so the runtime cache only grows. Cap it so
// a long-lived install cannot accumulate every chunk of every past deploy.
const RUNTIME_MAX_ENTRIES = 160

self.addEventListener('install', (event) => {
  // Individually, so one 404 cannot fail the whole install the way addAll does.
  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined)))
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('backtester-') && key !== PRECACHE && key !== RUNTIME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// The page can hand control to a waiting worker once the user opts in, rather
// than us calling skipWaiting() on install and swapping assets mid-session.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Market data, saved portfolios and the Supabase auth exchange are per-user
  // and time sensitive. A cached copy would be wrong, not merely stale.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  // RSC payloads are tied to one build id; serving an old one breaks navigation.
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})

function isCacheable(response) {
  return Boolean(response) && response.status === 200 && response.type === 'basic'
}

async function putInCache(cacheName, request, response) {
  const cache = await caches.open(cacheName)
  await cache.put(request, response)
  await trimCache(cache)
}

// Cache.keys() resolves in insertion order, so the front of the list is oldest.
async function trimCache(cache) {
  const keys = await cache.keys()
  if (keys.length <= RUNTIME_MAX_ENTRIES) return
  await Promise.all(keys.slice(0, keys.length - RUNTIME_MAX_ENTRIES).map((key) => cache.delete(key)))
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (isCacheable(response)) await putInCache(RUNTIME, request, response.clone())
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (isCacheable(response)) await putInCache(RUNTIME, request, response.clone())
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) return cached

    const offline = await caches.match(OFFLINE_URL)
    if (offline) return offline

    throw error
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)

  const network = fetch(request)
    .then(async (response) => {
      if (isCacheable(response)) await putInCache(RUNTIME, request, response.clone())
      return response
    })
    .catch(() => undefined)

  if (cached) return cached

  const response = await network
  if (response) return response
  return Response.error()
}
