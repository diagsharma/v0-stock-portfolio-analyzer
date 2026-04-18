import { NextResponse } from 'next/server'
import type { BacktestRequest, BacktestResult, PortfolioDataPoint } from '@/lib/types'

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY

interface AlphaVantageData {
  'Time Series (Daily)': Record<string, { '4. close': string }>
  Note?: string
  'Error Message'?: string
}

async function fetchHistoricalPrices(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, number>> {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`
  
  const response = await fetch(url)
  const data: AlphaVantageData = await response.json()
  
  console.log(`[v0] Alpha Vantage response for ${symbol}:`, JSON.stringify(data).substring(0, 200))
  
  if (data.Note) {
    throw new Error('Alpha Vantage API rate limit exceeded. Please wait 60 seconds and try again.')
  }
  
  if (data['Error Message']) {
    throw new Error(`Invalid symbol: ${symbol}`)
  }
  
  const timeSeries = data['Time Series (Daily)']
  if (!timeSeries || Object.keys(timeSeries).length === 0) {
    console.log(`[v0] No time series data for ${symbol}. Available keys:`, Object.keys(data))
    throw new Error(`No data found for symbol: ${symbol}. This could be due to API rate limiting. Please wait and try again.`)
  }
  
  const prices = new Map<string, number>()
  
  for (const [date, values] of Object.entries(timeSeries)) {
    const dateObj = new Date(date)
    if (dateObj >= startDate && dateObj <= endDate) {
      prices.set(date, parseFloat(values['4. close']))
    }
  }
  
  console.log(`[v0] Found ${prices.size} prices for ${symbol} in date range`)
  
  return prices
}

function getCommonDates(priceDataMap: Map<string, Map<string, number>>): string[] {
  const allDates = new Set<string>()
  const symbolDates: Set<string>[] = []
  
  for (const prices of priceDataMap.values()) {
    const dates = new Set(prices.keys())
    symbolDates.push(dates)
    for (const date of dates) {
      allDates.add(date)
    }
  }
  
  const commonDates = Array.from(allDates).filter(date =>
    symbolDates.every(dates => dates.has(date))
  )
  
  return commonDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
}

function calculateMetrics(
  portfolioHistory: PortfolioDataPoint[],
  riskFreeRate = 0.04
): { totalReturn: number; annualizedReturn: number; volatility: number; sharpeRatio: number; maxDrawdown: number } {
  if (portfolioHistory.length < 2) {
    return { totalReturn: 0, annualizedReturn: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0 }
  }
  
  const startValue = portfolioHistory[0].value
  const endValue = portfolioHistory[portfolioHistory.length - 1].value
  
  const totalReturn = ((endValue - startValue) / startValue) * 100
  
  const startDateObj = new Date(portfolioHistory[0].date)
  const endDateObj = new Date(portfolioHistory[portfolioHistory.length - 1].date)
  const years = (endDateObj.getTime() - startDateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  
  const annualizedReturn = years > 0 ? (Math.pow(endValue / startValue, 1 / years) - 1) * 100 : 0
  
  const dailyReturns: number[] = []
  for (let i = 1; i < portfolioHistory.length; i++) {
    const dailyReturn = (portfolioHistory[i].value - portfolioHistory[i - 1].value) / portfolioHistory[i - 1].value
    dailyReturns.push(dailyReturn)
  }
  
  const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length
  const dailyVolatility = Math.sqrt(variance)
  const volatility = dailyVolatility * Math.sqrt(252) * 100
  
  const dailyRiskFreeRate = riskFreeRate / 252
  const excessReturns = dailyReturns.map(r => r - dailyRiskFreeRate)
  const meanExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length
  const sharpeRatio = dailyVolatility > 0 ? (meanExcessReturn / dailyVolatility) * Math.sqrt(252) : 0
  
  let maxDrawdown = 0
  let peak = portfolioHistory[0].value
  
  for (const point of portfolioHistory) {
    if (point.value > peak) {
      peak = point.value
    }
    const drawdown = ((peak - point.value) / peak) * 100
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  }
  
  return { totalReturn, annualizedReturn, volatility, sharpeRatio, maxDrawdown }
}

export async function POST(request: Request): Promise<NextResponse<BacktestResult | { error: string }>> {
  try {
    if (!ALPHA_VANTAGE_API_KEY) {
      return NextResponse.json(
        { error: 'Alpha Vantage API key not configured' },
        { status: 500 }
      )
    }
    
    const body: BacktestRequest = await request.json()
    const { assets, startDate, endDate, initialInvestment } = body
    
    const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0)
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Asset weights must sum to 100%' },
        { status: 400 }
      )
    }
    
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    
    const priceDataMap = new Map<string, Map<string, number>>()
    
    for (const asset of assets) {
      const prices = await fetchHistoricalPrices(asset.symbol.toUpperCase(), startDateObj, endDateObj)
      priceDataMap.set(asset.symbol.toUpperCase(), prices)
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    const commonDates = getCommonDates(priceDataMap)
    
    if (commonDates.length < 2) {
      return NextResponse.json(
        { error: 'Not enough overlapping data for the selected assets and date range' },
        { status: 400 }
      )
    }
    
    const portfolioHistory: PortfolioDataPoint[] = []
    const assetReturns: Record<string, number> = {}
    
    const firstDate = commonDates[0]
    const lastDate = commonDates[commonDates.length - 1]
    
    for (const asset of assets) {
      const prices = priceDataMap.get(asset.symbol.toUpperCase())!
      const firstPrice = prices.get(firstDate)!
      const lastPrice = prices.get(lastDate)!
      assetReturns[asset.symbol.toUpperCase()] = ((lastPrice - firstPrice) / firstPrice) * 100
    }
    
    for (const date of commonDates) {
      let portfolioValue = 0
      
      for (const asset of assets) {
        const prices = priceDataMap.get(asset.symbol.toUpperCase())!
        const currentPrice = prices.get(date)!
        const firstPrice = prices.get(firstDate)!
        
        const assetAllocation = (asset.weight / 100) * initialInvestment
        const shares = assetAllocation / firstPrice
        portfolioValue += shares * currentPrice
      }
      
      portfolioHistory.push({
        date,
        value: Math.round(portfolioValue * 100) / 100
      })
    }
    
    const metrics = calculateMetrics(portfolioHistory)
    
    return NextResponse.json({
      metrics,
      portfolioHistory,
      assetReturns
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
