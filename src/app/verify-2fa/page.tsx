'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Shield, ArrowLeft, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function Verify2FAContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [email, setEmail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (user && !authLoading) {
      setEmail(user.email || '')
    } else if (!user && !authLoading) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const verifyToken = async () => {
    if (!token && !backupCode) {
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
          body: JSON.stringify({ backupCode }),
        })

        const data = await response.json()

        if (response.ok) {
          toast.success('Login successful!')
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
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (response.ok) {
          toast.success('Login successful!')
          router.push('/')
        } else {
          toast.error(data.error || 'Invalid verification code')
        }
      }
    } catch (error) {
      toast.error('Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyToken()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Two-Factor Authentication
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Enter the verification code from your authenticator app
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Verify Your Identity</CardTitle>
            <CardDescription>
              {email && `Enter the code for ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!useBackupCode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token">Verification Code</Label>
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="text-center text-lg font-mono"
                    onKeyPress={handleKeyPress}
                  />
                </div>

                <Button 
                  onClick={verifyToken} 
                  disabled={loading || token.length !== 6}
                  className="w-full"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>

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
                  <Input
                    id="backupCode"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    className="text-center text-lg font-mono"
                    onKeyPress={handleKeyPress}
                  />
                </div>

                <Button 
                  onClick={verifyToken} 
                  disabled={loading || !backupCode}
                  className="w-full"
                >
                  {loading ? 'Verifying...' : 'Verify Backup Code'}
                </Button>

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
