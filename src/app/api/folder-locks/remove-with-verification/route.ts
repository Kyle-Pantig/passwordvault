import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category_id, passcode } = await request.json()

    if (!category_id || !passcode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // First, verify the passcode by attempting to unlock
    const verifyResponse = await fetch(`${request.nextUrl.origin}/api/folder-locks/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        category_id,
        passcode
      })
    })

    if (!verifyResponse.ok) {
      const verifyData = await verifyResponse.json()
      return NextResponse.json({ 
        error: verifyData.error || 'Invalid passcode',
        lockout_until: verifyData.lockout_until,
        remaining_attempts: verifyData.remaining_attempts
      }, { status: verifyResponse.status })
    }

    // If verification successful, get the folder lock and remove it
    const { data: folderLocks, error: fetchError } = await supabase
      .from('folder_locks')
      .select('*')
      .eq('category_id', category_id)
      .eq('user_id', user.id)

    if (fetchError) {
      console.error('Error fetching folder lock:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch folder lock' }, { status: 500 })
    }

    if (!folderLocks || folderLocks.length === 0) {
      return NextResponse.json({ error: 'Folder lock not found' }, { status: 404 })
    }

    const folderLock = folderLocks[0]

    // Delete the folder lock
    const { error: deleteError } = await supabase
      .from('folder_locks')
      .delete()
      .eq('id', folderLock.id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting folder lock:', deleteError)
      return NextResponse.json({ error: 'Failed to remove folder lock' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Folder lock removed successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/folder-locks/remove-with-verification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
