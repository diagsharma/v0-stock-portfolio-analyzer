/**
 * Financial calculation utilities.
 *
 * These are plain CommonJS exports with no I/O and no framework dependencies,
 * so they can be imported by both the Express server (server/index.js) and the
 * Next.js API routes (app/api/*), and unit tested without any network access.
 *
 * Conventions used throughout this file:
 *   - "prices" is an array of numbers ordered oldest to newest.
 *   - Percentages are returned as numbers out of 100 (e.g. 50.0 means +50%).
 *   - Daily returns are returned as fractions (e.g. 0.01 means +1%).
 */

const TRADING_DAYS_PER_YEAR = 252
const DAYS_PER_YEAR = 365.25
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Round to a fixed number of decimal places to avoid floating-point artifacts
 * (e.g. 50.00000000000001) so exact comparisons like 50.0 hold.
 *
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {number}
 */
function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Calculate the total return (percentage change) of a series of closing prices.
 *
 * @param {number[]} prices - Array of closing prices, ordered oldest to newest.
 * @returns {number} Percentage change from the first price to the last price.
 *                   Returns 0 if fewer than two prices are provided.
 *
 * @example
 * calculateTotalReturn([100, 120, 150]) // => 50.0
 */
function calculateTotalReturn(prices) {
  if (!Array.isArray(prices) || prices.length < 2) {
    return 0
  }

  const first = prices[0]
  const last = prices[prices.length - 1]

  if (typeof first !== 'number' || typeof last !== 'number' || first === 0) {
    return 0
  }

  const percentChange = ((last - first) / first) * 100

  // Round to 2 decimal places to avoid floating-point artifacts
  // (e.g. 50.00000000000001) so exact comparisons like 50.0 hold.
  return round(percentChange)
}

/**
 * Convert a price series into the day-over-day fractional returns between
 * consecutive prices. The result is one element shorter than the input.
 *
 * @param {number[]} prices - Array of closing prices, ordered oldest to newest.
 * @returns {number[]} Fractional returns, e.g. 0.02 for a 2% gain.
 *
 * @example
 * calculateDailyReturns([100, 110, 99]) // => [0.1, -0.1]
 */
function calculateDailyReturns(prices) {
  if (!Array.isArray(prices) || prices.length < 2) {
    return []
  }

  const returns = []

  for (let i = 1; i < prices.length; i++) {
    const previous = prices[i - 1]
    const current = prices[i]

    // A zero previous price would divide by zero; treat it as a flat day
    // rather than emitting Infinity and poisoning every downstream metric.
    returns.push(previous === 0 ? 0 : (current - previous) / previous)
  }

  return returns
}

/**
 * Calculate the Compound Annual Growth Rate (CAGR) of a price series.
 *
 * CAGR = ((endingValue / startingValue) ^ (1 / years)) - 1
 *
 * NOTE ON THE PRD: the Week 3 milestone states this function should return
 * 15.87% for $10,000 growing to $15,000 over 3 years. That figure is incorrect
 * -- the correct CAGR is 14.47%, which is what Excel's =RATE(3,0,-10000,15000)
 * returns, and 15.87% would imply a holding period of about 2.75 years. The
 * Review Criteria separately require the "correct CAGR formula", so this
 * implementation follows the formula rather than the worked example. Flagged
 * for the mentor rather than silently coded around.
 *
 * @param {number[]} prices - Array of closing prices, ordered oldest to newest.
 * @param {string|Date} startDate - Start of the holding period.
 * @param {string|Date} endDate - End of the holding period.
 * @returns {number} Annualized return as a percentage. Returns 0 when the
 *                   inputs are insufficient or the period is not positive.
 *
 * @example
 * calculateAnnualizedReturn([10000, 15000], '2021-01-01', '2024-01-01') // => 14.47
 */
function calculateAnnualizedReturn(prices, startDate, endDate) {
  if (!Array.isArray(prices) || prices.length < 2) {
    return 0
  }

  const startValue = prices[0]
  const endValue = prices[prices.length - 1]

  if (typeof startValue !== 'number' || typeof endValue !== 'number') {
    return 0
  }

  // A non-positive start or end value makes the fractional exponent undefined
  // (you cannot take a real root of a negative growth multiple).
  if (startValue <= 0 || endValue <= 0) {
    return 0
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0
  }

  const years = (end.getTime() - start.getTime()) / (DAYS_PER_YEAR * MS_PER_DAY)

  if (years <= 0) {
    return 0
  }

  const cagr = Math.pow(endValue / startValue, 1 / years) - 1

  return round(cagr * 100)
}

/**
 * Calculate the maximum drawdown: the largest peak-to-trough decline in the
 * series, expressed as a negative percentage.
 *
 * Walks the series once, tracking the running maximum, and records the worst
 * decline seen from any previous peak.
 *
 * @param {number[]} prices - Array of closing prices, ordered oldest to newest.
 * @returns {number} Largest peak-to-trough decline as a negative percentage,
 *                   or 0 if the series never declines.
 *
 * @example
 * calculateMaxDrawdown([100, 120, 84, 90, 110]) // => -30.0  (peak 120 to trough 84)
 */
function calculateMaxDrawdown(prices) {
  if (!Array.isArray(prices) || prices.length < 2) {
    return 0
  }

  let peak = prices[0]
  let maxDrawdown = 0

  for (const price of prices) {
    if (typeof price !== 'number') {
      continue
    }

    if (price > peak) {
      peak = price
    }

    if (peak === 0) {
      continue
    }

    // Negative because a drawdown is a loss; a new high yields 0.
    const drawdown = ((price - peak) / peak) * 100

    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  return round(maxDrawdown)
}

/**
 * Calculate the annualized Sharpe ratio: excess return per unit of volatility.
 *
 * Takes the mean daily return, subtracts the daily equivalent of the risk-free
 * rate, divides by the standard deviation of daily returns, then annualizes by
 * multiplying by sqrt(252).
 *
 * The 2% default risk-free rate is specified by the PRD's Review Criteria.
 *
 * @param {number[]} dailyReturns - Fractional daily returns, e.g. 0.01 for +1%.
 * @param {number} [riskFreeRate=0.02] - Annual risk-free rate as a fraction.
 * @returns {number} Annualized Sharpe ratio, or 0 when volatility is zero.
 *
 * @example
 * calculateSharpeRatio([0.01, -0.005, 0.008], 0.02) // => a risk-adjusted ratio
 */
function calculateSharpeRatio(dailyReturns, riskFreeRate = 0.02) {
  if (!Array.isArray(dailyReturns) || dailyReturns.length < 2) {
    return 0
  }

  const n = dailyReturns.length
  const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / n

  // Population standard deviation, matching the convention already used
  // elsewhere in this project.
  const variance =
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) {
    return 0
  }

  const dailyRiskFreeRate = riskFreeRate / TRADING_DAYS_PER_YEAR
  const excessReturn = mean - dailyRiskFreeRate

  const sharpe = (excessReturn / stdDev) * Math.sqrt(TRADING_DAYS_PER_YEAR)

  return round(sharpe)
}

/**
 * Calculate the annualized volatility (standard deviation) of a return series.
 *
 * @param {number[]} dailyReturns - Fractional daily returns.
 * @returns {number} Annualized volatility as a percentage.
 */
function calculateVolatility(dailyReturns) {
  if (!Array.isArray(dailyReturns) || dailyReturns.length < 2) {
    return 0
  }

  const n = dailyReturns.length
  const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / n
  const variance =
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n

  return round(Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100)
}

/**
 * Rebase a value series so that it starts at 100, which lets a portfolio and a
 * benchmark with very different absolute values be compared on one chart.
 *
 * @param {{date: string, value: number}[]} series - Chronological series.
 * @returns {{date: string, value: number}[]} Series rebased to start at 100.
 *
 * @example
 * normalizeToBase100([{date: 'd1', value: 50}, {date: 'd2', value: 75}])
 * // => [{date: 'd1', value: 100}, {date: 'd2', value: 150}]
 */
function normalizeToBase100(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return []
  }

  const base = series[0].value

  if (!base) {
    return series.map((point) => ({ date: point.date, value: 100 }))
  }

  return series.map((point) => ({
    date: point.date,
    value: round((point.value / base) * 100, 4),
  }))
}

/**
 * Build a portfolio value series from per-ticker price histories.
 *
 * Weights default to equal across all tickers, which is the PRD's MVP
 * behaviour. Only dates present for every ticker are used, so that a single
 * ticker with a shorter history cannot silently distort the series. The result
 * is normalized to start at 100.
 *
 * @param {Record<string, {date: string, close: number}[]>} tickerPrices -
 *        Map of ticker to its chronological price history.
 * @param {string} [startDate] - Optional inclusive lower bound (YYYY-MM-DD).
 * @param {string} [endDate] - Optional inclusive upper bound (YYYY-MM-DD).
 * @param {Record<string, number>} [weights] - Optional map of ticker to weight
 *        as a percentage. Defaults to equal weighting.
 * @returns {{date: string, value: number}[]} Chronological portfolio series
 *          starting at 100.
 */
function calculatePortfolioReturns(tickerPrices, startDate, endDate, weights) {
  const tickers = Object.keys(tickerPrices || {})

  if (tickers.length === 0) {
    return []
  }

  // Index each ticker's history by date, applying the date-range filter once.
  const priceByDate = {}

  for (const ticker of tickers) {
    const map = new Map()

    for (const point of tickerPrices[ticker] || []) {
      if (startDate && point.date < startDate) continue
      if (endDate && point.date > endDate) continue
      map.set(point.date, point.close)
    }

    priceByDate[ticker] = map
  }

  // Only dates where every ticker traded can be valued.
  const commonDates = Array.from(priceByDate[tickers[0]].keys())
    .filter((date) => tickers.every((ticker) => priceByDate[ticker].has(date)))
    .sort()

  if (commonDates.length === 0) {
    return []
  }

  const equalWeight = 100 / tickers.length
  const resolvedWeights = {}

  for (const ticker of tickers) {
    const weight = weights && typeof weights[ticker] === 'number'
      ? weights[ticker]
      : equalWeight
    resolvedWeights[ticker] = weight / 100
  }

  const firstDate = commonDates[0]

  // Buy at the first common date and hold: shares are fixed, value floats.
  const shares = {}

  for (const ticker of tickers) {
    const firstPrice = priceByDate[ticker].get(firstDate)
    shares[ticker] = firstPrice ? (resolvedWeights[ticker] * 100) / firstPrice : 0
  }

  const series = commonDates.map((date) => {
    let value = 0

    for (const ticker of tickers) {
      value += shares[ticker] * priceByDate[ticker].get(date)
    }

    return { date, value }
  })

  return normalizeToBase100(series)
}

/**
 * Compute the full metric set for a value series in one pass.
 *
 * @param {{date: string, value: number}[]} series - Chronological value series.
 * @param {number} [riskFreeRate=0.02] - Annual risk-free rate as a fraction.
 * @returns {{totalReturn: number, annualizedReturn: number, volatility: number,
 *            sharpeRatio: number, maxDrawdown: number}}
 */
function calculateMetrics(series, riskFreeRate = 0.02) {
  if (!Array.isArray(series) || series.length < 2) {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
    }
  }

  const values = series.map((point) => point.value)
  const dailyReturns = calculateDailyReturns(values)

  return {
    totalReturn: calculateTotalReturn(values),
    annualizedReturn: calculateAnnualizedReturn(
      values,
      series[0].date,
      series[series.length - 1].date
    ),
    volatility: calculateVolatility(dailyReturns),
    sharpeRatio: calculateSharpeRatio(dailyReturns, riskFreeRate),
    maxDrawdown: calculateMaxDrawdown(values),
  }
}

module.exports = {
  calculateTotalReturn,
  calculateDailyReturns,
  calculateAnnualizedReturn,
  calculateMaxDrawdown,
  calculateSharpeRatio,
  calculateVolatility,
  normalizeToBase100,
  calculatePortfolioReturns,
  calculateMetrics,
  TRADING_DAYS_PER_YEAR,
}
