/**
 * Unit tests for the financial calculation utilities.
 *
 * Where a test corresponds to a "Done when" acceptance criterion from the
 * project PRD, it is labelled with the milestone so the mapping is obvious.
 */

const {
  calculateTotalReturn,
  calculateDailyReturns,
  calculateAnnualizedReturn,
  calculateMaxDrawdown,
  calculateSharpeRatio,
  calculateVolatility,
  normalizeToBase100,
  calculatePortfolioReturns,
  calculateMetrics,
} = require('./calculations')

describe('calculateTotalReturn', () => {
  // PRD Week 2: "returns 50.0 when passed [100, 120, 150] as input"
  test('returns 50.0 for a positive return series', () => {
    expect(calculateTotalReturn([100, 120, 150])).toBe(50.0)
  })

  test('returns a negative percentage for a losing series', () => {
    expect(calculateTotalReturn([200, 150, 100])).toBe(-50.0)
  })

  test('returns 0 when the price is unchanged', () => {
    expect(calculateTotalReturn([100, 130, 100])).toBe(0)
  })

  test('returns 0 for insufficient data', () => {
    expect(calculateTotalReturn([100])).toBe(0)
    expect(calculateTotalReturn([])).toBe(0)
    expect(calculateTotalReturn(null)).toBe(0)
  })

  test('returns 0 rather than Infinity when the first price is zero', () => {
    expect(calculateTotalReturn([0, 100])).toBe(0)
  })
})

describe('calculateDailyReturns', () => {
  test('produces one fewer element than the input', () => {
    expect(calculateDailyReturns([100, 110, 99])).toHaveLength(2)
  })

  test('computes fractional day-over-day change', () => {
    const returns = calculateDailyReturns([100, 110, 99])
    expect(returns[0]).toBeCloseTo(0.1, 10)
    expect(returns[1]).toBeCloseTo(-0.1, 10)
  })

  test('returns an empty array for insufficient data', () => {
    expect(calculateDailyReturns([100])).toEqual([])
  })
})

describe('calculateAnnualizedReturn', () => {
  // PRD Week 3 states this case should yield 15.87%, but that figure is
  // mathematically incorrect. ((15000/10000)^(1/3)) - 1 = 14.47%, which is what
  // Excel's =RATE(3,0,-10000,15000) returns. The Review Criteria require the
  // "correct CAGR formula", so the formula wins over the worked example.
  test('returns 14.47% for $10,000 growing to $15,000 over 3 years', () => {
    const result = calculateAnnualizedReturn(
      [10000, 15000],
      '2021-01-01',
      '2024-01-01'
    )
    expect(result).toBeCloseTo(14.47, 1)
  })

  test('roughly doubles to ~100% annualized over a single year', () => {
    const result = calculateAnnualizedReturn([100, 200], '2022-01-01', '2023-01-01')
    expect(result).toBeCloseTo(100, 0)
  })

  test('returns a negative rate for a declining portfolio', () => {
    const result = calculateAnnualizedReturn([10000, 5000], '2021-01-01', '2024-01-01')
    expect(result).toBeLessThan(0)
  })

  test('returns 0 when the period is not positive', () => {
    expect(calculateAnnualizedReturn([100, 200], '2024-01-01', '2024-01-01')).toBe(0)
  })

  test('returns 0 for invalid dates or insufficient data', () => {
    expect(calculateAnnualizedReturn([100, 200], 'nonsense', '2024-01-01')).toBe(0)
    expect(calculateAnnualizedReturn([100], '2021-01-01', '2024-01-01')).toBe(0)
  })
})

describe('calculateMaxDrawdown', () => {
  // PRD Week 3: "returns -30.0 when passed [100, 120, 84, 90, 110]"
  // (peak 120 to trough 84 is -30%)
  test('returns -30.0 for the PRD example series', () => {
    expect(calculateMaxDrawdown([100, 120, 84, 90, 110])).toBe(-30.0)
  })

  test('returns 0 for a monotonically rising series', () => {
    expect(calculateMaxDrawdown([100, 110, 120, 130])).toBe(0)
  })

  test('measures from the highest prior peak, not the starting value', () => {
    // Peak of 200 falling to 100 is -50%, worse than the initial 100 -> 90.
    expect(calculateMaxDrawdown([100, 90, 200, 100])).toBe(-50.0)
  })

  test('returns 0 for insufficient data', () => {
    expect(calculateMaxDrawdown([100])).toBe(0)
  })
})

describe('calculateSharpeRatio', () => {
  // PRD Week 3: "returns a ratio between 0.5 and 3.0 for sample SPY daily
  // returns". Modelled here with a realistic drift and volatility rather than
  // live data, so the test stays deterministic and offline.
  test('lands between 0.5 and 3.0 for a realistic SPY-like return series', () => {
    // ~10% annual drift with ~16% annual volatility, deterministic.
    const dailyReturns = []
    for (let i = 0; i < 252 * 4; i++) {
      const drift = 0.10 / 252
      const wobble = Math.sin(i * 1.7) * (0.16 / Math.sqrt(252))
      dailyReturns.push(drift + wobble)
    }

    const sharpe = calculateSharpeRatio(dailyReturns, 0.02)
    expect(sharpe).toBeGreaterThan(0.5)
    expect(sharpe).toBeLessThan(3.0)
  })

  test('defaults to a 2% risk-free rate as required by the Review Criteria', () => {
    const dailyReturns = [0.01, -0.005, 0.008, 0.002, -0.003]
    expect(calculateSharpeRatio(dailyReturns)).toBe(
      calculateSharpeRatio(dailyReturns, 0.02)
    )
  })

  test('a higher risk-free rate lowers the ratio', () => {
    const dailyReturns = [0.01, -0.005, 0.008, 0.002, -0.003]
    expect(calculateSharpeRatio(dailyReturns, 0.05)).toBeLessThan(
      calculateSharpeRatio(dailyReturns, 0.02)
    )
  })

  test('returns 0 when there is no volatility', () => {
    expect(calculateSharpeRatio([0.01, 0.01, 0.01])).toBe(0)
  })

  test('returns 0 for insufficient data', () => {
    expect(calculateSharpeRatio([0.01])).toBe(0)
  })
})

describe('calculateVolatility', () => {
  test('returns 0 for a constant return series', () => {
    expect(calculateVolatility([0.01, 0.01, 0.01])).toBe(0)
  })

  test('is larger for a more erratic series', () => {
    const calm = calculateVolatility([0.001, -0.001, 0.001, -0.001])
    const wild = calculateVolatility([0.05, -0.05, 0.05, -0.05])
    expect(wild).toBeGreaterThan(calm)
  })
})

describe('normalizeToBase100', () => {
  test('rebases the series to start at 100', () => {
    const result = normalizeToBase100([
      { date: '2021-01-01', value: 50 },
      { date: '2021-01-02', value: 75 },
    ])
    expect(result[0]).toEqual({ date: '2021-01-01', value: 100 })
    expect(result[1].value).toBeCloseTo(150, 4)
  })

  test('preserves the relative shape of the series', () => {
    const result = normalizeToBase100([
      { date: 'a', value: 200 },
      { date: 'b', value: 100 },
      { date: 'c', value: 400 },
    ])
    expect(result.map((p) => p.value)).toEqual([100, 50, 200])
  })

  test('returns an empty array for empty input', () => {
    expect(normalizeToBase100([])).toEqual([])
  })
})

describe('calculatePortfolioReturns', () => {
  const tickerPrices = {
    AAPL: [
      { date: '2021-01-04', close: 100 },
      { date: '2021-01-05', close: 110 },
      { date: '2021-01-06', close: 120 },
    ],
    MSFT: [
      { date: '2021-01-04', close: 200 },
      { date: '2021-01-05', close: 200 },
      { date: '2021-01-06', close: 240 },
    ],
  }

  test('starts at 100', () => {
    const series = calculatePortfolioReturns(tickerPrices)
    expect(series[0].value).toBe(100)
  })

  test('equal-weights a 50/50 portfolio', () => {
    const series = calculatePortfolioReturns(tickerPrices)
    // AAPL +10%, MSFT flat => 50/50 portfolio is +5%.
    expect(series[1].value).toBeCloseTo(105, 4)
    // AAPL +20%, MSFT +20% => portfolio +20%.
    expect(series[2].value).toBeCloseTo(120, 4)
  })

  test('honours explicit weights when provided', () => {
    const series = calculatePortfolioReturns(tickerPrices, undefined, undefined, {
      AAPL: 100,
      MSFT: 0,
    })
    // All-in on AAPL, which gained 10% on day two.
    expect(series[1].value).toBeCloseTo(110, 4)
  })

  test('uses only dates common to every ticker', () => {
    const series = calculatePortfolioReturns({
      AAPL: tickerPrices.AAPL,
      MSFT: [{ date: '2021-01-04', close: 200 }, { date: '2021-01-05', close: 200 }],
    })
    expect(series).toHaveLength(2)
  })

  test('respects the requested date range', () => {
    const series = calculatePortfolioReturns(tickerPrices, '2021-01-05', '2021-01-06')
    expect(series).toHaveLength(2)
    expect(series[0].date).toBe('2021-01-05')
  })

  test('returns an empty array when there is no overlap', () => {
    expect(
      calculatePortfolioReturns({
        AAPL: [{ date: '2021-01-04', close: 100 }],
        MSFT: [{ date: '2022-06-01', close: 200 }],
      })
    ).toEqual([])
  })
})

describe('calculateMetrics', () => {
  const series = [
    { date: '2021-01-01', value: 100 },
    { date: '2021-06-01', value: 120 },
    { date: '2021-09-01', value: 84 },
    { date: '2022-01-01', value: 150 },
  ]

  test('returns every required metric', () => {
    const metrics = calculateMetrics(series)
    expect(metrics).toHaveProperty('totalReturn')
    expect(metrics).toHaveProperty('annualizedReturn')
    expect(metrics).toHaveProperty('volatility')
    expect(metrics).toHaveProperty('sharpeRatio')
    expect(metrics).toHaveProperty('maxDrawdown')
  })

  test('total return matches the standalone calculation', () => {
    expect(calculateMetrics(series).totalReturn).toBe(50.0)
  })

  test('max drawdown matches the standalone calculation', () => {
    expect(calculateMetrics(series).maxDrawdown).toBe(-30.0)
  })

  test('returns zeroed metrics for insufficient data', () => {
    expect(calculateMetrics([{ date: '2021-01-01', value: 100 }])).toEqual({
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
    })
  })
})
