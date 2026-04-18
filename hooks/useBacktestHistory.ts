'use client'

import { useEffect, useState } from 'react'
import type { DbBacktest } from '@/lib/types'

export function useBacktestHistory(userId: string | null) {
  const [backtests, setBacktests] = useState<DbBacktest[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchHistory = async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/backtests/${userId}`)
      const data = await response.json()
      setBacktests(data || [])
    } catch (error) {
      console.error('[v0] Failed to fetch backtest history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [userId])

  const addBacktest = (backtest: DbBacktest) => {
    setBacktests([backtest, ...backtests])
  }

  return { backtests, isLoading, refetch: fetchHistory, addBacktest }
}
