/**
 * Typed errors for the market data layer.
 *
 * Each error carries the HTTP status the API should respond with, so route
 * handlers can translate a thrown error into a response without inspecting
 * message strings.
 */

/** Base class so callers can catch every application error in one branch. */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    Error.captureStackTrace?.(this, this.constructor)
  }
}

/** The symbol does not exist at the provider. Not retryable. */
class TickerNotFoundError extends AppError {
  constructor(ticker) {
    super(`Ticker ${ticker} not found`, 400)
    this.ticker = ticker
  }
}

/** A request was rejected because it failed validation before any I/O. */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400)
  }
}

/**
 * The provider refused to serve the request for quota reasons — either the
 * daily call limit or a paywalled parameter. Retrying the same provider will
 * not help, so this is the signal to fall back to another one.
 */
class ProviderUnavailableError extends AppError {
  constructor(provider, message) {
    super(message, 429)
    this.provider = provider
  }
}

/** Network failure, timeout, or an unparseable response. Retryable. */
class MarketDataError extends AppError {
  constructor(message) {
    super(message, 502)
  }
}

module.exports = {
  AppError,
  TickerNotFoundError,
  ValidationError,
  ProviderUnavailableError,
  MarketDataError,
}
