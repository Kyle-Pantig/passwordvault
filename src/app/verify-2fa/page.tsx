'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { toast } from 'sonner'
import { Shield, ArrowLeft, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp'

function Verify2FAContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [email, setEmail] = useState('')
  const [checking2FA, setChecking2FA] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (user && !authLoading) {
      setEmail(user.email || '')
      // Check if user has 2FA enabled
      check2FAStatus()
    } else if (!user && !authLoading) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const check2FAStatus = async () => {
    try {
      setChecking2FA(true)
      const response = await fetch('/api/2fa/status')
      const { twoFactorEnabled } = await response.json()
      
      if (!twoFactorEnabled) {
        // User doesn't have 2FA enabled, check if they have a secret (setup in progress)
        const setupResponse = await fetch('/api/2fa/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (setupResponse.ok) {
          // User has a secret but 2FA not enabled yet, redirect to setup
          router.push('/setup-2fa')
        } else {
          // User doesn't have 2FA setup, redirect to home
          toast.success('Signed in successfully!')
          router.push('/')
        }
      } else {
        setChecking2FA(false)
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error)
      // If there's an error checking 2FA status, assume 2FA is required
      setChecking2FA(false)
    }
  }

  const verifyToken = async (otpValue?: string, backupValue?: string) => {
    const codeToVerify = otpValue || token
    const backupToVerify = backupValue || backupCode
    if (!codeToVerify && !backupToVerify) {
      toast.error('Please enter a verification code or backup code')
      return
    }

    try {
      setLoading(true)
      
      if (useBackupCode) {
        // Verify backup code
        const response = await fetch('/api/2fa/verify-backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ backupCode: backupToVerify }),
        })

        const data = await response.json()

        if (response.ok) {
          toast.success('Login successful!')
          
          // Show warning if provided
          if (data.warning) {
            toast.warning(data.warning)
          }
          
          router.push('/')
        } else {
          toast.error(data.error || 'Invalid backup code')
        }
      } else {
        // Verify TOTP token
        const response = await fetch('/api/2fa/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: codeToVerify }),
        })

        const data = await response.json()

        if (response.ok) {
          toast.success('Login successful!')
          router.push('/')
        } else {
          toast.error(data.error || 'Invalid verification code')
        }
      }
    } catch (_error) {
      toast.error('Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit when OTP is complete
  const handleOTPChange = (value: string) => {
    setToken(value)
    if (value.length === 6) {
      // Auto-submit when 6 digits are entered
      verifyToken(value)
    }
  }

  // Auto-submit when backup code is complete
  const handleBackupCodeChange = (value: string) => {
    setBackupCode(value.toUpperCase())
    if (value.length === 6) {
      // Auto-submit when 6 characters are entered
      verifyToken(undefined, value.toUpperCase())
    }
  }


  // Show loading state while checking 2FA status
  if (checking2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="flex flex-col items-center space-y-4">
                <Shield className="h-12 w-12 text-blue-600" />
                <div>
                  <CardTitle className="text-2xl font-bold">
                    Verifying Authentication
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Please wait while we verify your login...
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Checking your security settings...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex flex-col items-center space-y-4">
              <Shield className="h-12 w-12 text-blue-600" />
              <div>
                <CardTitle className="text-2xl font-bold">
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription className="mt-2">
                  Enter the verification code from your authenticator app
                </CardDescription>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <CardTitle className="text-lg">Verify Your Identity</CardTitle>
              <CardDescription>
                {email && `Enter the code for ${email}`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!useBackupCode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token">Verification Code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                      value={token}
                      onChange={handleOTPChange}
                      disabled={loading}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                {loading && (
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Verifying code...
                  </div>
                )}

                <div className="text-center">
                  <button
                    onClick={() => setUseBackupCode(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Use backup code instead
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backupCode">Backup Code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                      value={backupCode}
                      onChange={handleBackupCodeChange}
                      disabled={loading}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                {loading && (
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Verifying code...
                  </div>
                )}

                <div className="text-center">
                  <button
                    onClick={() => setUseBackupCode(false)}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Use authenticator app instead
                  </button>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {useBackupCode 
                      ? 'Each backup code can only be used once. Make sure to save new codes after using one.'
                      : 'Make sure your device time is correct for the authenticator app to work properly.'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  supabase.auth.signOut()
                  router.push('/login')
                }}
                className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back to login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="flex flex-col items-center">
          <Shield className="h-12 w-12 text-blue-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <Verify2FAContent />
    </Suspense>
  )
}
