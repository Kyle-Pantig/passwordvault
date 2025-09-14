import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { dbServer } from '@/lib/database-server'

export async function GET(
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
    
    // Handle shared folder ID conversion
    let actualCategoryId = id
    
    if (id.startsWith('shared-')) {
      actualCategoryId = id.replace('shared-', '')
      
      // Create service client for database operations
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Check if user has access to this shared folder
      const { data: sharedAccess, error: accessError } = await serviceSupabase
        .from('shared_folder_access')
        .select('owner_id, permission_level')
        .eq('folder_id', actualCategoryId)
        .eq('shared_with_user_id', user.id)
        .single()

      if (accessError || !sharedAccess) {
        return NextResponse.json({ error: 'Shared folder access not found' }, { status: 404 })
      }
    }
    
    const credentials = await dbServer.getCredentialsInCategory(actualCategoryId)
    return NextResponse.json(credentials)
  } catch (error) {
    console.error('Get credentials in category error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
