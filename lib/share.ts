import type { BacktestRecord } from '@/lib/types'

// Beyond this the holdings list crowds out the results in a post.
const MAX_LISTED_HOLDINGS = 4

const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`

function monthYear(isoDate: string) {
  // Noon avoids the date sliding a day in negative-offset time zones.
  return new Date(`${isoDate.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

function holdingsLabel(record: BacktestRecord) {
  if (record.name) return record.name

  const listed = record.assets
    .slice(0, MAX_LISTED_HOLDINGS)
    .map((a) => `${a.symbol} ${Math.round(a.weight)}%`)
    .join(', ')
  const more = record.assets.length - MAX_LISTED_HOLDINGS

  return more > 0 ? `${listed} +${more} more` : listed
}

export interface ShareContent {
  url: string
  // Short enough for X, with the link counted separately.
  headline: string
  // The full overview for platforms and clipboards with room for it.
  summary: string
}

/** Build the post a user shares for a completed backtest. */
export function buildShareContent(record: BacktestRecord, appUrl: string): ShareContent {
  const metrics = record.metrics!
  const benchmark = !record.benchmark || record.benchmark === 'SPY' ? 'S&P 500' : record.benchmark
  const period = `${monthYear(record.effectiveStartDate ?? record.startDate)} – ${monthYear(
    record.effectiveEndDate ?? record.endDate
  )}`
  const vsBenchmark = record.benchmarkMetrics
    ? ` vs the ${benchmark}'s ${signed(record.benchmarkMetrics.totalReturn)}`
    : ''

  const headline = `I backtested my portfolio (${holdingsLabel(record)}): ${signed(
    metrics.totalReturn
  )} from ${period}${vsBenchmark}. Try your own portfolio free:`

  const summary = [
    `📈 I backtested my portfolio: ${holdingsLabel(record)}`,
    `${period}`,
    '',
    `Total return: ${signed(metrics.totalReturn)}${vsBenchmark}`,
    `Annualized return: ${signed(metrics.annualizedReturn)}`,
    `Max drawdown: ${metrics.maxDrawdown.toFixed(1)}%`,
    `Sharpe ratio: ${metrics.sharpeRatio.toFixed(2)}`,
    '',
    `See how your own picks would have done:`,
    appUrl,
  ].join('\n')

  return { url: appUrl, headline, summary }
}

/** Links that open each network's share composer with the post filled in. */
export function shareLinks({ url, headline, summary }: ShareContent) {
  const u = encodeURIComponent(url)

  return {
    x: `https://x.com/intent/post?text=${encodeURIComponent(headline)}&url=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(summary)}`,
    reddit: `https://www.reddit.com/submit?url=${u}&title=${encodeURIComponent(
      headline.replace(/ Try your own portfolio free:$/, '')
    )}`,
  }
}
