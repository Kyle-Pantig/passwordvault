import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, delete all user's credentials
    const { error: deleteCredentialsError } = await supabase
      .from('credentials')
      .delete()
      .eq('user_id', user.id)

    if (deleteCredentialsError) {
      console.error('Error deleting credentials:', deleteCredentialsError)
      // Continue with account deletion even if credentials deletion fails
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'your_service_role_key_here') {
      console.error('Service role key not configured')
      return NextResponse.json({ 
        error: 'Service role key not configured. Please contact support.' 
      }, { status: 500 })
    }

    // Create admin client to delete the user account
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Delete the user account from Supabase Auth
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (deleteUserError) {
      console.error('Error deleting user account:', deleteUserError)
      return NextResponse.json({ 
        error: `Failed to delete user account: ${deleteUserError.message}` 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Account and all data deleted successfully.' 
    })

  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
