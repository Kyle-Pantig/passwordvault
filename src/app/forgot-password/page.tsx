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
import { Shield } from 'lucide-react'
import { LoaderThree } from '@/components/ui/loader'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading, resetPassword } = useAuth()

  useEffect(() => {
    if (user && !authLoading) {
      console.log('User already authenticated, redirecting to vault')
      router.replace('/')
    }
  }, [user, authLoading, router])

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await resetPassword(email)

      if (!result.success) {
        toast.error(result.error || 'Failed to send reset email')
      } else {
        setEmailSent(true)
        toast.success('Password reset email sent! Please check your inbox.')
      }
    } catch (_error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.push('/login')
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

  if (emailSent) {
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
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Password Vault</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Secure your digital life</p>
              </div>
            </Link>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              Password reset link sent to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>We've sent you a password reset link to your email address.</p>
              <p className="mt-2">Please check your inbox and click the link to reset your password.</p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => setEmailSent(false)}
                variant="outline"
                className="w-full"
              >
                Send Another Email
              </Button>
              <Button
                onClick={handleBackToLogin}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Password Vault</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Secure your digital life</p>
            </div>
          </Link>
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Remember your password?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
