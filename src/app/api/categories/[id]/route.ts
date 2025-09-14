import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { dbServer } from '@/lib/database-server'
import { UpdateCategoryData } from '@/lib/types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const categoryData: UpdateCategoryData = await request.json()

    // Check if this is a shared folder (starts with "shared-")
    if (id.startsWith('shared-')) {
      // Extract the original folder ID
      const originalFolderId = id.replace('shared-', '')
      
      // Create service client for database operations
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Check if user has write permission for this shared folder
      const { data: sharedAccess, error: accessError } = await serviceSupabase
        .from('shared_folder_access')
        .select('permission_level, owner_id')
        .eq('folder_id', originalFolderId)
        .eq('shared_with_user_id', user.id)
        .single()

      if (accessError || !sharedAccess) {
        return NextResponse.json({ error: 'Shared folder access not found' }, { status: 404 })
      }

      if (sharedAccess.permission_level !== 'write') {
        return NextResponse.json({ error: 'Write permission required to rename shared folders' }, { status: 403 })
      }

      // Update the original folder
      const { data: updatedCategory, error: updateError } = await serviceSupabase
        .from('categories')
        .update(categoryData)
        .eq('id', originalFolderId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating shared folder:', updateError)
        return NextResponse.json({ error: 'Failed to update shared folder' }, { status: 500 })
      }

      // Return the updated category with shared folder ID
      return NextResponse.json({
        ...updatedCategory,
        id: id, // Keep the shared folder ID for the UI
        is_shared: true
      })
    } else {
      // Regular folder update
      const category = await dbServer.updateCategory(id, categoryData)
      return NextResponse.json(category)
    }
  } catch (error) {
    console.error('Category update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    // Get query parameters for deletion options
    const { searchParams } = new URL(request.url)
    const moveCredentialsTo = searchParams.get('moveTo')
    const deleteCredentials = searchParams.get('deleteCredentials') === 'true'

    await dbServer.deleteCategory(id, moveCredentialsTo || undefined, deleteCredentials)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Category deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
