import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  console.log('🚀 Middleware running for:', request.nextUrl.pathname)
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Refresh the session to ensure it's up to date
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is authenticated, validate single session
  if (user) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      try {
        // Extract session_id from the JWT token
        const sessionId = session.access_token.split('.')[1]
        const decodedToken = JSON.parse(atob(sessionId))
        const sessionIdFromToken = decodedToken.session_id

        console.log('🔍 Middleware: Validating session', {
          userId: user.id,
          sessionId: sessionIdFromToken,
          path: request.nextUrl.pathname
        })

        // Check if this session exists in our database
        const { data: sessionExists, error: checkError } = await supabase
          .from('user_sessions')
          .select('id, last_activity')
          .eq('user_id', user.id)
          .eq('session_id', sessionIdFromToken)
          .single()

        if (checkError || !sessionExists) {
          console.log('🚫 Middleware: Session not found in database - terminating')
          // Session not in our database, sign out
          await supabase.auth.signOut()
          const url = request.nextUrl.clone()
          url.pathname = '/login'
          url.searchParams.set('error', 'session_terminated')
          return NextResponse.redirect(url)
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
        } else if (mostRecentSession && mostRecentSession.session_id !== sessionIdFromToken) {
          console.log('🚫 Middleware: Session is not the most recent - terminating')
          // This is not the most recent session, sign out
          await supabase.auth.signOut()
          const url = request.nextUrl.clone()
          url.pathname = '/login'
          url.searchParams.set('error', 'session_terminated')
          return NextResponse.redirect(url)
        }

        console.log('✅ Middleware: Session is valid and most recent')

      } catch (error) {
        console.error('Error validating session:', error)
        // If validation fails, continue with the request to avoid breaking the app
      }
    }
  }

  // If user is authenticated and trying to access auth pages, redirect to vault
  if (user && (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/verify') ||
    request.nextUrl.pathname.startsWith('/verify-2fa')
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Specific check for security page
  if (request.nextUrl.pathname === '/security' && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If no user and trying to access protected pages, redirect to login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/verify') &&
    !request.nextUrl.pathname.startsWith('/verify-2fa') &&
    !request.nextUrl.pathname.startsWith('/forgot-password') &&
    !request.nextUrl.pathname.startsWith('/reset-password') &&
    !request.nextUrl.pathname.startsWith('/setup-2fa') &&
    !request.nextUrl.pathname.startsWith('/privacy') &&
    !request.nextUrl.pathname.startsWith('/terms') &&
    !request.nextUrl.pathname.startsWith('/help')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
