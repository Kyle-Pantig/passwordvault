'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'

export type SubscriptionPlan = 'FREE' | 'PLUS' | 'PRO'

export interface Subscription {
  plan: SubscriptionPlan
  status: 'active' | 'inactive' | 'past_due' | 'cancelled'
  credentialLimit: number
  currentPeriodStart?: string
  currentPeriodEnd?: string
  stripeSubscriptionId?: string
  cancelAtPeriodEnd?: boolean
}

interface SubscriptionContextType {
  subscription: Subscription | null
  loading: boolean
  refreshSubscription: () => Promise<void>
  canAddCredential: () => Promise<boolean>
  getCredentialCount: () => Promise<number>
  getRemainingCredits: () => Promise<number>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

const SUBSCRIPTION_PLANS = {
  FREE: { credentialLimit: 30, name: 'Free' },
  PLUS: { credentialLimit: 100, name: 'Plus' },
  PRO: { credentialLimit: -1, name: 'Pro' } // -1 means unlimited
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSubscription = async () => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    try {
      // Fetch subscription from API
      const response = await fetch('/api/subscription')
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }

      const subscriptionData = await response.json()
      
      setSubscription({
        plan: subscriptionData.plan,
        status: subscriptionData.status,
        credentialLimit: subscriptionData.credentialLimit,
        currentPeriodStart: subscriptionData.currentPeriodStart,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd
      })
    } catch (error) {
      console.error('Error fetching subscription:', error)
      // Default to FREE plan on error
      setSubscription({
        plan: 'FREE',
        status: 'active',
        credentialLimit: SUBSCRIPTION_PLANS.FREE.credentialLimit
      })
    } finally {
      setLoading(false)
    }
  }

  const getCredentialCount = async (): Promise<number> => {
    if (!user) return 0
    
    try {
      // Import the database service to get actual credential count
      const { DatabaseService } = await import('@/lib/database')
      const db = new DatabaseService()
      const credentials = await db.getCredentials()
      return credentials.length
    } catch (error) {
      console.error('Error fetching credential count:', error)
      return 0
    }
  }

  const getRemainingCredits = async (): Promise<number> => {
    if (!subscription) return 0
    
    const currentCount = await getCredentialCount()
    const limit = subscription.credentialLimit
    
    if (limit === -1) return -1 // Unlimited
    return Math.max(0, limit - currentCount)
  }

  const canAddCredential = async (): Promise<boolean> => {
    if (!subscription) return false
    
    const limit = subscription.credentialLimit
    if (limit === -1) return true // Unlimited
    
    // Check actual credential count against limit
    const currentCount = await getCredentialCount()
    return currentCount < limit
  }

  useEffect(() => {
    refreshSubscription()
  }, [user])

  const value: SubscriptionContextType = {
    subscription,
    loading,
    refreshSubscription,
    canAddCredential,
    getCredentialCount,
    getRemainingCredits
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
