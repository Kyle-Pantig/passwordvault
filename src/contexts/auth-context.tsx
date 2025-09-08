'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
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
        
        // Register session for single session enforcement
        if (event === 'SIGNED_IN' && session) {
          try {
            // Only register once per session
            const response = await fetch('/api/sessions/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            if (!response.ok) {
              console.error('Session registration failed:', await response.text())
            }
          } catch (sessionError) {
            console.error('Failed to register session:', sessionError)
          }
        }
        
        // Handle session termination
        if (event === 'SIGNED_OUT') {
          // Clean up any remaining session data
          try {
            await fetch('/api/sessions/cleanup', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })
          } catch (cleanupError) {
            console.error('Failed to cleanup sessions:', cleanupError)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        return { 
          success: false, 
          error: 'Please verify your email before signing in. Check your inbox for a verification link.' 
        }
      }

      // Register the new session for single session enforcement
      if (data.session) {
        try {
          await fetch('/api/sessions/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        } catch (sessionError) {
          console.error('Failed to register session:', sessionError)
          // Don't fail the sign-in if session registration fails
        }
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

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
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
        toast.success('Signed out successfully')
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
        
        // Validate session after refresh
        if (data.session) {
          try {
            const response = await fetch('/api/sessions/validate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            
            if (!response.ok) {
              const errorData = await response.json()
              if (errorData.error === 'Session terminated - another session is active') {
                toast.error('Your session has been terminated because you signed in from another device.')
                await signOut()
              }
            }
          } catch (validationError) {
            console.error('Session validation error:', validationError)
          }
        }
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
