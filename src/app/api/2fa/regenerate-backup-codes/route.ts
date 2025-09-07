import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has 2FA enabled
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.two_factor_enabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    )

    // Update the backup codes
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        two_factor_backup_codes: backupCodes
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to regenerate backup codes:', updateError)
      return NextResponse.json({ 
        error: 'Failed to regenerate backup codes. Please try again.',
        success: false 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      backupCodes,
      message: 'Backup codes regenerated successfully'
    })
  } catch (error) {
    console.error('Backup code regeneration error:', error)
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
