/**
 * Retry behaviour for the Yahoo provider. Every test injects a fake fetch, so
 * nothing touches the network.
 */

const { fetchHistoricalPrices } = require('./yahooFinance')
const { TickerNotFoundError, MarketDataError } = require('../utils/errors')

const RANGE = { startDate: '2021-01-01', endDate: '2021-01-10', retries: 2 }

function okResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      chart: {
        result: [
          {
            timestamp: [1609776000, 1609862400],
            indicators: { adjclose: [{ adjclose: [100, 110] }], quote: [{ close: [100, 110] }] },
          },
        ],
      },
    }),
  }
}

function statusResponse(status) {
  return { ok: false, status, json: async () => ({}) }
}

describe('yahoo retry behaviour', () => {
  test('recovers from a throttling 400 on a later attempt', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(statusResponse(400))
      .mockResolvedValueOnce(okResponse())

    const prices = await fetchHistoricalPrices('JEPQ', { ...RANGE, fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(prices).toHaveLength(2)
  })

  test('retries 429 and 503 as well', async () => {
    for (const status of [429, 503]) {
      const fetchImpl = jest
        .fn()
        .mockResolvedValueOnce(statusResponse(status))
        .mockResolvedValueOnce(okResponse())

      await expect(
        fetchHistoricalPrices('AAPL', { ...RANGE, fetchImpl })
      ).resolves.toHaveLength(2)
      expect(fetchImpl).toHaveBeenCalledTimes(2)
    }
  })

  test('gives up after exhausting the retries', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(statusResponse(400))

    await expect(
      fetchHistoricalPrices('GPIQ', { ...RANGE, fetchImpl })
    ).rejects.toThrow(MarketDataError)

    // Initial attempt plus two retries.
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  test('does not retry an unknown symbol', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(statusResponse(404))

    await expect(
      fetchHistoricalPrices('NOSUCH', { ...RANGE, fetchImpl })
    ).rejects.toThrow(TickerNotFoundError)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('retries a network failure', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce(okResponse())

    await expect(
      fetchHistoricalPrices('AAPL', { ...RANGE, fetchImpl })
    ).resolves.toHaveLength(2)
  })

  test('prefers adjusted close over raw close', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        chart: {
          result: [
            {
              timestamp: [1609776000],
              indicators: {
                adjclose: [{ adjclose: [95] }],
                quote: [{ close: [100] }],
              },
            },
          ],
        },
      }),
    })

    const prices = await fetchHistoricalPrices('AAPL', { ...RANGE, fetchImpl })
    expect(prices[0].close).toBe(95)
  })
})
