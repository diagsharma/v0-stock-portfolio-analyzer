const {
  toISODate,
  validateTicker,
  validateTickers,
  validateDateRange,
  validateBacktestRequest,
} = require('./validation')
const { ValidationError } = require('./errors')

describe('toISODate', () => {
  test('formats a Date as YYYY-MM-DD', () => {
    expect(toISODate(new Date('2021-03-05T00:00:00Z'))).toBe('2021-03-05')
  })

  test('does not shift the date backwards for late-evening UTC times', () => {
    // The bug this guards against: a naive local-time conversion turns
    // 2021-03-05T23:30Z into 2021-03-04 for anyone west of UTC.
    expect(toISODate(new Date('2021-03-05T23:30:00Z'))).toBe('2021-03-05')
  })

  test('returns an empty string for an invalid date', () => {
    expect(toISODate('not-a-date')).toBe('')
  })
})

describe('validateTicker', () => {
  test('accepts and uppercases a valid symbol', () => {
    expect(validateTicker('aapl')).toBe('AAPL')
    expect(validateTicker('  msft  ')).toBe('MSFT')
  })

  test('accepts the 1 and 5 character boundaries', () => {
    expect(validateTicker('F')).toBe('F')
    expect(validateTicker('GOOGL')).toBe('GOOGL')
  })

  test('rejects symbols longer than 5 characters', () => {
    expect(() => validateTicker('TOOLONG')).toThrow(ValidationError)
  })

  test('rejects symbols containing digits or punctuation', () => {
    expect(() => validateTicker('BRK.B')).toThrow(ValidationError)
    expect(() => validateTicker('AAP1')).toThrow(ValidationError)
  })

  test('rejects empty input', () => {
    expect(() => validateTicker('')).toThrow(ValidationError)
    expect(() => validateTicker('   ')).toThrow(ValidationError)
    expect(() => validateTicker(null)).toThrow(ValidationError)
  })
})

describe('validateTickers', () => {
  test('accepts a list within the 1-10 range', () => {
    expect(validateTickers(['aapl', 'msft'])).toEqual(['AAPL', 'MSFT'])
  })

  test('rejects an empty list', () => {
    expect(() => validateTickers([])).toThrow(/at least one ticker/i)
  })

  test('rejects more than 10 tickers', () => {
    const eleven = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']
    expect(() => validateTickers(eleven)).toThrow(/at most 10/i)
  })

  test('accepts exactly 10 tickers', () => {
    const ten = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    expect(validateTickers(ten)).toHaveLength(10)
  })

  test('rejects duplicates, including differing case', () => {
    expect(() => validateTickers(['AAPL', 'aapl'])).toThrow(/duplicate/i)
  })
})

describe('validateDateRange', () => {
  test('accepts a well-formed range', () => {
    expect(validateDateRange('2021-01-01', '2023-12-31')).toEqual({
      startDate: '2021-01-01',
      endDate: '2023-12-31',
    })
  })

  test('rejects a start date on or after the end date', () => {
    expect(() => validateDateRange('2023-01-01', '2021-01-01')).toThrow(
      /start date must be before/i
    )
    expect(() => validateDateRange('2023-01-01', '2023-01-01')).toThrow(
      /start date must be before/i
    )
  })

  test('rejects malformed dates', () => {
    expect(() => validateDateRange('01/01/2021', '2023-12-31')).toThrow(
      /YYYY-MM-DD/
    )
  })

  test('rejects a start date in the future', () => {
    expect(() => validateDateRange('2099-01-01', '2099-12-31')).toThrow(
      /future/i
    )
  })

  test('allows a weekend start date', () => {
    // 2021-01-02 was a Saturday. Picking it is not a user error.
    expect(() => validateDateRange('2021-01-02', '2021-06-01')).not.toThrow()
  })
})

describe('validateBacktestRequest', () => {
  const valid = {
    tickers: ['AAPL', 'MSFT'],
    startDate: '2021-01-01',
    endDate: '2023-12-31',
  }

  test('returns a normalized request', () => {
    expect(validateBacktestRequest(valid)).toEqual({
      tickers: ['AAPL', 'MSFT'],
      startDate: '2021-01-01',
      endDate: '2023-12-31',
      benchmark: 'SPY',
      initialInvestment: 10000,
    })
  })

  test('defaults the benchmark to SPY', () => {
    expect(validateBacktestRequest(valid).benchmark).toBe('SPY')
  })

  test('honours an explicit benchmark', () => {
    expect(
      validateBacktestRequest({ ...valid, benchmark: 'qqq' }).benchmark
    ).toBe('QQQ')
  })

  test('rejects a non-positive initial investment', () => {
    expect(() =>
      validateBacktestRequest({ ...valid, initialInvestment: 0 })
    ).toThrow(/positive number/i)
    expect(() =>
      validateBacktestRequest({ ...valid, initialInvestment: -5 })
    ).toThrow(/positive number/i)
  })

  test('rejects a missing body', () => {
    expect(() => validateBacktestRequest(null)).toThrow(ValidationError)
  })

  test('surfaces a 400 status on validation errors', () => {
    expect.assertions(1)

    try {
      validateBacktestRequest({ ...valid, tickers: [] })
    } catch (error) {
      expect(error.statusCode).toBe(400)
    }
  })
})
