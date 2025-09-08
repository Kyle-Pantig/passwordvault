import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, formatRateLimitMessage } from '@/lib/rate-limiting'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access (you might want to add proper admin authentication)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Get current rate limiting statistics
    const { data: ipStats, error: ipError } = await supabase
      .from('login_attempts_ip')
      .select('*')
      .order('last_attempt', { ascending: false })
      .limit(100)
    
    const { data: emailStats, error: emailError } = await supabase
      .from('login_attempts_email')
      .select('*')
      .order('last_attempt', { ascending: false })
      .limit(100)
    
    if (ipError || emailError) {
      console.error('Error fetching rate limit stats:', ipError || emailError)
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ipAttempts: ipStats,
        emailAttempts: emailStats,
        summary: {
          totalIPAttempts: ipStats?.length || 0,
          totalEmailAttempts: emailStats?.length || 0,
          lockedIPs: ipStats?.filter(attempt => attempt.is_locked).length || 0,
          lockedEmails: emailStats?.filter(attempt => attempt.is_locked).length || 0
        }
      }
    })

  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check rate limiting for the specific email
    const rateLimitCheck = await checkRateLimit('127.0.0.1', email)
    
    if (rateLimitCheck.isBlocked) {
      const message = formatRateLimitMessage(rateLimitCheck)
      return NextResponse.json({
        isBlocked: true,
        error: message,
        lockoutUntil: rateLimitCheck.ipLimited.lockoutUntil || rateLimitCheck.emailLimited.lockoutUntil
      })
    }

    return NextResponse.json({
      isBlocked: false,
      message: 'No rate limiting active'
    })

  } catch (error) {
    console.error('Rate limit check error:', error)
    return NextResponse.json(
      { error: 'Failed to check rate limit status' },
      { status: 500 }
    )
  }
}
