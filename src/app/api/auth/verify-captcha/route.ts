import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { captchaToken } = await request.json()
    
    if (!captchaToken) {
      return NextResponse.json({
        success: false,
        error: 'Captcha token is required'
      }, { status: 400 })
    }

    // Verify hCaptcha token
    const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: process.env.HCAPTCHA_SECRET_KEY!,
        response: captchaToken,
      }),
    })

    const captchaResult = await captchaResponse.json()
    
    if (!captchaResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Captcha verification failed. Please try again.'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Captcha verified successfully'
    })

  } catch (error) {
    console.error('Captcha verification error:', error)
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred during captcha verification'
    }, { status: 500 })
  }
}
