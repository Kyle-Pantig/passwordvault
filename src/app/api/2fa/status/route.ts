import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's 2FA status
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to get 2FA status' }, { status: 500 })
    }

    return NextResponse.json({ 
      twoFactorEnabled: profile?.two_factor_enabled || false 
    })
  } catch (error) {
    console.error('2FA status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
