import { useEffect, useRef } from 'react'
import { useAuth } from './use-auth'
import { createClient } from '@/lib/supabase/client'

export function useSingleSession() {
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
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
      try {
        const response = await fetch('/api/auth/single-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (!response.ok) {
          // Session is invalid, sign out
          console.log('Session invalid, signing out')
          await signOut()
          return
        }

        // Check if this session was marked as inactive (user logged in elsewhere)
        const { data: sessionData, error } = await supabase
          .from('user_sessions')
          .select('is_active')
          .eq('user_id', user.id)
          .eq('session_id', (await supabase.auth.getSession()).data.session?.access_token)
          .single()

        if (!error && sessionData && !sessionData.is_active) {
          console.log('Session was revoked by another device')
          await signOut()
        }
      } catch (error) {
        console.error('Error checking session validity:', error)
      }
    }

    // Check session validity immediately
    checkSessionValidity()

    // Set up periodic checking every 30 seconds
    intervalRef.current = setInterval(checkSessionValidity, 30000)

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
