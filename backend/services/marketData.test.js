/**
 * Tests for provider selection, fallback and caching.
 *
 * Providers are injected rather than mocked at the module level, and no test
 * touches the network, so the suite is deterministic and spends no API quota.
 */

const {
  fetchTicker,
  fetchMultipleTickers,
  clearCache,
  filterToRange,
  coversRequestedRange,
} = require('./marketData')
const {
  TickerNotFoundError,
  ProviderUnavailableError,
  MarketDataError,
} = require('../utils/errors')

/** Build a contiguous daily series for testing. */
function series(startDate, days, startPrice = 100) {
  const out = []
  const start = new Date(`${startDate}T00:00:00Z`)

  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000)
    out.push({ date: d.toISOString().slice(0, 10), close: startPrice + i })
  }

  return out
}

const RANGE = { startDate: '2021-01-01', endDate: '2021-01-10' }

function makeProviders({ av, yahoo }) {
  return {
    alphaVantage: {
      fetchHistoricalPrices: av || jest.fn(),
      PROVIDER: 'alphavantage',
    },
    yahooFinance: {
      fetchHistoricalPrices: yahoo || jest.fn(),
      PROVIDER: 'yahoo',
    },
  }
}

beforeEach(() => {
  clearCache()
})

describe('filterToRange', () => {
  test('keeps only points inside the inclusive range', () => {
    const result = filterToRange(series('2021-01-01', 20), '2021-01-05', '2021-01-08')
    expect(result).toHaveLength(4)
    expect(result[0].date).toBe('2021-01-05')
    expect(result[3].date).toBe('2021-01-08')
  })
})

describe('coversRequestedRange', () => {
  test('accepts a series starting at the requested date', () => {
    expect(coversRequestedRange(series('2021-01-01', 5), '2021-01-01')).toBe(true)
  })

  test('accepts a few days of slack for holidays', () => {
    expect(coversRequestedRange(series('2021-01-04', 5), '2021-01-01')).toBe(true)
  })

  test('rejects a series that starts far too late', () => {
    expect(coversRequestedRange(series('2026-03-31', 100), '2021-01-01')).toBe(false)
  })

  test('rejects an empty series', () => {
    expect(coversRequestedRange([], '2021-01-01')).toBe(false)
  })
})

describe('fetchTicker provider selection', () => {
  test('uses Alpha Vantage when it covers the requested range', async () => {
    const providers = makeProviders({
      av: jest.fn().mockResolvedValue(series('2021-01-01', 10)),
    })

    const result = await fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })

    expect(result.provider).toBe('alphavantage')
    expect(providers.yahooFinance.fetchHistoricalPrices).not.toHaveBeenCalled()
  })

  test('falls back to Yahoo when Alpha Vantage returns too little history', async () => {
    // This is the real-world case: the free tier only returns recent data.
    const providers = makeProviders({
      av: jest.fn().mockResolvedValue(series('2026-03-31', 100)),
      yahoo: jest.fn().mockResolvedValue(series('2021-01-01', 10)),
    })

    const result = await fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })

    expect(result.provider).toBe('yahoo')
    expect(result.prices).toHaveLength(10)
  })

  test('falls back to Yahoo when Alpha Vantage reports a quota problem', async () => {
    const providers = makeProviders({
      av: jest
        .fn()
        .mockRejectedValue(new ProviderUnavailableError('alphavantage', 'rate limit')),
      yahoo: jest.fn().mockResolvedValue(series('2021-01-01', 10)),
    })

    const result = await fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })
    expect(result.provider).toBe('yahoo')
  })

  test('skips Alpha Vantage entirely when no API key is configured', async () => {
    const providers = makeProviders({
      yahoo: jest.fn().mockResolvedValue(series('2021-01-01', 10)),
    })

    const result = await fetchTicker('AAPL', {
      ...RANGE,
      apiKey: undefined,
      providers,
    })

    expect(result.provider).toBe('yahoo')
    expect(providers.alphaVantage.fetchHistoricalPrices).not.toHaveBeenCalled()
  })
})

describe('fetchTicker error handling', () => {
  test('reports an unknown ticker when Yahoo also cannot find it', async () => {
    const providers = makeProviders({
      av: jest.fn().mockRejectedValue(new TickerNotFoundError('INVALID')),
      yahoo: jest.fn().mockRejectedValue(new TickerNotFoundError('INVALID')),
    })

    await expect(
      fetchTicker('INVALID', { ...RANGE, apiKey: 'k', providers })
    ).rejects.toThrow(TickerNotFoundError)
  })

  test('an unknown-ticker error carries a 400 status', async () => {
    const providers = makeProviders({
      yahoo: jest.fn().mockRejectedValue(new TickerNotFoundError('INVALID')),
    })

    try {
      await fetchTicker('INVALID', { ...RANGE, providers })
    } catch (error) {
      expect(error.statusCode).toBe(400)
      expect(error.message).toMatch(/not found/i)
    }
  })

  test('does not report "not found" when only the network failed', async () => {
    const providers = makeProviders({
      av: jest.fn().mockRejectedValue(new MarketDataError('timeout')),
      yahoo: jest.fn().mockRejectedValue(new MarketDataError('socket hang up')),
    })

    await expect(
      fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })
    ).rejects.toThrow(MarketDataError)
  })

  test('surfaces a quota error when every provider is rate limited', async () => {
    const providers = makeProviders({
      av: jest
        .fn()
        .mockRejectedValue(new ProviderUnavailableError('alphavantage', 'rate limit hit')),
      yahoo: jest.fn().mockRejectedValue(new MarketDataError('network down')),
    })

    await expect(
      fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })
    ).rejects.toThrow(ProviderUnavailableError)
  })
})

describe('caching', () => {
  test('a second identical request costs no provider call', async () => {
    const av = jest.fn().mockResolvedValue(series('2021-01-01', 10))
    const providers = makeProviders({ av })

    await fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })
    const second = await fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })

    expect(av).toHaveBeenCalledTimes(1)
    expect(second.provider).toMatch(/cached/)
    expect(second.prices).toHaveLength(10)
  })

  test('a different date range is fetched fresh', async () => {
    const av = jest.fn().mockResolvedValue(series('2021-01-01', 40))
    const providers = makeProviders({ av })

    await fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })
    await fetchTicker('AAPL', {
      startDate: '2021-01-01',
      endDate: '2021-01-20',
      apiKey: 'k',
      providers,
    })

    expect(av).toHaveBeenCalledTimes(2)
  })

  test('clearCache forces a refetch', async () => {
    const av = jest.fn().mockResolvedValue(series('2021-01-01', 10))
    const providers = makeProviders({ av })

    await fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })
    clearCache()
    await fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })

    expect(av).toHaveBeenCalledTimes(2)
  })
})

describe('fetchMultipleTickers', () => {
  test('returns a map keyed by ticker', async () => {
    const providers = makeProviders({
      yahoo: jest.fn().mockResolvedValue(series('2021-01-01', 10)),
    })

    const result = await fetchMultipleTickers(['AAPL', 'MSFT', 'TSLA'], {
      ...RANGE,
      providers,
    })

    expect(Object.keys(result).sort()).toEqual(['AAPL', 'MSFT', 'TSLA'])
    expect(result.AAPL).toHaveLength(10)
  })

  test('fetches in parallel rather than serially', async () => {
    // Each call takes 50ms. Three in parallel should finish well under the
    // 150ms a serial loop would need.
    const slow = jest.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(series('2021-01-01', 10)), 50)
        )
    )

    const providers = makeProviders({ yahoo: slow })
    const started = Date.now()

    await fetchMultipleTickers(['AAPL', 'MSFT', 'TSLA'], { ...RANGE, providers })

    expect(Date.now() - started).toBeLessThan(140)
    expect(slow).toHaveBeenCalledTimes(3)
  })

  test('rejects if any single ticker is invalid', async () => {
    const providers = makeProviders({
      yahoo: jest.fn((ticker) =>
        ticker === 'BAD'
          ? Promise.reject(new TickerNotFoundError('BAD'))
          : Promise.resolve(series('2021-01-01', 10))
      ),
    })

    await expect(
      fetchMultipleTickers(['AAPL', 'BAD'], { ...RANGE, providers })
    ).rejects.toThrow(/BAD not found/)
  })
})

describe('fallback reasons', () => {
  test('are empty when Alpha Vantage serves the request', async () => {
    const providers = makeProviders({
      av: jest.fn().mockResolvedValue(series('2021-01-01', 10)),
    })

    const result = await fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })
    expect(result.fallbackReasons).toEqual([])
  })

  test('explain why Yahoo was used instead', async () => {
    const providers = makeProviders({
      av: jest.fn().mockResolvedValue(series('2026-03-31', 100)),
      yahoo: jest.fn().mockResolvedValue(series('2021-01-01', 10)),
    })

    const result = await fetchTicker('AAPL', { ...RANGE, apiKey: 'k', providers })
    expect(result.fallbackReasons.join(' ')).toMatch(/100 trading days/)
  })

  test('record a missing API key', async () => {
    const providers = makeProviders({
      yahoo: jest.fn().mockResolvedValue(series('2021-01-01', 10)),
    })

    const result = await fetchTicker('AAPL', { ...RANGE, apiKey: undefined, providers })
    expect(result.fallbackReasons.join(' ')).toMatch(/no API key/)
  })
})
