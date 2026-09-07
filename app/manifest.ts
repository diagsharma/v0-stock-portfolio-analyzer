import type { MetadataRoute } from 'next'

// Next serves this at /manifest.webmanifest and links it from every page.
// The colours mirror --background and --primary in app/globals.css.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Portfolio Backtester',
    short_name: 'Backtester',
    description:
      'Backtest your portfolio allocation strategy against real market data, with dividends reinvested as they are paid.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Falls back left to right, so browsers without standalone still get a
    // chrome-light window rather than a full browser tab.
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#060607',
    theme_color: '#060607',
    categories: ['finance', 'productivity', 'business'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
