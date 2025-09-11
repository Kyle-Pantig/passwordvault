import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store the verification code in the database with expiration (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
    
    const { error: insertError } = await supabase
      .from('email_verification_codes')
      .insert({
        user_id: user.id,
        code: verificationCode,
        expires_at: expiresAt.toISOString(),
        purpose: 'backup_codes_verification'
      })

    if (insertError) {
      console.error('Error storing verification code:', insertError)
      return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 })
    }

    // Send email with verification code using Resend
    const { data, error } = await resend.emails.send({
      from: 'DigiVault <onboarding@resend.dev>',
      to: [user.email!],
      subject: 'DigiVault - Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; margin: 0;">🔐 DigiVault</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Secure Password Manager</p>
          </div>
          
          <h2 style="color: #1f2937;">Email Verification Code</h2>
          
          <p>You requested to access your backup codes. To proceed, please use the following verification code:</p>
          
          <div style="background-color: #f3f4f6; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 4px;">${verificationCode}</span>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This code will expire in 5 minutes. If you didn't request this verification, you can safely ignore this email.
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} DigiVault. All rights reserved.
            </p>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('Error sending verification email:', error)
      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Verification code sent to your email' })
  } catch (error) {
    console.error('Error in send-verification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
