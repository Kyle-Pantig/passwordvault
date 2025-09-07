import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has 2FA enabled
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled, two_factor_backup_codes')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.two_factor_enabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    // Return backup codes (if any exist)
    const backupCodes = profile.two_factor_backup_codes || []
    
    return NextResponse.json({ 
      success: true, 
      backupCodes,
      remainingCount: backupCodes.length,
      message: backupCodes.length > 0 
        ? `You have ${backupCodes.length} backup codes remaining`
        : 'No backup codes available. Generate new ones to continue.'
    })
  } catch (error) {
    console.error('Get backup codes error:', error)
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
