/**
 * Unit tests for CSV portfolio import.
 *
 * These files come from spreadsheets and brokerage exports, so most of the
 * surface area here is tolerating real-world messiness without accepting
 * anything that would produce a wrong portfolio.
 */

const { parsePortfolioCsv } = require('./portfolioCsv')

describe('parsePortfolioCsv - well-formed input', () => {
  test('parses a plain ticker,weight file', () => {
    const { assets, errors } = parsePortfolioCsv('SPY,60\nBND,40')

    expect(errors).toEqual([])
    expect(assets).toEqual([
      { id: 'csv-0-SPY', symbol: 'SPY', weight: 60 },
      { id: 'csv-1-BND', symbol: 'BND', weight: 40 },
    ])
  })

  test('skips a header row', () => {
    const { assets, errors } = parsePortfolioCsv('Ticker,Allocation\nSPY,60\nBND,40')

    expect(errors).toEqual([])
    expect(assets.map((a) => a.symbol)).toEqual(['SPY', 'BND'])
  })

  test('uppercases and trims symbols', () => {
    const { assets } = parsePortfolioCsv('  spy , 60 \nbnd,40')
    expect(assets.map((a) => a.symbol)).toEqual(['SPY', 'BND'])
  })

  test('accepts quoted fields', () => {
    const { assets, errors } = parsePortfolioCsv('"SPY","60"\n"BND","40"')
    expect(errors).toEqual([])
    expect(assets[0]).toMatchObject({ symbol: 'SPY', weight: 60 })
  })

  test('strips a percent sign from weights', () => {
    const { assets, errors } = parsePortfolioCsv('SPY,60%\nBND,40%')
    expect(errors).toEqual([])
    expect(assets.map((a) => a.weight)).toEqual([60, 40])
  })

  test('handles semicolon and tab delimiters', () => {
    expect(parsePortfolioCsv('SPY;60\nBND;40').assets.map((a) => a.weight)).toEqual([60, 40])
    expect(parsePortfolioCsv('SPY\t60\nBND\t40').assets.map((a) => a.weight)).toEqual([60, 40])
  })

  test('ignores blank lines, comments and a trailing newline', () => {
    const { assets, errors } = parsePortfolioCsv('# my picks\n\nSPY,60\n\nBND,40\n')
    expect(errors).toEqual([])
    expect(assets).toHaveLength(2)
  })

  test('strips a UTF-8 BOM so the first ticker survives', () => {
    const { assets, errors } = parsePortfolioCsv('﻿SPY,60\nBND,40')
    expect(errors).toEqual([])
    expect(assets[0].symbol).toBe('SPY')
  })

  test('accepts CRLF line endings', () => {
    const { assets } = parsePortfolioCsv('SPY,60\r\nBND,40\r\n')
    expect(assets).toHaveLength(2)
  })
})

describe('parsePortfolioCsv - weights', () => {
  test('splits evenly when no weights are given', () => {
    const { assets, notes } = parsePortfolioCsv('SPY\nBND\nVTI')

    expect(assets.map((a) => a.weight)).toEqual([33.34, 33.33, 33.33])
    // Exactly 100, so the form does not reject an evenly split file.
    expect(assets.reduce((sum, a) => sum + a.weight, 0)).toBeCloseTo(100, 10)
    expect(notes.join(' ')).toMatch(/split evenly/)
  })

  test('reads fractions of 1 as percentages', () => {
    const { assets, notes } = parsePortfolioCsv('SPY,0.6\nBND,0.4')

    expect(assets.map((a) => a.weight)).toEqual([60, 40])
    expect(notes.join(' ')).toMatch(/fractions of 1/)
  })

  test('imports weights that do not total 100 but flags them', () => {
    const { assets, errors, notes } = parsePortfolioCsv('SPY,60\nBND,30')

    // Left to the form's own running total to resolve, rather than refusing
    // the file outright.
    expect(errors).toEqual([])
    expect(assets).toHaveLength(2)
    expect(notes.join(' ')).toMatch(/90%, not 100%/)
  })

  test('refuses a file where only some rows have weights', () => {
    const { assets, errors } = parsePortfolioCsv('SPY,60\nBND')

    expect(assets).toEqual([])
    expect(errors[0]).toMatch(/weight for every holding/)
  })
})

describe('parsePortfolioCsv - rejections', () => {
  test('rejects an empty file', () => {
    expect(parsePortfolioCsv('').errors[0]).toMatch(/empty/)
    expect(parsePortfolioCsv('   \n  ').errors[0]).toMatch(/empty/)
  })

  test('rejects a header with no holdings', () => {
    expect(parsePortfolioCsv('Ticker,Weight').errors[0]).toMatch(/no holdings/)
  })

  test('reports an invalid ticker with its row number', () => {
    const { assets, errors } = parsePortfolioCsv('SPY,50\nTOOLONG,50')

    expect(assets).toEqual([])
    expect(errors[0]).toMatch(/Row 2/)
    expect(errors[0]).toMatch(/TOOLONG/)
  })

  test('reports a duplicate ticker', () => {
    const { errors } = parsePortfolioCsv('SPY,50\nSPY,50')
    expect(errors[0]).toMatch(/SPY appears more than once/)
  })

  test('reports a non-numeric weight', () => {
    const { errors } = parsePortfolioCsv('SPY,sixty\nBND,40')
    expect(errors[0]).toMatch(/not a valid weight/)
  })

  test('rejects a negative weight', () => {
    expect(parsePortfolioCsv('SPY,-10\nBND,110').errors[0]).toMatch(/not a valid weight/)
  })

  test('rejects more holdings than the form allows', () => {
    const rows = Array.from(
      { length: 51 },
      (_, i) =>
        `A${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))},2`
    )
    const { errors } = parsePortfolioCsv(rows.join('\n'))

    expect(errors[0]).toMatch(/51 holdings.*maximum is 50/)
  })

  // The cap that mattered: a 48-line brokerage export used to be refused.
  test('accepts a large imported portfolio', () => {
    const rows = Array.from(
      { length: 48 },
      (_, i) =>
        `A${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`
    )
    const { assets, errors } = parsePortfolioCsv(rows.join('\n'))

    expect(errors).toEqual([])
    expect(assets).toHaveLength(48)
    // An even split across 48 must still land on exactly 100.
    expect(assets.reduce((sum, a) => sum + a.weight, 0)).toBeCloseTo(100, 10)
  })

  test('honours a custom maxAssets', () => {
    const { errors } = parsePortfolioCsv('SPY,50\nBND,50', { maxAssets: 1 })
    expect(errors[0]).toMatch(/maximum is 1/)
  })

  test('returns no assets at all when any row is bad', () => {
    // Importing half a portfolio silently would be worse than importing none.
    const { assets, errors } = parsePortfolioCsv('SPY,60\n123,40')

    expect(assets).toEqual([])
    expect(errors).toHaveLength(1)
  })

  test('does not throw on junk input', () => {
    expect(() => parsePortfolioCsv(null)).not.toThrow()
    expect(() => parsePortfolioCsv(',,,\n,,,')).not.toThrow()
  })
})
