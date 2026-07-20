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
  return Math.round(percentChange * 100) / 100
}

module.exports = { calculateTotalReturn }
