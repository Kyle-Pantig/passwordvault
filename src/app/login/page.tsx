'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Eye, EyeOff, Shield } from 'lucide-react'
import { LoaderThree } from '@/components/ui/loader'
import { GoogleIcon } from '@/components/ui/google-icon'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [lockoutTime, setLockoutTime] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false) // true for 6+ attempts, false for 3-5 attempts
  const router = useRouter()
  const { user, loading: authLoading, signIn, signInWithGoogle, check2FAStatus } = useAuth()

  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/')
    }
  }, [user, authLoading, router])

  // Check for existing rate limiting on page load (for persistence on reload)
  useEffect(() => {
    const checkExistingRateLimit = async () => {
      try {
        const response = await fetch('/api/admin/rate-limit-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.isBlocked) {
            setRateLimited(true)
            const isLocked = data.error?.includes('locked due to too many attempts') || false
            setIsLocked(isLocked)
            
            if (data.lockoutUntil) {
              setLockoutTime(data.lockoutUntil)
            }
          }
        }
      } catch (error) {
        console.error('Failed to check rate limit status:', error)
      }
    }

    if (email) {
      checkExistingRateLimit()
    }
  }, [email])

  // Countdown effect for lockout
  useEffect(() => {
    if (!lockoutTime) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const now = new Date().getTime()
      const lockout = new Date(lockoutTime).getTime()
      const timeLeft = lockout - now

      if (timeLeft <= 0) {
        setCountdown(null)
        setRateLimited(false)
        setLockoutTime(null)
        return
      }

      const minutes = Math.floor(timeLeft / (1000 * 60))
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

      if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`)
      } else {
        setCountdown(`${seconds}s`)
      }
    }

    // Update immediately
    updateCountdown()

    // Update every second
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [lockoutTime])


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setRateLimited(false)
    setLockoutTime(null)

    try {
      const result = await signIn(email, password)

      if (!result.success) {
        // Handle rate limiting
        if (result.rateLimited) {
          setRateLimited(true)
          
          // Determine if it's locked (6+ attempts) or just disabled (3-5 attempts)
          const isLocked = result.error?.includes('locked due to too many attempts') || false
          setIsLocked(isLocked)
          
          // Use the actual lockout time from the API response
          if (result.lockoutUntil) {
            setLockoutTime(result.lockoutUntil)
          }
        }
        
        toast.error(result.error || 'Login failed')
        return
      }

      // Check if user has 2FA enabled
      const twoFactorEnabled = await check2FAStatus()
      
      if (twoFactorEnabled) {
        // Redirect to 2FA verification
        router.push('/verify-2fa')
      } else {
        toast.success('Logged in successfully!')
        router.push('/')
      }
    } catch (_error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)

    try {
      const result = await signInWithGoogle()

      if (!result.success) {
        toast.error(result.error || 'Google login failed')
        return
      }

      // Google OAuth will redirect to 2FA verification page
      // The 2FA page will check if 2FA is enabled and redirect accordingly
    } catch (_error) {
      toast.error('An unexpected error occurred with Google login')
    } finally {
      setGoogleLoading(false)
    }
  }


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="flex flex-col items-center relative">
          <LoaderThree />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your vault...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link 
            href="/" 
            className="flex flex-col items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          >
            <Shield className="h-8 w-8 text-blue-500" />
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">DigiVault</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Secure your digital life</p>
            </div>
          </Link>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your account to access your password vault
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || rateLimited}>
              {loading ? 'Signing in...' : rateLimited ? (isLocked ? 'Account Locked' : 'Account Temporarily Disabled') : 'Sign In'}
            </Button>
            
            {/* Rate Limiting Feedback */}
            {rateLimited && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-red-500 mr-2" />
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <p className="font-medium">
                      {isLocked ? 'Account locked due to too many attempts' : 'Account temporarily disabled'}
                    </p>
                    <p className="text-xs mt-1">
                      {countdown ? `Try again in ${countdown}` : 'Please try again later'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
          </form>
          
          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-card">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <LoaderThree />
            ) : (
              <GoogleIcon className="h-4 w-4 mr-2" />
            )}
            {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
          </Button>
          <div className="mt-4 space-y-3">
            <div className="text-center text-sm">
              Don't have an account?{' '}
              <Link href="/signup" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </div>
            <div className="text-center">
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Forgot your password?
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
