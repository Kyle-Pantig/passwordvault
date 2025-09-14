import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category_id } = await request.json()

    if (!category_id) {
      return NextResponse.json({ error: 'Missing category_id' }, { status: 400 })
    }

    // Handle shared folder ID conversion
    let actualCategoryId = category_id
    let isSharedFolder = false
    let folderOwnerId = user.id

    if (category_id.startsWith('shared-')) {
      actualCategoryId = category_id.replace('shared-', '')
      isSharedFolder = true
      
      // Create service client for database operations
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Check if user has access to this shared folder and get owner ID
      const { data: sharedAccess, error: accessError } = await serviceSupabase
        .from('shared_folder_access')
        .select('owner_id')
        .eq('folder_id', actualCategoryId)
        .eq('shared_with_user_id', user.id)
        .single()

      if (accessError || !sharedAccess) {
        return NextResponse.json({ error: 'Shared folder access not found' }, { status: 404 })
      }

      folderOwnerId = sharedAccess.owner_id
    }

    // Check if folder is shared with other users (only for regular folders)
    if (!isSharedFolder) {
      const { data: sharedAccess } = await supabase
        .from('shared_folder_access')
        .select('id')
        .eq('folder_id', actualCategoryId)
        .neq('owner_id', user.id)

      if (sharedAccess && sharedAccess.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot lock folders that are shared with other users. Please revoke sharing access first.' 
        }, { status: 403 })
      }
    }

    // Lock the folder
    const { error } = await supabase
      .from('folder_locks')
      .update({ is_locked: true })
      .eq('user_id', folderOwnerId)
      .eq('category_id', actualCategoryId)

    if (error) {
      console.error('Error locking folder:', error)
      return NextResponse.json({ error: 'Failed to lock folder' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Folder locked successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/folder-locks/lock:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
