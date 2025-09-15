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

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    // Verify folder ownership
    const { data: folder, error: folderError } = await supabase
      .from('categories')
      .select('id, name, user_id')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single()

    if (folderError || !folder) {
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 })
    }

    // Get pending invitations for this folder with optimized query
    const { data: invitations, error: invitationsError } = await serviceSupabase
      .from('folder_sharing_invitations')
      .select(`
        id,
        folder_id,
        invited_email,
        permission_level,
        status,
        expires_at,
        created_at
      `)
      .eq('folder_id', folderId)
      .eq('owner_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10) // Limit to prevent large queries

    if (invitationsError) {
      console.error('Error fetching pending invitations:', invitationsError)
      return NextResponse.json({ error: 'Failed to fetch pending invitations' }, { status: 500 })
    }

    const formattedInvitations = invitations?.map(invitation => ({
      id: invitation.id,
      folder_id: invitation.folder_id,
      invited_email: invitation.invited_email,
      permission_level: invitation.permission_level,
      status: invitation.status,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at
    })) || []

    return NextResponse.json({
      success: true,
      invitations: formattedInvitations
    })

  } catch (error) {
    console.error('Error fetching pending invitations:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined 
    }, { status: 500 })
  }
}
