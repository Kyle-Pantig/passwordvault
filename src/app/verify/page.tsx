'use client'

import { useEffect, useState, Suspense } from 'react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { LoaderThree } from '@/components/ui/loader'

function VerifyContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const processVerification = async (token: string) => {
    try {
      
      // First, try to get the current session to see if user is already verified
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionData.session?.user?.email_confirmed_at) {
        setStatus('success')
        setMessage('Your email has already been verified!')
        toast.success('Email already verified!')
        setTimeout(() => {
          router.push('/vault')
        }, 2000)
        return
      }

      // Try different verification methods
      let verificationResult = null
      let verificationError = null

      // Method 1: Try with token_hash for signup
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        })
        verificationResult = data
        verificationError = error
      } catch (err) {
        
        // Method 2: Try with token for email verification (requires email)
        // We'll need to extract email from the token or use a different approach
        try {
          // For email verification, we need the email address
          // Let's try a different approach - check if user is already verified
          const { data: userData, error: userError } = await supabase.auth.getUser()
          
          if (userData.user?.email_confirmed_at) {
            setStatus('success')
            setMessage('Your email has already been verified!')
            toast.success('Email already verified!')
            setTimeout(() => {
              router.push('/vault')
            }, 2000)
            return
          } else {
            // If user exists but not verified, the token might be expired
            setStatus('error')
            setMessage('Verification link has expired. Please try signing up again.')
            toast.error('Verification link expired')
            return
          }
        } catch (err2) {
          
          // Method 3: Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshData.session?.user?.email_confirmed_at) {
            setStatus('success')
            setMessage('Your email has been successfully verified!')
            toast.success('Email verified successfully!')
            setTimeout(() => {
              router.push('/vault')
            }, 2000)
            return
          } else {
            verificationError = refreshError || new Error('Verification failed')
          }
        }
      }

      if (verificationError) {
        setStatus('error')
        setMessage(verificationError.message || 'Verification failed')
        toast.error('Verification failed')
      } else {
        setStatus('success')
        setMessage('Your email has been successfully verified!')
        toast.success('Email verified successfully!')
        
        // Auto login after successful verification
        setTimeout(() => {
          router.push('/vault')
        }, 2000)
      }
    } catch (error) {
      setStatus('error')
      setMessage('An unexpected error occurred during verification')
      toast.error('Verification failed')
    }
  }

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token')
      const type = searchParams.get('type')


      if (!token) {
        setStatus('error')
        setMessage('Invalid verification link')
        toast.error('Invalid verification link')
        return
      }

      // If we have a token, process the verification
      if (type === 'signup') {
        await processVerification(token)
        return
      }

      // This code is no longer needed since we handle verification above
    }

    verifyEmail()
  }, [searchParams, processVerification])

  // const handleContinue = () => {
  //   router.push('/login')
  // }

  const handleRetry = () => {
    router.push('/signup')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-16 w-16 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription className="mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your account is now active. You will be automatically logged in...
              </p>
              <div className="flex justify-center relative">
                <LoaderThree />
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The verification link may be expired or invalid. Please try signing up again.
              </p>
              <div className="space-y-2">
                <Button onClick={handleRetry} className="w-full">
                  Try Again
                </Button>
                <Button 
                  onClick={() => router.push('/login')} 
                  variant="outline" 
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please wait while we verify your email address...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifying Email...</CardTitle>
            <CardDescription className="mt-2">
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
