import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  getClientIP, 
  checkRateLimit, 
  recordFailedAttempt, 
  resetLoginAttempts,
  formatRateLimitMessage,
  getRemainingAttemptsMessage
} from '@/lib/rate-limiting'

export async function POST(request: NextRequest) {
  try {
    const { email, password, recaptchaToken } = await request.json()
    
    console.log('Login attempt:', { email, hasPassword: !!password, hasRecaptchaToken: !!recaptchaToken })
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Verify reCAPTCHA v3 if token is provided and secret key is configured
    // Temporarily disabled due to browser-error
    if (false && recaptchaToken && process.env.RECAPTCHA_SECRET_KEY) {
      const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY!,
          response: recaptchaToken,
        }),
      })

      const recaptchaResult = await recaptchaResponse.json()
      console.log('reCAPTCHA result:', recaptchaResult)
      
      if (!recaptchaResult.success) {
        console.log('reCAPTCHA failed:', recaptchaResult['error-codes'])
        return NextResponse.json({
          success: false,
          error: 'reCAPTCHA verification failed. Please try again.'
        }, { status: 400 })
      }

      // Check score (0.0 to 1.0, where 1.0 is very likely a good interaction)
      const score = recaptchaResult.score || 0
      const minScore = 0.5 // Adjust this threshold as needed
      
      if (score < minScore) {
        console.log('reCAPTCHA score too low:', score, 'min:', minScore)
        return NextResponse.json({
          success: false,
          error: 'reCAPTCHA verification failed. Please try again.'
        }, { status: 400 })
      }
    }

    // Get client IP for rate limiting
    const clientIP = getClientIP(request)
    
    // Check rate limiting before attempting login
    const rateLimitCheck = await checkRateLimit(clientIP, email)
    
    // If there's a progressive delay, wait for it
    if (rateLimitCheck.maxDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, rateLimitCheck.maxDelayMs))
    }

    // Attempt login with Supabase
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Record failed attempt (this will increment the attempt count)
      await recordFailedAttempt(clientIP, email)
      
      // Check rate limiting again after failed attempt
      const newRateLimitCheck = await checkRateLimit(clientIP, email)
      
      let errorMessage = error.message
      if (newRateLimitCheck.isBlocked) {
        errorMessage = formatRateLimitMessage(newRateLimitCheck)
        return NextResponse.json({
          success: false,
          error: errorMessage,
          rateLimited: true,
          lockoutUntil: newRateLimitCheck.ipLimited.lockoutUntil || newRateLimitCheck.emailLimited.lockoutUntil
        }, { status: 429 })
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        rateLimited: false
      }, { status: 401 })
    }

    // Check if email is verified
    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut()
      return NextResponse.json({
        success: false,
        error: 'Please verify your email before signing in. Check your inbox for a verification link.'
      }, { status: 400 })
    }

    // Reset login attempts on successful login
    await resetLoginAttempts(clientIP, email)

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred' 
      },
      { status: 500 }
    )
  }
}
