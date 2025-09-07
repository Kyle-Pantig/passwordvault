import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Disable 2FA (keep secret for potential re-enable)
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        two_factor_enabled: false,
        two_factor_backup_codes: null
        // Don't clear the secret - keep it for potential re-enable
      })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
