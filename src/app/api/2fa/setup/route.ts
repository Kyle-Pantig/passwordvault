import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Setting up 2FA for user:', user.id)

    // Check if user already has a secret (for re-enabling)
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('two_factor_secret')
      .eq('user_id', user.id)
      .single()

    let secret
    if (existingProfile?.two_factor_secret) {
      console.log('Reusing existing 2FA secret')
      secret = {
        base32: existingProfile.two_factor_secret,
        otpauth_url: `otpauth://totp/Password%20Vault%20(${user.email})?secret=${existingProfile.two_factor_secret}&issuer=Password%20Vault`
      }
    } else {
      console.log('Generating new 2FA secret')
      // Generate a new secret for TOTP
      secret = speakeasy.generateSecret({
        name: `Password Vault (${user.email})`,
        issuer: 'Password Vault',
        length: 32
      })
    }

    // Generate QR code
    console.log('Generating QR code...')
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)
    console.log('QR code generated successfully')

    // Store the secret temporarily (not enabled yet) - only if it's a new secret
    if (!existingProfile?.two_factor_secret) {
      console.log('Attempting to upsert user profile with new secret...')
      const { error: dbError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          two_factor_secret: secret.base32,
          two_factor_enabled: false,
          two_factor_backup_codes: null
        }, {
          onConflict: 'user_id'
        })

      if (dbError) {
        console.error('Database error:', dbError)
        return NextResponse.json({ error: 'Failed to save 2FA setup: ' + dbError.message }, { status: 500 })
      }
      console.log('Successfully saved new 2FA setup')
    } else {
      console.log('Using existing secret, no database update needed')
    }

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
