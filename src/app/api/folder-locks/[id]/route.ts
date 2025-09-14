import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Missing folder lock ID' }, { status: 400 })
    }

    // Delete the folder lock
    const { error } = await supabase
      .from('folder_locks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting folder lock:', error)
      return NextResponse.json({ error: 'Failed to delete folder lock' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Folder lock removed successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/folder-locks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
