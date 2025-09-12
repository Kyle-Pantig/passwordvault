import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { recaptchaToken } = await request.json()
    
    if (!recaptchaToken) {
      return NextResponse.json({
        success: false,
        error: 'reCAPTCHA token is required'
      }, { status: 400 })
    }

    if (!process.env.RECAPTCHA_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        error: 'reCAPTCHA not configured'
      }, { status: 500 })
    }

    // Verify reCAPTCHA v3 token
    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
      }),
    })

    const recaptchaResult = await recaptchaResponse.json()
    
    if (!recaptchaResult.success) {
      return NextResponse.json({
        success: false,
        error: 'reCAPTCHA verification failed. Please try again.'
      }, { status: 400 })
    }

    // Check score (0.0 to 1.0, where 1.0 is very likely a good interaction)
    const score = recaptchaResult.score || 0
    const minScore = 0.5 // Adjust this threshold as needed
    
    if (score < minScore) {
      return NextResponse.json({
        success: false,
        error: 'reCAPTCHA verification failed. Please try again.'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'reCAPTCHA verified successfully',
      score: score
    })

  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred during reCAPTCHA verification'
    }, { status: 500 })
  }
}
