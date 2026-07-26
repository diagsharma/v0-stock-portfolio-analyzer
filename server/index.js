require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Backtest API server is running' })
})

// POST /api/backtest - returns hardcoded response
app.post('/api/backtest', (req, res) => {
  res.json({ status: 'success', message: 'API endpoint works' })
})

app.listen(PORT, () => {
  console.log(`[server] Backtest API listening on http://localhost:${PORT}`)
})

module.exports = app
