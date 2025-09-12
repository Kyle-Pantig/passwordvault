import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import speakeasy from 'speakeasy'

export async function POST(request: NextRequest) {
  try {
    const { token, enable } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error in verify:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's 2FA secret
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('two_factor_secret, two_factor_enabled')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to get user profile: ' + profileError.message }, { status: 400 })
    }

    if (!profile?.two_factor_secret) {
      console.error('No 2FA secret found for user')
      return NextResponse.json({ 
        error: '2FA setup not found. Please go back and scan the QR code again.',
        success: false 
      }, { status: 400 })
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: profile.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds) of tolerance
    })

    if (!verified) {
      return NextResponse.json({ 
        error: 'Invalid verification code. Please check your authenticator app and try again.',
        success: false 
      }, { status: 400 })
    }

    // If enabling 2FA, update the profile
    if (enable) {
      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      )

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          two_factor_enabled: true,
          two_factor_backup_codes: backupCodes
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Failed to update profile:', updateError)
        return NextResponse.json({ 
          error: 'Failed to enable 2FA. Please try again.',
          success: false 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        backupCodes,
        message: '2FA enabled successfully'
      })
    }

    // Set a session flag to indicate successful 2FA verification
    const { error: sessionError } = await supabase.auth.updateUser({
      data: { two_factor_verified: true }
    })

    if (sessionError) {
      // Silently fail - verification still succeeded
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA verification error:', error)
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
