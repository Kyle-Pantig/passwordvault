import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { safeDecrypt } from '@/lib/encryption'

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

    // Run all queries in parallel
    const [
      credentialsResult,
      categoriesResult,
      subscriptionResult,
      folderLocksResult,
      sharedFoldersResult,
      invitationsResult,
      twoFactorResult
    ] = await Promise.all([
      // Get credentials
      supabase
        .from('credentials')
        .select(`
          *,
          category:categories(id, name, color, icon)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      // Get categories
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      // Get subscription
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single(),

      // Get folder locks (optimized)
      getFolderLocksOptimized(supabase, serviceSupabase, user.id),

      // Get shared folders
      getSharedFoldersOptimized(serviceSupabase, user.id),

      // Get invitations
      supabase
        .from('folder_invitations')
        .select(`
          *,
          folder:categories(id, name, color, icon),
          inviter:profiles!folder_invitations_inviter_id_fkey(id, email, full_name)
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),

      // Get 2FA status
      supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', user.id)
        .single()
    ])

    // Handle errors
    if (credentialsResult.error) {
      console.error('Error fetching credentials:', credentialsResult.error)
    }
    if (categoriesResult.error) {
      console.error('Error fetching categories:', categoriesResult.error)
    }
    if (folderLocksResult.error) {
      console.error('Error fetching folder locks:', folderLocksResult.error)
    }

    return NextResponse.json({
      success: true,
      data: {
        credentials: decryptCredentials(credentialsResult.data || []),
        categories: categoriesResult.data || [],
        subscription: subscriptionResult.data,
        folderLocks: folderLocksResult.data || [],
        sharedFolders: sharedFoldersResult.data || [],
        invitations: invitationsResult.data || [],
        twoFactorEnabled: twoFactorResult.data?.two_factor_enabled || false
      }
    })

  } catch (error) {
    console.error('Error in vault-data API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Optimized folder locks function
async function getFolderLocksOptimized(supabase: any, serviceSupabase: any, userId: string) {
  try {
    // Get user's own folder locks
    const { data: userLocks, error: userLocksError } = await supabase
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (userLocksError) {
      return { data: [], error: userLocksError }
    }

    // Get shared folder access
    const { data: sharedAccess, error: sharedError } = await serviceSupabase
      .from('shared_folder_access')
      .select('folder_id, owner_id')
      .eq('shared_with_user_id', userId)

    let sharedFolderLocks: any[] = []
    if (sharedAccess && sharedAccess.length > 0) {
      const folderIds = sharedAccess.map((access: any) => access.folder_id)
      const ownerIds = [...new Set(sharedAccess.map((access: any) => access.owner_id))]

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
        sharedFolderLocks = sharedLocks.map((lock: any) => ({
          ...lock,
          category_id: `shared-${lock.category_id}`,
          is_shared: true
        }))
      }
    }

    return { data: [...(userLocks || []), ...sharedFolderLocks], error: null }
  } catch (error) {
    return { data: [], error }
  }
}

// Function to decrypt credentials
function decryptCredentials(credentials: any[]): any[] {
  return credentials.map(cred => {
    let decryptedPassword = cred.password
    let decryptedUsername = cred.username
    let decryptedCustomFields = cred.custom_fields || []
    
    // Only decrypt if the fields exist
    if (cred.password) {
      decryptedPassword = safeDecrypt(cred.password, '[Decryption Error - Please re-enter password]')
    }
    
    if (cred.username) {
      decryptedUsername = safeDecrypt(cred.username, '[Decryption Error - Please re-enter username]')
    }
    
    // Decrypt custom fields
    if (cred.custom_fields && Array.isArray(cred.custom_fields)) {
      decryptedCustomFields = cred.custom_fields.map((field: any) => {
        if (field.value) {
          return {
            ...field,
            value: safeDecrypt(field.value, '[Decryption Error]')
          }
        }
        return field
      })
    }
    
    return {
      ...cred,
      password: decryptedPassword,
      username: decryptedUsername,
      custom_fields: decryptedCustomFields
    }
  })
}

// Optimized shared folders function
async function getSharedFoldersOptimized(serviceSupabase: any, userId: string) {
  try {
    const { data: sharedFolders, error } = await serviceSupabase
      .from('shared_folder_access')
      .select(`
        folder_id,
        folder_name,
        folder_color,
        folder_icon,
        permission_level,
        shared_at,
        owner_email,
        credentials:folder_credentials(
          id,
          service_name,
          service_url,
          credential_type,
          username,
          password,
          custom_fields,
          notes,
          created_at,
          updated_at
        )
      `)
      .eq('shared_with_user_id', userId)
      .eq('status', 'accepted')

    if (error) {
      return { data: [], error }
    }

    return {
      data: sharedFolders?.map((folder: any) => ({
        id: `shared-${folder.folder_id}`,
        user_id: 'shared',
        name: folder.folder_name,
        color: folder.folder_color,
        icon: folder.folder_icon,
        created_at: folder.shared_at,
        updated_at: folder.shared_at,
        is_shared: true,
        shared_permission: folder.permission_level,
        original_folder_id: folder.folder_id,
        folder_id: folder.folder_id,
        credentials: decryptCredentials(folder.credentials || []),
        owner_email: folder.owner_email
      })) || [],
      error: null
    }
  } catch (error) {
    return { data: [], error }
  }
}
