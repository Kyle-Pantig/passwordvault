import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import speakeasy from 'speakeasy'

export async function POST(request: NextRequest) {
  try {
    const { verificationCode, verificationType, exportFormat } = await request.json()
    
    if (!verificationCode || !verificationType) {
      return NextResponse.json({ error: 'Verification code and type are required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's 2FA status and secret
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled, two_factor_secret, two_factor_backup_codes')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 })
    }

    let isValid = false

    if (verificationType === 'totp') {
      // Verify TOTP code
      if (!profile.two_factor_enabled || !profile.two_factor_secret) {
        return NextResponse.json({ error: '2FA not enabled' }, { status: 400 })
      }

      try {
        isValid = speakeasy.totp.verify({
          secret: profile.two_factor_secret,
          encoding: 'base32',
          token: verificationCode,
          window: 1
        })
      } catch (error) {
        return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 400 })
      }
    } else if (verificationType === 'backup') {
      // Verify backup code
      if (!profile.two_factor_enabled || !profile.two_factor_backup_codes) {
        return NextResponse.json({ error: '2FA not enabled or no backup codes available' }, { status: 400 })
      }

      const backupCodes = profile.two_factor_backup_codes
      const codeIndex = backupCodes.indexOf(verificationCode.toUpperCase())

      if (codeIndex === -1) {
        return NextResponse.json({ error: 'Invalid backup code' }, { status: 400 })
      }

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

      isValid = true
    } else if (verificationType === 'email') {
      // Verify email verification code
      const { data: verificationData, error: fetchError } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('purpose', 'backup_codes_verification')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (fetchError || !verificationData || verificationData.length === 0) {
        return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 })
      }

      // Check each stored code (decrypt and compare)
      let validCode: any = null
      for (const verificationRecord of verificationData) {
        try {
          const decryptedCode = decrypt(verificationRecord.code)
          if (decryptedCode === verificationCode) {
            validCode = verificationRecord
            break
          }
        } catch (error) {
          continue
        }
      }

      if (!validCode) {
        return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 })
      }

      // Delete the used verification code
      await supabase
        .from('email_verification_codes')
        .delete()
        .eq('id', validCode.id)

      isValid = true
    } else {
      return NextResponse.json({ error: 'Invalid verification type' }, { status: 400 })
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Check if the export format requires additional verification
    const protectedFormats = ['encrypted', 'password-protected-zip', 'encrypted-csv']
    const requiresFormatVerification = exportFormat && protectedFormats.includes(exportFormat)

    return NextResponse.json({ 
      success: true, 
      message: 'Verification successful',
      requiresFormatVerification,
      exportFormat
    })
  } catch (error) {
    console.error('Error in verify-locked-folders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
