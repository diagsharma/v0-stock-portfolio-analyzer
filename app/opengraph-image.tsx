import { ImageResponse } from 'next/og'

// The preview card shown when the app link is posted on social media.
export const alt = 'Portfolio Backtester: see how your stock picks would have done'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// A stylised rising line, standing in for the portfolio chart.
const LINE = 'M0,250 L120,215 L220,235 L330,170 L430,190 L540,120 L640,140 L760,60 L880,30'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#060607',
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              width: 64,
              height: 64,
              borderRadius: 14,
              background: 'rgba(14,140,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              color: '#0e8cff',
            }}
          >
            ↗
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>Portfolio Backtester</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
            If I had bought these stocks, what would have happened?
          </div>
          <div style={{ fontSize: 30, color: '#a1a1aa' }}>
            Backtest any US portfolio against the S&amp;P 500, free. Dividends included.
          </div>
        </div>

        <svg
          width="880"
          height="190"
          viewBox="0 0 880 260" preserveAspectRatio="none"
          style={{ position: 'absolute', right: 60, top: 60, opacity: 0.35 }}
        >
          <path d={LINE} fill="none" stroke="#0e8cff" strokeWidth="8" />
        </svg>
      </div>
    ),
    size
  )
}
