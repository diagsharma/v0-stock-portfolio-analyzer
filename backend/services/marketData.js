/**
 * Market data orchestration.
 *
 * Sits in front of the individual providers and owns three concerns:
 *   1. Provider selection and fallback (Alpha Vantage first, then Yahoo).
 *   2. A session cache, so repeated backtests over overlapping ranges do not
 *      spend API quota.
 *   3. Batch fetching with Promise.all.
 *
 * Callers only ever see the normalized {date, close} shape.
 */

const alphaVantage = require('./alphaVantage')
const yahooFinance = require('./yahooFinance')
const {
  TickerNotFoundError,
  ProviderUnavailableError,
  MarketDataError,
} = require('../utils/errors')

// Cached price series live for an hour. Daily bars only change after the close,
// so this is generous without risking a stale chart within one session.
const CACHE_TTL_MS = 60 * 60 * 1000

const cache = new Map()

/**
 * @param {string} ticker
 * @param {string} startDate
 * @param {string} endDate
 * @returns {string}
 */
function cacheKey(ticker, startDate, endDate) {
  return `${ticker}:${startDate}:${endDate}`
}

/** Empty the session cache. Exposed for tests and for a manual refresh. */
function clearCache() {
  cache.clear()
}

/**
 * Restrict a price series to an inclusive date range.
 *
 * @param {{date: string, close: number}[]} prices
 * @param {string} startDate
 * @param {string} endDate
 * @returns {{date: string, close: number}[]}
 */
function filterToRange(prices, startDate, endDate) {
  return prices.filter((point) => point.date >= startDate && point.date <= endDate)
}

/**
 * Decide whether an Alpha Vantage response actually covers the requested range.
 *
 * The free tier returns only the most recent 100 trading days, so a request for
 * 2021-2023 comes back technically successful but starting in the wrong year.
 * Treating that as unusable is what triggers the Yahoo fallback.
 *
 * @param {{date: string}[]} prices
 * @param {string} startDate
 * @returns {boolean}
 */
function coversRequestedRange(prices, startDate) {
  if (prices.length === 0) {
    return false
  }

  // Allow a week of slack so a range starting on a market holiday still counts.
  const earliest = new Date(`${prices[0].date}T00:00:00Z`)
  const requested = new Date(`${startDate}T00:00:00Z`)
  const slackMs = 7 * 24 * 60 * 60 * 1000

  return earliest.getTime() - requested.getTime() <= slackMs
}

/**
 * Fetch one ticker's price history, trying Alpha Vantage and falling back to
 * Yahoo Finance.
 *
 * A TickerNotFoundError from the first provider is confirmed against the second
 * before being surfaced, so a provider-specific gap never gets reported to the
 * user as a non-existent symbol.
 *
 * @param {string} ticker - Validated, uppercased symbol.
 * @param {object} options
 * @param {string} options.startDate - YYYY-MM-DD
 * @param {string} options.endDate - YYYY-MM-DD
 * @param {string} [options.apiKey] - Alpha Vantage key.
 * @param {boolean} [options.useCache=true]
 * @param {object} [options.providers] - Injectable providers for tests.
 * @returns {Promise<{ticker: string, provider: string,
 *                    prices: {date: string, close: number}[]}>}
 */
async function fetchTicker(ticker, options = {}) {
  const {
    startDate,
    endDate,
    apiKey = process.env.ALPHA_VANTAGE_API_KEY,
    useCache = true,
    providers = { alphaVantage, yahooFinance },
  } = options

  const key = cacheKey(ticker, startDate, endDate)

  if (useCache) {
    const hit = cache.get(key)

    if (hit && Date.now() - hit.storedAt < CACHE_TTL_MS) {
      return { ...hit.value, provider: `${hit.value.provider} (cached)` }
    }
  }

  const failures = []
  let notFoundCount = 0

  // Alpha Vantage first: it is the provider the project brief names, and when
  // the requested window is recent enough its free tier does serve it.
  if (apiKey) {
    try {
      const raw = await providers.alphaVantage.fetchHistoricalPrices(ticker, apiKey)
      const prices = filterToRange(raw, startDate, endDate)

      if (coversRequestedRange(prices, startDate)) {
        const value = {
          ticker,
          provider: alphaVantage.PROVIDER,
          prices,
          fallbackReasons: [],
        }
        cache.set(key, { value, storedAt: Date.now() })
        return value
      }

      failures.push(
        'alphavantage: free tier returned only the most recent 100 trading days'
      )
    } catch (error) {
      if (error instanceof TickerNotFoundError) {
        notFoundCount++
      }
      failures.push(`alphavantage: ${error.message}`)
    }
  } else {
    failures.push('alphavantage: no API key configured')
  }

  try {
    const prices = await providers.yahooFinance.fetchHistoricalPrices(ticker, {
      startDate,
      endDate,
    })

    // Carry the reasons Alpha Vantage was skipped so a caller can log why the
    // fallback engaged instead of having to guess.
    const value = {
      ticker,
      provider: yahooFinance.PROVIDER,
      prices,
      fallbackReasons: failures,
    }
    cache.set(key, { value, storedAt: Date.now() })
    return value
  } catch (error) {
    if (error instanceof TickerNotFoundError) {
      notFoundCount++
      // Both providers agree the symbol does not exist, or Alpha Vantage was
      // never consulted. Either way this is a user error, not an outage.
      throw error
    }

    failures.push(`yahoo: ${error.message}`)
  }

  // Every provider failed for infrastructure reasons rather than a bad symbol.
  const detail = failures.join('; ')

  if (failures.some((f) => f.includes('rate limit') || f.includes('premium'))) {
    throw new ProviderUnavailableError(
      'all',
      `Market data temporarily unavailable for ${ticker}. ${detail}`
    )
  }

  throw new MarketDataError(`Could not load price data for ${ticker}. ${detail}`)
}

/**
 * Fetch several tickers in parallel.
 *
 * Uses Promise.all so total latency tracks the slowest single request rather
 * than the sum of all of them.
 *
 * @param {string[]} tickers - Validated, uppercased symbols.
 * @param {object} options - Same options as fetchTicker.
 * @returns {Promise<Record<string, {date: string, close: number}[]>>}
 *          Map of ticker to its price history.
 */
async function fetchMultipleTickers(tickers, options = {}) {
  const results = await Promise.all(
    tickers.map((ticker) => fetchTicker(ticker, options))
  )

  const byTicker = {}

  for (const result of results) {
    byTicker[result.ticker] = result.prices
  }

  return byTicker
}

module.exports = {
  fetchTicker,
  fetchMultipleTickers,
  clearCache,
  filterToRange,
  coversRequestedRange,
  CACHE_TTL_MS,
}
