import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { encrypt } from '@/lib/encryption'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category_id } = await request.json()

    if (!category_id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    // Verify the folder lock exists
    const { data: folderLock, error: fetchError } = await supabase
      .from('folder_locks')
      .select('*')
      .eq('user_id', user.id)
      .eq('category_id', category_id)
      .single()

    if (fetchError || !folderLock) {
      return NextResponse.json({ error: 'Folder lock not found' }, { status: 404 })
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store the verification code in the database with expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    
    // Encrypt the verification code before storing
    const encryptedCode = encrypt(verificationCode)
    
    const { error: insertError } = await supabase
      .from('email_verification_codes')
      .insert({
        user_id: user.id,
        code: encryptedCode,
        expires_at: expiresAt.toISOString(),
        purpose: 'folder_lock_recovery'
      })

    if (insertError) {
      console.error('Error storing verification code:', insertError)
      return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 })
    }

    // Send email with verification code using Resend
    const { data, error } = await resend.emails.send({
      from: 'DigiVault <onboarding@resend.dev>',
      to: [user.email!],
      subject: 'DigiVault - Folder Lock Recovery Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; margin: 0;">🔐 DigiVault</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Secure Password Manager</p>
          </div>
          
          <h2 style="color: #1f2937;">Folder Lock Recovery</h2>
          
          <p>You requested to recover access to a locked folder. To proceed with removing the folder lock, please use the following verification code:</p>
          
          <div style="background-color: #f3f4f6; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 4px;">${verificationCode}</span>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> This code will expire in 10 minutes. If you didn't request this recovery, please secure your account immediately.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This verification code allows you to remove the folder lock and regain access to your credentials. 
            Keep this code secure and do not share it with anyone.
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
      console.error('Error sending recovery email:', error)
      return NextResponse.json({ error: 'Failed to send recovery email' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Recovery code sent to your email' 
    })
  } catch (error) {
    console.error('Error in send-recovery-email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
