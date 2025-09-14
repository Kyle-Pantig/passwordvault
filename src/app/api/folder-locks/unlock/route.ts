import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decryptFolderLockData, validatePasscodeFormat } from '@/lib/folder-lock-encryption'
import { UnlockFolderData } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UnlockFolderData = await request.json()
    const { category_id, passcode } = body

    // Validate input
    if (!category_id || !passcode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if this is a shared folder (starts with "shared-")
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

    // Get folder lock (either user's own lock or shared folder owner's lock)
    let folderLock, fetchError
    
    if (isSharedFolder) {
      // For shared folders, use service client to access owner's lock
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const result = await serviceSupabase
        .from('folder_locks')
        .select('*')
        .eq('user_id', folderOwnerId)
        .eq('category_id', actualCategoryId)
        .single()
      
      folderLock = result.data
      fetchError = result.error
    } else {
      // For regular folders, use regular client
      const result = await supabase
        .from('folder_locks')
        .select('*')
        .eq('user_id', folderOwnerId)
        .eq('category_id', actualCategoryId)
        .single()
      
      folderLock = result.data
      fetchError = result.error
    }

    if (fetchError || !folderLock) {
      return NextResponse.json({ error: 'Folder lock not found' }, { status: 404 })
    }

    // Check if locked out
    if (folderLock.lockout_until && new Date(folderLock.lockout_until) > new Date()) {
      const lockoutTime = new Date(folderLock.lockout_until)
      return NextResponse.json({ 
        error: `Folder locked until ${lockoutTime.toLocaleString()}`,
        lockout_until: folderLock.lockout_until
      }, { status: 423 })
    }

    // Validate passcode format
    if (!validatePasscodeFormat(passcode, folderLock.lock_type)) {
      return NextResponse.json({ 
        error: `Invalid passcode format for ${folderLock.lock_type}` 
      }, { status: 400 })
    }

    // Verify passcode
    let isValidPasscode = false
    try {
      const decryptedPasscode = decryptFolderLockData(
        folderLock.encrypted_lock_data, 
        passcode, 
        folderLock.salt
      )
      isValidPasscode = decryptedPasscode === passcode
    } catch (error) {
      // Invalid passcode - this is expected behavior
      isValidPasscode = false
    }

    const now = new Date()
    const failedAttempts = folderLock.failed_attempts + 1

    if (!isValidPasscode) {
      // Increment failed attempts
      const updateData: any = {
        failed_attempts: failedAttempts,
        last_unlock_attempt: now.toISOString()
      }

      // Lock out if max attempts reached
      if (failedAttempts >= folderLock.max_attempts) {
        const lockoutUntil = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes
        updateData.lockout_until = lockoutUntil.toISOString()
        updateData.failed_attempts = 0 // Reset failed attempts
      }

      await supabase
        .from('folder_locks')
        .update(updateData)
        .eq('id', folderLock.id)

      const remainingAttempts = folderLock.max_attempts - failedAttempts
      return NextResponse.json({ 
        error: `Invalid passcode. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining` : 'Folder locked for 15 minutes'}`,
        remaining_attempts: Math.max(0, remainingAttempts),
        lockout_until: updateData.lockout_until
      }, { status: 401 })
    }

    // Valid passcode - unlock folder
    if (isSharedFolder) {
      // For shared folders, we don't update the database lock status
      // The lock belongs to the owner, we just allow the shared user to access it
      return NextResponse.json({ 
        success: true, 
        message: 'Shared folder unlocked successfully',
        is_shared: true
      })
    } else {
      // For regular folders, update the lock status in the database
      const { error: updateError } = await supabase
        .from('folder_locks')
        .update({
          is_locked: false,
          failed_attempts: 0,
          lockout_until: null,
          last_unlock_attempt: now.toISOString()
        })
        .eq('id', folderLock.id)

      if (updateError) {
        console.error('Error updating folder lock:', updateError)
        return NextResponse.json({ error: 'Failed to unlock folder' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Folder unlocked successfully' 
      })
    }

  } catch (error) {
    console.error('Error in POST /api/folder-locks/unlock:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
