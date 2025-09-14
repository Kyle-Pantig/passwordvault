import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create service client for database operations that need to bypass RLS
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { folderId, userId, permissionLevel } = await request.json()

    if (!folderId || !userId || !permissionLevel) {
      return NextResponse.json({ error: 'Folder ID, User ID, and permission level are required' }, { status: 400 })
    }

    if (!['read', 'write'].includes(permissionLevel)) {
      return NextResponse.json({ error: 'Invalid permission level' }, { status: 400 })
    }

    // Verify that the current user is the owner of the folder
    const { data: folderAccess, error: folderError } = await serviceSupabase
      .from('shared_folder_access')
      .select('owner_id')
      .eq('folder_id', folderId)
      .eq('shared_with_user_id', userId)
      .single()

    if (folderError || !folderAccess) {
      return NextResponse.json({ error: 'Shared access not found' }, { status: 404 })
    }

    if (folderAccess.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the folder owner can update permissions' }, { status: 403 })
    }

    // Update the permission level in shared_folder_access
    const { error: updateAccessError } = await serviceSupabase
      .from('shared_folder_access')
      .update({ 
        permission_level: permissionLevel
      })
      .eq('folder_id', folderId)
      .eq('shared_with_user_id', userId)

    if (updateAccessError) {
      console.error('Error updating shared folder access:', updateAccessError)
      return NextResponse.json({ error: 'Failed to update folder access permission' }, { status: 500 })
    }

    // Update the permission level in shared_credentials for all credentials in this folder
    const { error: updateCredsError } = await serviceSupabase
      .from('shared_credentials')
      .update({ 
        permission_level: permissionLevel
      })
      .eq('folder_id', folderId)
      .eq('shared_with_user_id', userId)

    if (updateCredsError) {
      console.error('Error updating shared credentials:', updateCredsError)
      // Don't fail the entire request if credentials can't be updated
      console.warn('Failed to update shared credentials permissions, but folder access was updated')
    }

    return NextResponse.json({
      success: true,
      message: 'Permission updated successfully'
    })

  } catch (error) {
    console.error('Error updating permission:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined 
    }, { status: 500 })
  }
}
