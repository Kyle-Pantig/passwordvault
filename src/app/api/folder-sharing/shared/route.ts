import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    // Get shared folders for the user - first get the access records
    let accessQuery = serviceSupabase
      .from('shared_folder_access')
      .select(`
        folder_id,
        permission_level,
        shared_at,
        owner_id,
        owner_email
      `)
      .eq('shared_with_user_id', user.id)

    // If folderId is provided, filter by specific folder
    if (folderId) {
      accessQuery = accessQuery.eq('folder_id', folderId)
    }

    const { data: sharedFolders, error: sharedError } = await accessQuery

    if (sharedError) {
      console.error('Error fetching shared folders:', sharedError)
      return NextResponse.json({ 
        error: 'Failed to fetch shared folders',
        details: sharedError.message 
      }, { status: 500 })
    }

    // Get categories for all shared folders
    const folderIds = (sharedFolders || []).map((access: any) => access.folder_id)
    let categoriesData: any[] = []
    
    if (folderIds.length > 0) {
      const { data: categories, error: categoriesError } = await serviceSupabase
        .from('categories')
        .select('id, name, color, icon')
        .in('id', folderIds)
      
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError)
        // Don't fail the entire request if categories can't be fetched
        // Just log the error and continue with empty categories
      } else {
        categoriesData = (categories || []) as any[]
      }
    }

    // Create a map of folder_id to category data
    const categoryMap = new Map<string, any>()
    categoriesData.forEach((category: any) => {
      categoryMap.set(category.id, category)
    })

    // Format the shared folders data
    const formattedSharedFolders = (sharedFolders || []).map((access: any) => {
      const category = categoryMap.get(access.folder_id)
      
      return {
        folder_id: access.folder_id,
        folder_name: category?.name || 'Unknown Folder',
        folder_color: category?.color || '#3b82f6',
        folder_icon: category?.icon || 'folder',
        owner_id: access.owner_id,
        owner_email: access.owner_email || `User ${access.owner_id.slice(0, 8)}`, // Use stored email or fallback
        permission_level: access.permission_level,
        shared_at: access.shared_at
      }
    })

    // Get shared credentials for each folder
    const sharedFoldersWithCredentials = await Promise.all(
      formattedSharedFolders.map(async (folder: any) => {
        const { data: credentials, error: credError } = await serviceSupabase
          .from('shared_credentials')
          .select(`
            credential_id,
            permission_level,
            credentials (
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
          .eq('folder_id', folder.folder_id)
          .eq('shared_with_user_id', user.id)

        if (credError) {
          console.error('Error fetching shared credentials:', credError)
          return { ...folder, credentials: [] }
        }

        const mappedCredentials = credentials?.map((sc: any) => {
          const mappedCred = {
            ...sc.credentials,
            category_id: folder.folder_id, // Set category_id to the shared folder ID
            is_shared: true,
            shared_permission: sc.permission_level // Use permission level from shared_credentials table
          }
          return mappedCred
        }) || []

        return {
          ...folder,
          credentials: mappedCredentials
        }
      })
    )

    return NextResponse.json({
      success: true,
      sharedFolders: sharedFoldersWithCredentials
    })

  } catch (error) {
    console.error('Error fetching shared folders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
