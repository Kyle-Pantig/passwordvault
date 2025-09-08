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

    // Return empty settings since we removed single session and auto logout
    const settings = {}

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.',
      success: false
    }, { status: 500 })
  }
}

// UPDATE user settings - disabled since we removed single session and auto logout
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // No settings to update since we removed single session and auto logout
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
