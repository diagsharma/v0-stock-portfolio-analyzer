'use client'

import { useEffect, useState } from 'react'

export function useUser() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Check if user already exists in localStorage
        const storedUserId = localStorage.getItem('portfolio_user_id')
        
        if (storedUserId) {
          setUserId(storedUserId)
          setIsLoading(false)
          return
        }

        // Create new anonymous user
        const response = await fetch('/api/users', { method: 'POST' })
        const data = await response.json()

        if (response.ok && data.id) {
          localStorage.setItem('portfolio_user_id', data.id)
          setUserId(data.id)
        }
      } catch (error) {
        console.error('[v0] Failed to initialize user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeUser()
  }, [])

  return { userId, isLoading }
}
