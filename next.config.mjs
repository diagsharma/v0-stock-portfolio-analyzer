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
}

export default nextConfig
