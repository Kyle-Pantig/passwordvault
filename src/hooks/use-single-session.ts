import { useEffect } from 'react'
import { useAuth } from './use-auth'

export function useSingleSession() {
  const { user, signOut } = useAuth()

  useEffect(() => {
    if (!user) return

    // Check for single session enforcement
    const enforceSingleSession = async () => {
      try {
        const response = await fetch('/api/auth/single-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (response.ok && data.revokedSessions > 0) {
          console.log(`Revoked ${data.revokedSessions} other active sessions`)
          // Optionally show a toast notification
        }
      } catch (error) {
        console.error('Error enforcing single session:', error)
      }
    }

    // Enforce single session on login
    enforceSingleSession()

    // Listen for auth state changes (new logins)
    const handleAuthChange = () => {
      if (user) {
        enforceSingleSession()
      }
    }

    // Set up listener for auth changes
    const interval = setInterval(handleAuthChange, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [user, signOut])

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
