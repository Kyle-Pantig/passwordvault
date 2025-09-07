'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { toast } from 'sonner'
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
      console.log('Processing verification with token:', token)
      
      // Use the correct Supabase verification method
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      })

      if (error) {
        console.error('Verification error:', error)
        setStatus('error')
        setMessage(error.message)
      } else {
        console.log('Verification successful:', data)
        setStatus('success')
        setMessage('Your email has been successfully verified!')
        
        // Auto login after successful verification
        setTimeout(() => {
          router.push('/')
        }, 2000) // Show success message for 2 seconds then redirect
      }
    } catch (error) {
      console.error('Verification catch error:', error)
      setStatus('error')
      setMessage('An unexpected error occurred during verification')
    }
  }

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token')
      const type = searchParams.get('type')

      console.log('Verification page loaded with params:', { token, type })
      console.log('All search params:', Object.fromEntries(searchParams.entries()))

      if (!token) {
        console.log('No token found')
        setStatus('error')
        setMessage('Invalid verification link')
        return
      }

      // If we have a token, process the verification
      if (type === 'signup') {
        console.log('Signup verification detected, processing...')
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
