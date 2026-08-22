require('dotenv').config()

const express = require('express')
const cors = require('cors')

const {
  calculateDailyReturns,
  calculateTotalReturn,
  calculateAnnualizedReturn,
  calculateMaxDrawdown,
  calculateSharpeRatio,
} = require('../backend/utils/calculations')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Hardcoded sample price series, stands in for real market data until the
// Alpha Vantage / Yahoo Finance service layer is wired in.
const SAMPLE_PRICES = [
  100, 102, 105, 103, 108, 112, 120, 118, 125, 121,
  116, 110, 98, 84, 90, 97, 104, 109, 115, 122,
  128, 133, 129, 138, 145, 150,
]
const SAMPLE_START_DATE = '2021-01-01'
const SAMPLE_END_DATE = '2024-01-01'

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Backtest API server is running' })
})

/**
 * POST /api/backtest
 *
 * Runs the four required metrics over a hardcoded sample series. The request
 * body is accepted but not yet used — the live data integration replaces
 * SAMPLE_PRICES in the next sprint.
 */
app.post('/api/backtest', (req, res) => {
  try {
    const { startDate = SAMPLE_START_DATE, endDate = SAMPLE_END_DATE } = req.body || {}

    const dailyReturns = calculateDailyReturns(SAMPLE_PRICES)

    res.json({
      status: 'success',
      metrics: {
        totalReturn: calculateTotalReturn(SAMPLE_PRICES),
        annualizedReturn: calculateAnnualizedReturn(SAMPLE_PRICES, startDate, endDate),
        maxDrawdown: calculateMaxDrawdown(SAMPLE_PRICES),
        sharpeRatio: calculateSharpeRatio(dailyReturns),
      },
    })
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
})

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[server] Backtest API listening on http://localhost:${PORT}`)
  })
}

module.exports = app
