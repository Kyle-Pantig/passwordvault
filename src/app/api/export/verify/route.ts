import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import speakeasy from 'speakeasy'

export async function POST(request: NextRequest) {
  try {
    const { code, verificationType } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's 2FA information
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('two_factor_secret, two_factor_backup_codes, two_factor_enabled')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.two_factor_enabled) {
      return NextResponse.json({ error: '2FA not enabled. Please enable 2FA to export credentials.' }, { status: 400 })
    }

    let isValidVerification = false
    let warning = null

    if (verificationType === 'totp' || !verificationType) {
      // Try TOTP verification first
      if (profile.two_factor_secret) {
        const totpVerified = speakeasy.totp.verify({
          secret: profile.two_factor_secret,
          encoding: 'base32',
          token: code,
          window: 2 // Allow 2 time steps (60 seconds) of tolerance
        })

        if (totpVerified) {
          isValidVerification = true
        }
      }
    }

    // If TOTP failed or user chose backup code, try backup code
    if (!isValidVerification && (verificationType === 'backup' || !verificationType)) {
      if (profile.two_factor_backup_codes) {
        const backupCodes = profile.two_factor_backup_codes
        const codeIndex = backupCodes.indexOf(code.toUpperCase())

        if (codeIndex !== -1) {
          // Remove the used backup code
          const updatedCodes = backupCodes.filter((_: string, index: number) => index !== codeIndex)
          
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              two_factor_backup_codes: updatedCodes.length > 0 ? updatedCodes : null
            })
            .eq('user_id', user.id)

          if (updateError) {
            return NextResponse.json({ error: 'Failed to update backup codes' }, { status: 500 })
          }

          isValidVerification = true

          // Check if this was the last backup code
          if (updatedCodes.length === 0) {
            warning = 'This was your last backup code. Please generate new backup codes in settings.'
          } else if (updatedCodes.length <= 2) {
            warning = `Only ${updatedCodes.length} backup codes remaining. Consider generating new ones.`
          }
        }
      }
    }

    if (!isValidVerification) {
      return NextResponse.json({ 
        error: 'Invalid verification code. Please check your authenticator app or backup code.',
        success: false 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      warning 
    })

  } catch (error) {
    console.error('Export verification error:', error)
    return NextResponse.json({ 
      error: 'Failed to verify code',
      success: false 
    }, { status: 500 })
  }
}
