import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create service client for admin operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get shared users for this folder
    const { data: sharedUsers, error: sharedUsersError } = await supabase
      .from('shared_folder_access')
      .select(`
        id,
        shared_with_user_id,
        permission_level,
        shared_at
      `)
      .eq('folder_id', folderId)
      .eq('owner_id', user.id)

    if (sharedUsersError) {
      return NextResponse.json({ error: 'Failed to fetch shared users' }, { status: 500 })
    }

    // Fetch user emails using service client
    const formattedUsers: Array<{
      id: string
      email: string
      permission_level: string
      shared_at: string
    }> = []
    if (sharedUsers && sharedUsers.length > 0) {
      // const userIds = sharedUsers.map(su => su.shared_with_user_id)
      
      try {
        // Get user emails from auth.users using service client
        const { data: usersData, error: usersError } = await serviceSupabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        })

        if (usersError) {
          throw usersError
        }

        // Create a map of user ID to email
        const userEmailMap = new Map()
        usersData?.users?.forEach(u => {
          userEmailMap.set(u.id, u.email)
        })

        // Format users with actual email addresses
        sharedUsers.forEach(sharedUser => {
          formattedUsers.push({
            id: sharedUser.shared_with_user_id,
            email: userEmailMap.get(sharedUser.shared_with_user_id) || `User ${sharedUser.shared_with_user_id.slice(0, 8)}`,
            permission_level: sharedUser.permission_level,
            shared_at: sharedUser.shared_at
          })
        })
      } catch (error) {
        // Fallback to user ID format
        sharedUsers.forEach(sharedUser => {
          formattedUsers.push({
            id: sharedUser.shared_with_user_id,
            email: `User ${sharedUser.shared_with_user_id.slice(0, 8)}`,
            permission_level: sharedUser.permission_level,
            shared_at: sharedUser.shared_at
          })
        })
      }
    }

    return NextResponse.json({
      success: true,
      users: formattedUsers
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined 
    }, { status: 500 })
  }
}
