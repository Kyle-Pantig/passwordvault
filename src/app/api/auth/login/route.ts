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
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
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
