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

    console.log('🔍 API: Validating session', {
      userId: user.id,
      sessionId: sessionIdFromToken
    })

    // Check if this session exists in our database
    const { data: sessionExists, error: checkError } = await supabase
      .from('user_sessions')
      .select('id, last_activity')
      .eq('user_id', user.id)
      .eq('session_id', sessionIdFromToken)
      .single()

    if (checkError || !sessionExists) {
      console.log('❌ API: Session not found in database')
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Session terminated - another session is active' },
        { status: 401 }
      )
    }

    // Check if this is the most recent session
    const { data: mostRecentSession, error: recentError } = await supabase
      .from('user_sessions')
      .select('session_id')
      .eq('user_id', user.id)
      .order('last_activity', { ascending: false })
      .limit(1)
      .single()

    if (recentError) {
      console.error('Error getting most recent session:', recentError)
      return NextResponse.json(
        { error: 'Failed to validate session' },
        { status: 500 }
      )
    }

    if (mostRecentSession && mostRecentSession.session_id !== sessionIdFromToken) {
      console.log('❌ API: Session is not the most recent - terminating')
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Session terminated - another session is active' },
        { status: 401 }
      )
    }

    console.log('✅ API: Session is valid and most recent')

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
