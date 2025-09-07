import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No active session' }, { status: 400 })
    }

    // Store current session info in a custom table for tracking
    const { error: upsertError } = await supabase
      .from('user_sessions')
      .upsert({
        user_id: user.id,
        session_id: session.access_token,
        device_info: request.headers.get('user-agent') || 'Unknown',
        last_seen: new Date().toISOString(),
        is_active: true
      })

    if (upsertError) {
      console.error('Error storing session info:', upsertError)
    }

    // Get all other active sessions for this user
    const { data: otherSessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .neq('session_id', session.access_token)

    if (sessionsError) {
      console.error('Error fetching other sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Mark other sessions as inactive
    if (otherSessions && otherSessions.length > 0) {
      const sessionIds = otherSessions.map(s => s.session_id)
      
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .in('session_id', sessionIds)

      if (updateError) {
        console.error('Error updating other sessions:', updateError)
      }

      // Try to revoke other sessions using Supabase admin (if available)
      try {
        for (const otherSession of otherSessions) {
          // Note: This requires service role key and might not work in all setups
          // The main enforcement is through the database flag
          await supabase.auth.admin.signOut(otherSession.session_id)
        }
      } catch (adminError) {
        console.log('Admin signOut not available, using database enforcement only')
      }
    }

    return NextResponse.json({ 
      success: true, 
      revokedSessions: otherSessions?.length || 0,
      message: `Revoked ${otherSessions?.length || 0} other active sessions`
    })
  } catch (error) {
    console.error('Single session enforcement error:', error)
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.',
      success: false
    }, { status: 500 })
  }
}
