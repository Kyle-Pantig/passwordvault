import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid verification code format' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find and validate the verification code
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
        if (decryptedCode === code) {
          validCode = verificationRecord
          break
        }
      } catch (error) {
        // Skip invalid encrypted codes
        console.error('Failed to decrypt verification code:', error)
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

    return NextResponse.json({ success: true, message: 'Email verification successful' })
  } catch (error) {
    console.error('Error in verify-email-code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
