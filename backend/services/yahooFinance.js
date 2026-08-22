/**
 * Yahoo Finance market data provider.
 *
 * Used as the fallback the project brief permits, and in practice as the main
 * source of long-range daily history, because Alpha Vantage's free tier caps
 * TIME_SERIES_DAILY at the most recent 100 trading days.
 *
 * This is an unofficial endpoint with no stability guarantee, which is exactly
 * why every provider sits behind the same interface in marketData.js -- if
 * Yahoo changes, only this file needs replacing.
 */

const {
  TickerNotFoundError,
  MarketDataError,
} = require('../utils/errors')

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'
const PROVIDER = 'yahoo'
const DEFAULT_TIMEOUT_MS = 8000

// Yahoo rejects requests without a browser-like User-Agent.
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0 Safari/537.36',
}

/**
 * Convert a YYYY-MM-DD date to a UNIX timestamp in seconds, at UTC midnight.
 *
 * @param {string} date
 * @returns {number}
 */
function toUnixSeconds(date) {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000)
}

/**
 * Fetch daily prices for a single ticker from Yahoo Finance.
 *
 * Returns adjusted close where available, which accounts for dividends and
 * splits and is the correct basis for return calculations. Falls back to raw
 * close only when Yahoo omits the adjusted series.
 *
 * @param {string} ticker - Symbol, already validated and uppercased.
 * @param {object} options
 * @param {string} options.startDate - YYYY-MM-DD, inclusive.
 * @param {string} options.endDate - YYYY-MM-DD, inclusive.
 * @param {number} [options.timeout=8000]
 * @param {typeof fetch} [options.fetchImpl] - Injectable for tests.
 * @returns {Promise<{date: string, close: number}[]>} Chronological prices.
 * @throws {TickerNotFoundError|MarketDataError}
 */
async function fetchHistoricalPrices(ticker, options = {}) {
  const {
    startDate,
    endDate,
    timeout = DEFAULT_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options

  if (!startDate || !endDate) {
    throw new MarketDataError('Yahoo Finance requires both a start and end date')
  }

  // Yahoo's period2 is exclusive at the day boundary, so push it a day out to
  // keep the requested end date inclusive.
  const period1 = toUnixSeconds(startDate)
  const period2 = toUnixSeconds(endDate) + 86400

  const url =
    `${BASE_URL}/${encodeURIComponent(ticker)}` +
    `?period1=${period1}&period2=${period2}&interval=1d`

  let response

  try {
    response = await fetchImpl(url, {
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(timeout),
    })
  } catch (error) {
    throw new MarketDataError(
      `Yahoo Finance request for ${ticker} failed: ${error.message}`
    )
  }

  // Yahoo answers an unknown symbol with 404 and a JSON error body.
  if (response.status === 404) {
    throw new TickerNotFoundError(ticker)
  }

  if (!response.ok) {
    throw new MarketDataError(
      `Yahoo Finance returned HTTP ${response.status} for ${ticker}`
    )
  }

  let payload

  try {
    payload = await response.json()
  } catch {
    throw new MarketDataError(`Yahoo Finance returned invalid JSON for ${ticker}`)
  }

  if (payload?.chart?.error) {
    const code = payload.chart.error.code

    if (code === 'Not Found') {
      throw new TickerNotFoundError(ticker)
    }

    throw new MarketDataError(
      `Yahoo Finance error for ${ticker}: ${payload.chart.error.description || code}`
    )
  }

  const result = payload?.chart?.result?.[0]

  if (!result || !Array.isArray(result.timestamp)) {
    throw new TickerNotFoundError(ticker)
  }

  const timestamps = result.timestamp
  const adjClose = result.indicators?.adjclose?.[0]?.adjclose
  const rawClose = result.indicators?.quote?.[0]?.close
  const closes = adjClose || rawClose

  if (!Array.isArray(closes)) {
    throw new MarketDataError(`Yahoo Finance returned no price series for ${ticker}`)
  }

  const prices = []

  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i]

    // Yahoo pads holidays and halted sessions with nulls.
    if (close === null || close === undefined || !Number.isFinite(close)) {
      continue
    }

    prices.push({
      date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      close,
    })
  }

  if (prices.length === 0) {
    throw new MarketDataError(
      `Yahoo Finance returned no usable prices for ${ticker} in the requested range`
    )
  }

  return prices.sort((a, b) => a.date.localeCompare(b.date))
}

module.exports = {
  PROVIDER,
  fetchHistoricalPrices,
}
