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

    // Extract device info from request
    const userAgent = request.headers.get('user-agent') || ''
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Extract session_id from the JWT token
    const sessionId = session.access_token.split('.')[1]
    const decodedToken = JSON.parse(atob(sessionId))
    const sessionIdFromToken = decodedToken.session_id

    console.log('🔍 Registering session:', {
      userId: user.id,
      sessionId: sessionIdFromToken,
      deviceInfo: userAgent.substring(0, 50) + '...',
      ipAddress
    })

    // Check if this session already exists
    const { data: existingSession } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('session_id', sessionIdFromToken)
      .single()

    if (existingSession) {
      console.log('✅ Session already exists, skipping registration')
      return NextResponse.json({ success: true, message: 'Session already exists' })
    }

    // First, delete all existing sessions for this user
    const { error: deleteError } = await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting old sessions:', deleteError)
    }

    // Then insert the new session
    const { error: registerError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_id: sessionIdFromToken,
        device_info: userAgent,
        ip_address: ipAddress,
        expires_at: new Date(session.expires_at! * 1000).toISOString()
      })

    if (registerError) {
      console.error('Error registering session:', registerError)
      return NextResponse.json(
        { error: 'Failed to register session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
