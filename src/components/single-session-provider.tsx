'use client'

import { useSingleSession } from '@/hooks/use-single-session'
import { useAuth } from '@/contexts/auth-context'

interface SingleSessionProviderProps {
  children: React.ReactNode
}

export function SingleSessionProvider({ children }: SingleSessionProviderProps) {
  const { user } = useAuth()
  
  // This hook will handle single session enforcement
  useSingleSession()

  return <>{children}</>
}
