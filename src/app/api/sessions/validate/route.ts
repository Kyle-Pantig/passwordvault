import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get session data
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 400 }
      )
    }

    // Extract session_id from the JWT token
    const sessionId = session.access_token.split('.')[1]
    const decodedToken = JSON.parse(atob(sessionId))
    const sessionIdFromToken = decodedToken.session_id

    // Validate the session
    const { data: isValid, error: validateError } = await supabase.rpc('validate_session', {
      p_user_id: user.id,
      p_session_id: sessionIdFromToken
    })

    if (validateError) {
      console.error('Error validating session:', validateError)
      return NextResponse.json(
        { error: 'Failed to validate session' },
        { status: 500 }
      )
    }

    if (!isValid) {
      // Session is not valid (expired or not most recent), sign out
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Session terminated - another session is active' },
        { status: 401 }
      )
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
