import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { emitToUser } from '@/lib/socket-emitter'

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

    // Get pending invitations for the user's email
    const { data: invitations, error: invitationsError } = await serviceSupabase
      .from('folder_sharing_invitations')
      .select(`
        id,
        folder_id,
        invited_email,
        permission_level,
        status,
        expires_at,
        created_at,
        owner_id,
        categories!inner (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('invited_email', user.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    // Get owner emails for all invitations
    const ownerIds = [...new Set(invitations?.map(inv => inv.owner_id) || [])]
    const ownerEmails = new Map<string, string>()
    
    if (ownerIds.length > 0) {
      try {
        // Get owner emails from auth.users table
        const { data: ownerUsers, error: ownerError } = await serviceSupabase.auth.admin.listUsers()
        if (!ownerError && ownerUsers?.users) {
          ownerUsers.users.forEach((owner: any) => {
            if (ownerIds.includes(owner.id)) {
              ownerEmails.set(owner.id, owner.email || `User ${owner.id.slice(0, 8)}`)
            }
          })
        }
      } catch (error) {
        console.warn('Could not fetch owner emails:', error)
      }
    }

    const formattedInvitations = invitations?.map(invitation => {
      // Handle categories as either array or single object
      const category = Array.isArray(invitation.categories) 
        ? invitation.categories[0] 
        : invitation.categories

      return {
        invitation_id: invitation.id,
        folder_id: invitation.folder_id,
        folder_name: category?.name || 'Unknown Folder',
        folder_color: category?.color || '#3b82f6',
        folder_icon: category?.icon || 'folder',
        owner_id: invitation.owner_id,
        owner_email: ownerEmails.get(invitation.owner_id) || `User ${invitation.owner_id.slice(0, 8)}`,
        permission_level: invitation.permission_level,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at
      }
    }) || []

    return NextResponse.json({
      success: true,
      invitations: formattedInvitations
    })

  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined 
    }, { status: 500 })
  }
}

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

    const { invitationId, action } = await request.json()

    if (!invitationId || !action) {
      return NextResponse.json({ error: 'Invitation ID and action are required' }, { status: 400 })
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get invitation details
    const { data: invitation, error: invitationError } = await serviceSupabase
      .from('folder_sharing_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('invited_email', user.email)
      .eq('status', 'pending')
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found or already processed' }, { status: 404 })
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    if (action === 'accept') {
      // Update invitation status
      const { error: updateError } = await serviceSupabase
        .from('folder_sharing_invitations')
        .update({ 
          status: 'accepted',
          invited_user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (updateError) {
        console.error('Error updating invitation:', updateError)
        return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
      }

      // Get owner's email from the invitation
      const { data: ownerData, error: ownerError } = await serviceSupabase
        .from('folder_sharing_invitations')
        .select('owner_id')
        .eq('id', invitationId)
        .single()

      // Get owner's email from auth.users (this might not work due to RLS)
      let ownerEmail = 'Unknown User'
      if (!ownerError && ownerData) {
        // Try to get owner email - this might fail due to RLS
        const { data: ownerUser } = await serviceSupabase.auth.admin.getUserById(ownerData.owner_id)
        if (ownerUser?.user?.email) {
          ownerEmail = ownerUser.user.email
        }
      }

      // Create shared folder access
      const { error: accessError } = await serviceSupabase
        .from('shared_folder_access')
        .insert({
          folder_id: invitation.folder_id,
          owner_id: invitation.owner_id,
          owner_email: ownerEmail,
          shared_with_user_id: user.id,
          permission_level: invitation.permission_level
        })

      if (accessError) {
        console.error('Error creating shared access:', accessError)
        return NextResponse.json({ error: 'Failed to create shared access' }, { status: 500 })
      }

      // Get all credentials in this folder and share them
      const { data: folderCredentials, error: credsError } = await serviceSupabase
        .from('credentials')
        .select('id')
        .eq('category_id', invitation.folder_id)
        .eq('user_id', invitation.owner_id)

      if (credsError) {
        console.error('Error fetching folder credentials:', credsError)
        // Don't fail the entire request if credentials can't be fetched
      } else if (folderCredentials && folderCredentials.length > 0) {
        // Create shared_credentials records for all credentials in the folder
        const sharedCredsData = folderCredentials.map((cred: any) => ({
          credential_id: cred.id,
          folder_id: invitation.folder_id,
          owner_id: invitation.owner_id,
          shared_with_user_id: user.id,
          permission_level: invitation.permission_level
        }))

        const { error: sharedCredsError } = await serviceSupabase
          .from('shared_credentials')
          .insert(sharedCredsData)

        if (sharedCredsError) {
          console.error('Error creating shared credentials:', sharedCredsError)
          // Don't fail the entire request if shared credentials can't be created
        }
      }

      // Emit socket event to notify the folder owner
      try {
        await emitToUser(invitation.owner_id, 'invitation:accepted', {
          invitationId,
          folderId: invitation.folder_id,
          userId: user.id,
          userEmail: user.email
        })
      } catch (error) {
        console.warn('Failed to emit socket event for invitation acceptance:', error)
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation accepted successfully'
      })

    } else if (action === 'decline') {
      // Update invitation status
      const { error: updateError } = await serviceSupabase
        .from('folder_sharing_invitations')
        .update({ 
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (updateError) {
        console.error('Error updating invitation:', updateError)
        return NextResponse.json({ error: 'Failed to decline invitation' }, { status: 500 })
      }

      // Emit socket event to notify the folder owner
      try {
        await emitToUser(invitation.owner_id, 'invitation:declined', {
          invitationId,
          folderId: invitation.folder_id,
          userId: user.id,
          userEmail: user.email
        })
      } catch (error) {
        console.warn('Failed to emit socket event for invitation decline:', error)
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation declined successfully'
      })
    }

  } catch (error) {
    console.error('Error processing invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
