import { useEffect, useRef, useState } from 'react'
import { useAuth } from './use-auth'
import { toast } from 'sonner'

interface AutoLogoutOptions {
  timeoutMinutes?: number
  warningMinutes?: number
  enabled?: boolean
}

export function useAutoLogout(options: AutoLogoutOptions = {}) {
  const { signOut } = useAuth()
  const {
    timeoutMinutes = 30, // Default 30 minutes
    warningMinutes = 5,  // Warning 5 minutes before logout
    enabled = true
  } = options

  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Reset timers on user activity
  const resetTimers = () => {
    if (!enabled) return

    lastActivityRef.current = Date.now()
    setTimeLeft(null)
    setShowWarning(false)

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = null
    }

    // Set warning timer
    const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true)
      setTimeLeft(warningMinutes * 60)
      
      // Start countdown
      const countdownInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 0) {
            clearInterval(countdownInterval)
            return null
          }
          return prev - 1
        })
      }, 1000)
    }, warningTime)

    // Set logout timer
    const logoutTime = timeoutMinutes * 60 * 1000
    timeoutRef.current = setTimeout(() => {
      handleAutoLogout()
    }, logoutTime)
  }

  // Handle auto logout
  const handleAutoLogout = async () => {
    setShowWarning(false)
    setTimeLeft(null)
    
    toast.error('Session expired due to inactivity. Please log in again.', {
      duration: 5000,
    })
    
    await signOut()
  }

  // Extend session (user clicked "Stay Logged In")
  const extendSession = () => {
    resetTimers()
    toast.success('Session extended. You will stay logged in.', {
      duration: 3000,
    })
  }

  // Activity detection
  useEffect(() => {
    if (!enabled) return

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus',
      'blur'
    ]

    const handleActivity = () => {
      // Only reset if there's been significant activity (not just mouse movement)
      const now = Date.now()
      if (now - lastActivityRef.current > 1000) { // 1 second debounce
        resetTimers()
      }
    }

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Initial timer setup
    resetTimers()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [enabled, timeoutMinutes, warningMinutes])

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return {
    showWarning,
    timeLeft: timeLeft ? formatTime(timeLeft) : null,
    extendSession,
    resetTimers
  }
}
