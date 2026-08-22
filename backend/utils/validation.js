/**
 * Request validation for the backtest endpoint.
 *
 * Everything here runs before any network I/O so that bad input costs nothing
 * and produces a clear 400 rather than a confusing provider error.
 */

const { ValidationError } = require('./errors')

// US exchange symbols are one to five capital letters, per the PRD.
const TICKER_PATTERN = /^[A-Z]{1,5}$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const MIN_TICKERS = 1
const MAX_TICKERS = 10

/**
 * Format a Date as YYYY-MM-DD using UTC fields.
 *
 * Using UTC rather than toISOString() on a local-midnight Date avoids the
 * off-by-one that shifts dates back a day for anyone west of UTC.
 *
 * @param {Date|string} date
 * @returns {string} YYYY-MM-DD
 */
function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(d.getTime())) {
    return ''
  }

  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Validate and normalize a single ticker symbol.
 *
 * @param {string} ticker
 * @returns {string} The uppercased, trimmed symbol.
 * @throws {ValidationError} When the symbol is empty or malformed.
 */
function validateTicker(ticker) {
  if (typeof ticker !== 'string' || ticker.trim() === '') {
    throw new ValidationError('Ticker symbols cannot be empty')
  }

  const normalized = ticker.trim().toUpperCase()

  if (!TICKER_PATTERN.test(normalized)) {
    throw new ValidationError(
      `"${ticker}" is not a valid ticker. Use 1-5 letters, e.g. AAPL.`
    )
  }

  return normalized
}

/**
 * Validate a list of tickers, rejecting duplicates and enforcing the 1-10 range.
 *
 * @param {string[]} tickers
 * @returns {string[]} Normalized, de-duplicated symbols.
 * @throws {ValidationError}
 */
function validateTickers(tickers) {
  if (!Array.isArray(tickers) || tickers.length < MIN_TICKERS) {
    throw new ValidationError('Provide at least one ticker symbol')
  }

  if (tickers.length > MAX_TICKERS) {
    throw new ValidationError(`Provide at most ${MAX_TICKERS} ticker symbols`)
  }

  const normalized = tickers.map(validateTicker)
  const unique = [...new Set(normalized)]

  if (unique.length !== normalized.length) {
    throw new ValidationError('Duplicate ticker symbols are not allowed')
  }

  return unique
}

/**
 * Validate a start/end date pair.
 *
 * Weekends are deliberately allowed: a user picking a Saturday is not making an
 * error, there simply is no trading data that day, and the engine already
 * intersects on dates where every symbol actually traded.
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {{startDate: string, endDate: string}}
 * @throws {ValidationError}
 */
function validateDateRange(startDate, endDate) {
  if (!ISO_DATE_PATTERN.test(startDate) || !ISO_DATE_PATTERN.test(endDate)) {
    throw new ValidationError('Dates must be in YYYY-MM-DD format')
  }

  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ValidationError('Dates must be valid calendar dates')
  }

  if (start >= end) {
    throw new ValidationError('Start date must be before end date')
  }

  // Allow today, but not a range that begins in the future.
  const today = new Date(`${toISODate(new Date())}T00:00:00Z`)

  if (start > today) {
    throw new ValidationError('Start date cannot be in the future')
  }

  return { startDate, endDate }
}

/**
 * Validate an entire backtest request body.
 *
 * @param {{tickers: string[], startDate: string, endDate: string,
 *          benchmark?: string, initialInvestment?: number}} body
 * @returns {{tickers: string[], startDate: string, endDate: string,
 *            benchmark: string, initialInvestment: number}}
 * @throws {ValidationError}
 */
function validateBacktestRequest(body) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object')
  }

  const tickers = validateTickers(body.tickers)
  const { startDate, endDate } = validateDateRange(body.startDate, body.endDate)
  const benchmark = validateTicker(body.benchmark || 'SPY')

  let initialInvestment = 10000

  if (body.initialInvestment !== undefined) {
    initialInvestment = Number(body.initialInvestment)

    if (!Number.isFinite(initialInvestment) || initialInvestment <= 0) {
      throw new ValidationError('Initial investment must be a positive number')
    }
  }

  return { tickers, startDate, endDate, benchmark, initialInvestment }
}

module.exports = {
  TICKER_PATTERN,
  MIN_TICKERS,
  MAX_TICKERS,
  toISODate,
  validateTicker,
  validateTickers,
  validateDateRange,
  validateBacktestRequest,
}
