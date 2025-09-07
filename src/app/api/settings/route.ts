import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET user settings
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user settings from user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('single_session_enabled, auto_logout_enabled')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user settings:', profileError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Return settings with defaults if no profile exists
    const settings = {
      singleSessionEnabled: profile?.single_session_enabled ?? false,
      autoLogoutEnabled: profile?.auto_logout_enabled ?? true
    }

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.',
      success: false
    }, { status: 500 })
  }
}

// UPDATE user settings
export async function PUT(request: NextRequest) {
  try {
    const { singleSessionEnabled, autoLogoutEnabled } = await request.json()
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update or insert user settings
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        single_session_enabled: singleSessionEnabled,
        auto_logout_enabled: autoLogoutEnabled,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (updateError) {
      console.error('Error updating settings:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Settings updated successfully' 
    })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.',
      success: false
    }, { status: 500 })
  }
}
