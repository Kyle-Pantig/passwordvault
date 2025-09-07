import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user_profiles table exists and get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      profileError: profileError,
      tableExists: !profileError || profileError.code !== 'PGRST116'
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}
