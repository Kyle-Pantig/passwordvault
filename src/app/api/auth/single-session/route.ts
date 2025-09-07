import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active sessions for this user
    const { data: sessions, error: sessionsError } = await supabase
      .from('auth.sessions')
      .select('*')
      .eq('user_id', user.id)

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Get current session ID from the request
    const currentSessionId = request.headers.get('x-session-id') || 
                           request.cookies.get('sb-access-token')?.value

    // Revoke all other sessions except the current one
    const sessionsToRevoke = sessions?.filter(session => 
      session.id !== currentSessionId && 
      new Date(session.expires_at) > new Date()
    ) || []

    // Revoke other sessions
    for (const session of sessionsToRevoke) {
      await supabase.auth.admin.signOut(session.id)
    }

    return NextResponse.json({ 
      success: true, 
      revokedSessions: sessionsToRevoke.length,
      message: `Revoked ${sessionsToRevoke.length} other active sessions`
    })
  } catch (error) {
    console.error('Single session enforcement error:', error)
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.',
      success: false
    }, { status: 500 })
  }
}
