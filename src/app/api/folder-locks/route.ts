import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { encryptFolderLockData, generateSalt, validatePasscodeFormat } from '@/lib/folder-lock-encryption'
import { CreateFolderLockData } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateFolderLockData = await request.json()
    const { category_id, lock_type, passcode } = body

    // Validate input
    if (!category_id || !lock_type || !passcode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate passcode format
    if (!validatePasscodeFormat(passcode, lock_type)) {
      return NextResponse.json({ 
        error: `Invalid passcode format for ${lock_type}` 
      }, { status: 400 })
    }

    // Check if folder is shared with other users
    const { data: sharedAccess } = await supabase
      .from('shared_folder_access')
      .select('id')
      .eq('folder_id', category_id)
      .neq('owner_id', user.id)

    if (sharedAccess && sharedAccess.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot lock folders that are shared with other users. Please revoke sharing access first.' 
      }, { status: 403 })
    }

    // Check if folder already has a lock
    const { data: existingLock } = await supabase
      .from('folder_locks')
      .select('id')
      .eq('user_id', user.id)
      .eq('category_id', category_id)
      .single()

    if (existingLock) {
      return NextResponse.json({ 
        error: 'Folder already has a lock' 
      }, { status: 409 })
    }

    // Generate salt and encrypt passcode
    const salt = generateSalt()
    const encryptedData = encryptFolderLockData(passcode, passcode, salt)

    // Create folder lock
    const { data: folderLock, error } = await supabase
      .from('folder_locks')
      .insert({
        user_id: user.id,
        category_id,
        lock_type,
        encrypted_lock_data: encryptedData,
        salt,
        is_locked: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating folder lock:', error)
      return NextResponse.json({ error: 'Failed to create folder lock' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      folderLock: {
        id: folderLock.id,
        category_id: folderLock.category_id,
        lock_type: folderLock.lock_type,
        is_locked: folderLock.is_locked,
        created_at: folderLock.created_at
      }
    })

  } catch (error) {
    console.error('Error in POST /api/folder-locks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create service client for database operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all folder locks for the user
    const { data: folderLocks, error } = await supabase
      .from('folder_locks')
      .select(`
        id,
        category_id,
        lock_type,
        is_locked,
        created_at,
        updated_at,
        failed_attempts,
        max_attempts,
        lockout_until
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching folder locks:', error)
      return NextResponse.json({ error: 'Failed to fetch folder locks' }, { status: 500 })
    }

    // Get shared folder locks
    const { data: sharedAccess, error: sharedError } = await serviceSupabase
      .from('shared_folder_access')
      .select(`
        folder_id,
        owner_id
      `)
      .eq('shared_with_user_id', user.id)

    let sharedFolderLocks: any[] = []
    if (sharedAccess && sharedAccess.length > 0) {
      const folderIds = sharedAccess.map(access => access.folder_id)
      const ownerIds = [...new Set(sharedAccess.map(access => access.owner_id))]

      // Get locks for shared folders
      const { data: sharedLocks, error: sharedLocksError } = await serviceSupabase
        .from('folder_locks')
        .select(`
          id,
          category_id,
          lock_type,
          is_locked,
          created_at,
          updated_at,
          failed_attempts,
          max_attempts,
          lockout_until
        `)
        .in('category_id', folderIds)
        .in('user_id', ownerIds)

      if (!sharedLocksError && sharedLocks) {
        // Map shared locks to use shared folder IDs
        sharedFolderLocks = sharedLocks.map(lock => ({
          ...lock,
          category_id: `shared-${lock.category_id}`,
          is_shared: true
        }))
      }
    }

    // Combine user's own locks with shared folder locks
    const allLocks = [...(folderLocks || []), ...sharedFolderLocks]

    return NextResponse.json({ folderLocks: allLocks })

  } catch (error) {
    console.error('Error in GET /api/folder-locks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
