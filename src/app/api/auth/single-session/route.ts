import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Single session API called')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('Auth check result:', { user: user?.id, error: authError?.message })

    if (authError || !user) {
      console.log('Single session API: Unauthorized', { 
        error: authError?.message, 
        userExists: !!user,
        errorCode: authError?.status 
      })
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message || 'No user found',
        errorCode: authError?.status 
      }, { status: 401 })
    }

    console.log('Single session API: User authenticated', user.id)

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No active session' }, { status: 400 })
    }

    // Store current session info in a custom table for tracking
    // Use session.access_token as the unique identifier
    let sessionStored = false
    try {
      const { error: upsertError } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: user.id,
          session_id: session.access_token,
          device_info: request.headers.get('user-agent') || 'Unknown',
          last_seen: new Date().toISOString(),
          is_active: true
        }, {
          onConflict: 'session_id' // Update if session_id already exists
        })

      if (upsertError) {
        console.error('Error storing session info:', upsertError)
        console.log('This might be due to missing user_sessions table or RLS policies')
        // Don't fail the request if we can't store session info
      } else {
        console.log('Session info stored successfully')
        sessionStored = true
      }
    } catch (dbError) {
      console.error('Database error storing session:', dbError)
      console.log('This might be due to missing user_sessions table or RLS policies')
      // Continue even if database operations fail
    }

    // Get all other active sessions for this user (only if we successfully stored session)
    let otherSessions = []
    if (sessionStored) {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .neq('session_id', session.access_token)

      if (sessionsError) {
        console.error('Error fetching other sessions:', sessionsError)
        console.log('Continuing without session enforcement due to database error')
      } else {
        otherSessions = sessionsData || []
      }

      // Mark other sessions as inactive
      if (otherSessions.length > 0) {
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
    } else {
      console.log('Skipping session enforcement due to database issues')
    }

    // Clean up old inactive sessions (older than 1 hour) - only if database is working
    if (sessionStored) {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        await supabase
          .from('user_sessions')
          .delete()
          .eq('user_id', user.id)
          .eq('is_active', false)
          .lt('last_seen', oneHourAgo)
      } catch (cleanupError) {
        console.log('Session cleanup failed:', cleanupError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      revokedSessions: otherSessions?.length || 0,
      message: `Revoked ${otherSessions?.length || 0} other active sessions`,
      databaseWorking: sessionStored,
      warning: sessionStored ? null : 'Database operations failed - session enforcement may be limited'
    })
  } catch (error) {
    console.error('Single session enforcement error:', error)
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.',
      success: false
    }, { status: 500 })
  }
}
