import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { backupCode } = await request.json()
    
    if (!backupCode) {
      return NextResponse.json({ error: 'Backup code is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's backup codes
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('two_factor_backup_codes')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.two_factor_backup_codes) {
      return NextResponse.json({ error: 'No backup codes found' }, { status: 400 })
    }

    // Check if backup code exists
    const backupCodes = profile.two_factor_backup_codes
    const codeIndex = backupCodes.indexOf(backupCode.toUpperCase())

    if (codeIndex === -1) {
      return NextResponse.json({ error: 'Invalid backup code' }, { status: 400 })
    }

    // Remove the used backup code
    const updatedCodes = backupCodes.filter((_: string, index: number) => index !== codeIndex)
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        two_factor_backup_codes: updatedCodes
      })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update backup codes' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Backup code verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
