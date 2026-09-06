/**
 * Parse a portfolio from CSV text.
 *
 * Lives alongside the other pure utilities so it can be unit tested without a
 * browser, and so a server-side import endpoint could reuse it unchanged. It
 * performs no I/O: callers read the file and hand over the text.
 *
 * The accepted shape is deliberately forgiving, because these files come from
 * spreadsheets and brokerage exports rather than from an API:
 *
 *   SPY,60          comma, semicolon or tab delimited
 *   BND,40          an optional header row is detected and skipped
 *                   weights may carry a % sign
 *   VTI             weights may be omitted entirely, and are then split evenly
 *   "AAPL", 25.5    fields may be quoted and padded
 */

const TICKER_PATTERN = /^[A-Z]{1,5}$/

// Kept in step with MAX_TICKERS in validation.js, which the API enforces.
const DEFAULT_MAX_ASSETS = 50

/** Delimiters seen in spreadsheet exports, in preference order on a tie. */
const DELIMITERS = [',', ';', '\t']

/**
 * Guess the delimiter by whichever candidate appears most on the first row.
 *
 * @param {string} line
 * @returns {string}
 */
function detectDelimiter(line) {
  let best = ','
  let bestCount = 0

  for (const candidate of DELIMITERS) {
    const count = line.split(candidate).length - 1

    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }

  return best
}

/** Strip surrounding quotes and whitespace from one field. */
function cleanField(field) {
  return (field ?? '').trim().replace(/^["']|["']$/g, '').trim()
}

/**
 * Decide whether the first row is a header rather than data.
 *
 * A header is anything whose first field is not a usable ticker -- which covers
 * "Ticker", "Symbol", "Fund name" and friends without needing a keyword list.
 *
 * @param {string[]} fields
 * @returns {boolean}
 */
function looksLikeHeader(fields) {
  const symbol = cleanField(fields[0]).toUpperCase()
  return !TICKER_PATTERN.test(symbol)
}

/**
 * Split 100% evenly across n holdings, giving the remainder to the first so the
 * total is exactly 100 rather than 99.99 -- which the form would reject.
 *
 * @param {number} count
 * @returns {number[]}
 */
function equalWeights(count) {
  const each = Math.round((100 / count) * 100) / 100
  const weights = new Array(count).fill(each)
  const remainder = Math.round((100 - each * count) * 100) / 100

  weights[0] = Math.round((weights[0] + remainder) * 100) / 100

  return weights
}

/**
 * Parse CSV text into portfolio assets.
 *
 * Never throws: problems come back as messages for the UI to show. A result
 * with any errors has no assets, so a partially valid file is rejected as a
 * whole rather than silently importing half a portfolio.
 *
 * @param {string} text - Raw file contents.
 * @param {object} [options]
 * @param {number} [options.maxAssets=10] - Must match the form's own limit.
 * @returns {{assets: {id: string, symbol: string, weight: number}[],
 *            errors: string[], notes: string[]}}
 */
function parsePortfolioCsv(text, options = {}) {
  const { maxAssets = DEFAULT_MAX_ASSETS } = options
  const errors = []
  const notes = []

  if (typeof text !== 'string' || text.trim() === '') {
    return { assets: [], errors: ['That file is empty.'], notes }
  }

  // Strip a UTF-8 BOM, which Excel writes and which would otherwise corrupt
  // the very first ticker.
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    // Blank lines and spreadsheet comment rows carry no holdings.
    .filter((line) => line !== '' && !line.startsWith('#'))

  if (lines.length === 0) {
    return { assets: [], errors: ['That file has no rows.'], notes }
  }

  const delimiter = detectDelimiter(lines[0])
  let rows = lines.map((line) => line.split(delimiter))

  if (looksLikeHeader(rows[0])) {
    rows = rows.slice(1)
  }

  if (rows.length === 0) {
    return {
      assets: [],
      errors: ['That file has a header but no holdings.'],
      notes,
    }
  }

  if (rows.length > maxAssets) {
    return {
      assets: [],
      errors: [
        `That file has ${rows.length} holdings; the maximum is ${maxAssets}.`,
      ],
      notes,
    }
  }

  const parsed = []
  const seen = new Set()

  rows.forEach((fields, index) => {
    // Row numbers are for a human looking at the file, so count every line.
    const rowNumber = index + 1
    const symbol = cleanField(fields[0]).toUpperCase()
    const rawWeight = cleanField(fields[1]).replace(/%$/, '')

    if (!TICKER_PATTERN.test(symbol)) {
      errors.push(
        `Row ${rowNumber}: "${cleanField(fields[0])}" is not a valid ticker (1-5 letters).`
      )
      return
    }

    if (seen.has(symbol)) {
      errors.push(`Row ${rowNumber}: ${symbol} appears more than once.`)
      return
    }

    seen.add(symbol)

    if (rawWeight === '') {
      parsed.push({ symbol, weight: null })
      return
    }

    const weight = Number(rawWeight)

    if (!Number.isFinite(weight) || weight < 0) {
      errors.push(`Row ${rowNumber}: "${cleanField(fields[1])}" is not a valid weight.`)
      return
    }

    parsed.push({ symbol, weight })
  })

  if (errors.length > 0) {
    return { assets: [], errors, notes }
  }

  const missing = parsed.filter((row) => row.weight === null).length

  // Half a file with weights is more likely a mistake than an intention, so
  // it is refused rather than guessed at.
  if (missing > 0 && missing < parsed.length) {
    return {
      assets: [],
      errors: [
        'Give a weight for every holding, or leave them all blank to split evenly.',
      ],
      notes,
    }
  }

  let weights

  if (missing === parsed.length) {
    weights = equalWeights(parsed.length)
    notes.push(`No weights in the file, so the ${parsed.length} holdings were split evenly.`)
  } else {
    weights = parsed.map((row) => row.weight)

    const total = weights.reduce((sum, weight) => sum + weight, 0)

    // Weights written as fractions of 1 (0.6 / 0.4) are a common export shape
    // and unambiguous: no real portfolio's weights add up to 1%.
    if (Math.abs(total - 1) < 0.01) {
      weights = weights.map((weight) => Math.round(weight * 10000) / 100)
      notes.push('Weights looked like fractions of 1, so they were read as percentages.')
    }
  }

  const assets = parsed.map((row, index) => ({
    id: `csv-${index}-${row.symbol}`,
    symbol: row.symbol,
    weight: weights[index],
  }))

  const total = assets.reduce((sum, asset) => sum + asset.weight, 0)

  // Not an error: the form shows a running total and blocks the run until it
  // reaches 100, so the user can fix it in place rather than re-editing a file.
  if (Math.abs(total - 100) > 0.01) {
    notes.push(`Weights total ${Math.round(total * 100) / 100}%, not 100%.`)
  }

  return { assets, errors, notes }
}

module.exports = {
  parsePortfolioCsv,
  TICKER_PATTERN,
}
