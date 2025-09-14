import { useEffect, useRef } from 'react'

interface UseAutoLockProps {
  isUnlocked: boolean
  timeoutMinutes: number
  onAutoLock: () => void
  categoryId: string
}

export function useAutoLock({ isUnlocked, timeoutMinutes, onAutoLock, categoryId }: UseAutoLockProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Reset timer on user activity
  const resetTimer = () => {
    lastActivityRef.current = Date.now()
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    if (isUnlocked) {
      timeoutRef.current = setTimeout(() => {
        onAutoLock()
      }, timeoutMinutes * 60 * 1000) // Convert minutes to milliseconds
    }
  }

  // Set up activity listeners
  useEffect(() => {
    if (!isUnlocked) return

    const handleActivity = () => {
      resetTimer()
    }

    // Listen for various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Initial timer setup
    resetTimer()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isUnlocked, timeoutMinutes, onAutoLock, categoryId])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { resetTimer }
}
