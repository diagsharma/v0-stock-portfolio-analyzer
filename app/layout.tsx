import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { ServiceWorkerRegistrar } from '@/components/pwa/service-worker-registrar'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the layout reach under the notch and home indicator; app/globals.css
  // pays that back with safe-area padding. Zoom is deliberately left enabled.
  viewportFit: 'cover',
  // Tints the phone status bar and the installed app's title bar to match
  // --background in app/globals.css.
  themeColor: '#060607',
  colorScheme: 'dark',
}

export const metadata: Metadata = {
  title: 'Portfolio Backtester',
  description: 'Backtest your portfolio allocation strategy with historical data',
  generator: 'v0.app',
  applicationName: 'Portfolio Backtester',
  appleWebApp: {
    capable: true,
    // Shown under the icon on an iOS home screen; the full name is truncated.
    title: 'Backtester',
    statusBarStyle: 'black',
  },
  // Stops iOS from linkifying figures like account numbers into call links.
  formatDetection: { telephone: false },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        <InstallPrompt />
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  )
}
