import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import speakeasy from 'speakeasy'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category_id, recovery_method, recovery_data } = await request.json()

    if (!category_id || !recovery_method || !recovery_data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get folder lock
    const { data: folderLock, error: fetchError } = await supabase
      .from('folder_locks')
      .select('*')
      .eq('user_id', user.id)
      .eq('category_id', category_id)
      .single()

    if (fetchError || !folderLock) {
      return NextResponse.json({ error: 'Folder lock not found' }, { status: 404 })
    }

    let isValidRecovery = false

    if (recovery_method === '2fa') {
      // Verify 2FA - could be backup code or TOTP code
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('two_factor_backup_codes, two_factor_enabled, two_factor_secret')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile?.two_factor_enabled) {
        return NextResponse.json({ error: '2FA not enabled' }, { status: 400 })
      }

      // First try TOTP verification (authenticator code)
      if (profile.two_factor_secret) {
        const totpVerified = speakeasy.totp.verify({
          secret: profile.two_factor_secret,
          encoding: 'base32',
          token: recovery_data,
          window: 2 // Allow 2 time steps (60 seconds) of tolerance
        })

        if (totpVerified) {
          isValidRecovery = true
        }
      }

      // If TOTP failed and backup codes exist, try backup code
      if (!isValidRecovery && profile.two_factor_backup_codes) {
        const backupCodes = profile.two_factor_backup_codes
        const codeIndex = backupCodes.indexOf(recovery_data.toUpperCase())

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

          isValidRecovery = true
        }
      }

      if (!isValidRecovery) {
        return NextResponse.json({ error: 'Invalid 2FA code. Please check your authenticator app or backup code.' }, { status: 400 })
      }

    } else if (recovery_method === 'email') {
      // Verify email verification code
      const { data: verificationData, error: fetchError } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('purpose', 'folder_lock_recovery')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (fetchError || !verificationData || verificationData.length === 0) {
        return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 })
      }

      // Check each stored code (decrypt and compare)
      let validCode: any = null
      for (const verificationRecord of verificationData) {
        try {
          const { decrypt } = await import('@/lib/encryption')
          const decryptedCode = decrypt(verificationRecord.code)
          if (decryptedCode === recovery_data) {
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

      isValidRecovery = true
    }

    if (!isValidRecovery) {
      return NextResponse.json({ error: 'Invalid recovery method' }, { status: 400 })
    }

    // If recovery is valid, remove the folder lock
    const { error: deleteError } = await supabase
      .from('folder_locks')
      .delete()
      .eq('id', folderLock.id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to remove folder lock' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Folder lock removed successfully via recovery' 
    })

  } catch (error) {
    console.error('Folder lock recovery error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
