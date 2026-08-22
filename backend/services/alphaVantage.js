/**
 * Alpha Vantage market data provider.
 *
 * IMPORTANT LIMITATION (verified 2026-08-22):
 * The free tier no longer serves `outputsize=full` on TIME_SERIES_DAILY --
 * it responds with an "Information" message pointing at the premium plans.
 * `outputsize=compact` returns only the most recent 100 trading days, which is
 * not enough for any multi-year backtest. The market data layer therefore
 * treats a short Alpha Vantage response as a reason to fall back to Yahoo
 * Finance, which the project brief permits explicitly.
 */

const {
  TickerNotFoundError,
  ProviderUnavailableError,
  MarketDataError,
} = require('../utils/errors')

const BASE_URL = 'https://www.alphavantage.co/query'
const PROVIDER = 'alphavantage'
const DEFAULT_TIMEOUT_MS = 5000

/**
 * Detect the various shapes Alpha Vantage uses to say "no data for you".
 *
 * @param {object} payload - Parsed JSON response body.
 * @returns {string|null} The quota/paywall message, or null if none.
 */
function getQuotaMessage(payload) {
  // "Note" is the classic rate-limit field; "Information" now covers both the
  // daily cap and premium-only parameters.
  const candidates = [payload.Note, payload.Information]

  for (const message of candidates) {
    if (typeof message === 'string' && message.trim() !== '') {
      return message
    }
  }

  return null
}

/**
 * Fetch daily closing prices for a single ticker from Alpha Vantage.
 *
 * @param {string} ticker - Symbol, already validated and uppercased.
 * @param {string} apiKey - Alpha Vantage API key.
 * @param {object} [options]
 * @param {'compact'|'full'} [options.outputsize='compact']
 * @param {number} [options.timeout=5000] - Per-attempt timeout in ms.
 * @param {typeof fetch} [options.fetchImpl] - Injectable for tests.
 * @returns {Promise<{date: string, close: number}[]>} Chronological prices.
 * @throws {TickerNotFoundError|ProviderUnavailableError|MarketDataError}
 */
async function fetchHistoricalPrices(ticker, apiKey, options = {}) {
  const {
    outputsize = 'compact',
    timeout = DEFAULT_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options

  if (!apiKey) {
    throw new ProviderUnavailableError(PROVIDER, 'Alpha Vantage API key is not configured')
  }

  const url =
    `${BASE_URL}?function=TIME_SERIES_DAILY` +
    `&symbol=${encodeURIComponent(ticker)}` +
    `&outputsize=${outputsize}` +
    `&apikey=${encodeURIComponent(apiKey)}`

  let response

  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(timeout) })
  } catch (error) {
    throw new MarketDataError(
      `Alpha Vantage request for ${ticker} failed: ${error.message}`
    )
  }

  if (!response.ok) {
    throw new MarketDataError(
      `Alpha Vantage returned HTTP ${response.status} for ${ticker}`
    )
  }

  let payload

  try {
    payload = await response.json()
  } catch {
    throw new MarketDataError(`Alpha Vantage returned invalid JSON for ${ticker}`)
  }

  if (payload['Error Message']) {
    throw new TickerNotFoundError(ticker)
  }

  const quotaMessage = getQuotaMessage(payload)

  if (quotaMessage) {
    throw new ProviderUnavailableError(PROVIDER, quotaMessage)
  }

  const timeSeries = payload['Time Series (Daily)']

  if (!timeSeries || Object.keys(timeSeries).length === 0) {
    // An empty series with no error field usually means an unknown symbol.
    throw new TickerNotFoundError(ticker)
  }

  return Object.entries(timeSeries)
    .map(([date, values]) => ({
      date,
      close: parseFloat(values['4. close']),
    }))
    .filter((point) => Number.isFinite(point.close))
    .sort((a, b) => a.date.localeCompare(b.date))
}

module.exports = {
  PROVIDER,
  fetchHistoricalPrices,
}
