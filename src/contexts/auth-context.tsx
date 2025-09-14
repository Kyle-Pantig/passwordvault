'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string, recaptchaToken?: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    rateLimited?: boolean; 
    remainingAttempts?: number;
    lockoutUntil?: string;
  }>
  signUp: (email: string, password: string, recaptchaToken?: string) => Promise<{ success: boolean; error?: string }>
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>
  check2FAStatus: () => Promise<boolean>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signIn = async (email: string, password: string, recaptchaToken?: string) => {
    try {
      setLoading(true)
      
      // Use rate-limited login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, recaptchaToken }),
      })

      const result = await response.json()

      if (!result.success) {
        return { 
          success: false, 
          error: result.error,
          rateLimited: result.rateLimited,
          remainingAttempts: result.remainingAttempts,
          lockoutUntil: result.lockoutUntil
        }
      }

      // Update local auth state with the successful login
      if (result.user && result.session) {
        setUser(result.user)
        setSession(result.session)
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, recaptchaToken?: string) => {
    try {
      setLoading(true)
      
      // If reCAPTCHA token is provided, verify it first
      if (recaptchaToken) {
        try {
          const verifyResponse = await fetch('/api/auth/verify-recaptcha', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ recaptchaToken }),
          })
          
          const verifyResult = await verifyResponse.json()
          if (!verifyResult.success) {
            return { success: false, error: verifyResult.error || 'reCAPTCHA verification failed' }
          }
        } catch (error) {
          console.error('reCAPTCHA verification error:', error)
          return { success: false, error: 'reCAPTCHA verification failed' }
        }
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/verify-2fa`,
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast.error(error.message)
      } else {
        // Clear 2FA verification flag from session storage
        sessionStorage.removeItem('2fa_verified')
        toast.success('Signed out successfully')
        
        // Redirect to home page after successful logout
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
      }
    } catch (_error) {
      toast.error('Error signing out')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    } finally {
      setLoading(false)
    }
  }

  const resendVerification = async (email: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }
    } finally {
      setLoading(false)
    }
  }

  const check2FAStatus = async () => {
    try {
      const response = await fetch('/api/2fa/status')
      const { twoFactorEnabled } = await response.json()
      return twoFactorEnabled
    } catch (error) {
      console.error('Error checking 2FA status:', error)
      return false
    }
  }

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error refreshing session:', error)
        // If refresh fails, sign out the user
        await signOut()
      } else {
        setSession(data.session)
        setUser(data.session?.user ?? null)
        
      }
    } catch (error) {
      console.error('Error refreshing session:', error)
      // If refresh fails, sign out the user
      await signOut()
    }
  }

  // Check session expiry and handle timeout
  useEffect(() => {
    if (!session) return

    const checkSessionExpiry = () => {
      if (session.expires_at) {
        const now = Math.floor(Date.now() / 1000)
        const expiresAt = session.expires_at
        
        // If session expires in less than 5 minutes, try to refresh
        if (expiresAt - now < 300) {
          refreshSession()
        }
        
        // If session has expired, sign out
        if (expiresAt <= now) {
          signOut()
        }
      }
    }

    // Check immediately
    checkSessionExpiry()

    // Set up interval to check every minute
    const interval = setInterval(checkSessionExpiry, 60000)

    return () => clearInterval(interval)
  }, [session])

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    resendVerification,
    check2FAStatus,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Custom hooks for specific auth states
export function useUser() {
  const { user } = useAuth()
  return user
}

export function useSession() {
  const { session } = useAuth()
  return session
}

export function useAuthLoading() {
  const { loading } = useAuth()
  return loading
}

// Hook for protected routes
export function useRequireAuth() {
  const { user, loading } = useAuth()
  return { user, loading, isAuthenticated: !!user }
}
