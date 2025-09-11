import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      .eq('code', code)
      .eq('purpose', 'backup_codes_verification')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !verificationData) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 })
    }

    // Delete the used verification code
    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('id', verificationData.id)

    return NextResponse.json({ success: true, message: 'Email verification successful' })
  } catch (error) {
    console.error('Error in verify-email-code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
