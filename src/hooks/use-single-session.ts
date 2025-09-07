import { useEffect, useRef } from 'react'
import { useAuth } from './use-auth'
import { createClient } from '@/lib/supabase/client'

export function useSingleSession() {
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckRef = useRef<number>(0)

  useEffect(() => {
    console.log('useSingleSession: user =', user ? 'logged in' : 'not logged in')
    
    if (!user) {
      // Clear interval if user is not logged in
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Check if current session is still valid
    const checkSessionValidity = async () => {
      // Debounce: don't check more than once every 10 seconds
      const now = Date.now()
      if (now - lastCheckRef.current < 10000) {
        console.log('Skipping session check (debounced)')
        return
      }
      lastCheckRef.current = now

      try {
        const response = await fetch('/api/auth/single-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (!response.ok) {
          // Only sign out if it's a 401 (unauthorized), not 406 (RLS issue)
          if (response.status === 401) {
            console.log('Session invalid (401), signing out')
            console.log('Response details:', data)
            await signOut()
          } else {
            console.log('API error (not 401), not signing out:', response.status, data)
          }
          return
        }

        // Log database status if provided
        if (data.warning) {
          console.warn('Single session warning:', data.warning)
        }

        // Skip database check for now due to RLS issues
        // The main session enforcement happens in the API endpoint
        console.log('Session validity check completed (database check skipped due to RLS)')
      } catch (error) {
        console.error('Error checking session validity:', error)
      }
    }

    // Check session validity immediately
    checkSessionValidity()

    // Set up periodic checking every 60 seconds (reduced frequency)
    intervalRef.current = setInterval(checkSessionValidity, 60000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [user, signOut, supabase])

  return {
    enforceSingleSession: async () => {
      try {
        const response = await fetch('/api/auth/single-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()
        return data
      } catch (error) {
        console.error('Error enforcing single session:', error)
        return { success: false, error: 'Failed to enforce single session' }
      }
    }
  }
}
