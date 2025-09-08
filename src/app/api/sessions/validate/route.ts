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

    // Check if this is the most recent session by comparing timestamps
    const { data: allSessions, error: recentError } = await supabase
      .from('user_sessions')
      .select('session_id, last_activity, created_at')
      .eq('user_id', user.id)
      .order('last_activity', { ascending: false })

    if (recentError) {
      console.error('Error getting sessions:', recentError)
      return NextResponse.json(
        { error: 'Failed to validate session' },
        { status: 500 }
      )
    }

    if (allSessions && allSessions.length > 1) {
      // Find the current session in the list
      const currentSession = allSessions.find(s => s.session_id === sessionIdFromToken)
      const mostRecentSession = allSessions[0] // First one is most recent due to ordering
      
      console.log('🔍 API: Session comparison', {
        currentSessionId: sessionIdFromToken,
        currentLastActivity: currentSession?.last_activity,
        mostRecentSessionId: mostRecentSession?.session_id,
        mostRecentLastActivity: mostRecentSession?.last_activity,
        totalSessions: allSessions.length
      })

      if (currentSession && mostRecentSession && currentSession.session_id !== mostRecentSession.session_id) {
        // Only terminate if the current session is significantly older (more than 1 second)
        const currentTime = new Date(currentSession.last_activity).getTime()
        const mostRecentTime = new Date(mostRecentSession.last_activity).getTime()
        const timeDiff = mostRecentTime - currentTime

        if (timeDiff > 1000) { // More than 1 second difference
          console.log('❌ API: Session is significantly older - terminating')
          await supabase.auth.signOut()
          return NextResponse.json(
            { error: 'Session terminated - another session is active' },
            { status: 401 }
          )
        } else {
          console.log('✅ API: Sessions are too close in time - keeping both')
        }
      }
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
