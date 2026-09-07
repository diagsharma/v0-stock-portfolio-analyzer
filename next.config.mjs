/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type errors fail the build. This was previously set to ignore them, which
  // meant a genuine type error could ship to production unnoticed.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // The worker must be revalidated on every load, otherwise a cached copy
        // keeps serving its own stale caching rules and updates never land.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
