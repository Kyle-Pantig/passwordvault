import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { emitToUser } from '@/lib/socket-emitter'

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

    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    // Get invitation details and verify ownership
    const { data: invitation, error: invitationError } = await serviceSupabase
      .from('folder_sharing_invitations')
      .select(`
        id,
        folder_id,
        invited_email,
        owner_id,
        status,
        categories (
          id,
          name
        )
      `)
      .eq('id', invitationId)
      .eq('owner_id', user.id)
      .eq('status', 'pending')
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found or already processed',
        details: 'The invitation does not exist or you do not have permission to cancel it'
      }, { status: 404 })
    }

    // Delete the invitation
    const { error: deleteError } = await serviceSupabase
      .from('folder_sharing_invitations')
      .delete()
      .eq('id', invitationId)

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError)
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 })
    }

    // Get the invited user's ID for real-time notification
    let invitedUserId = null
    try {
      const { data: invitedUsers } = await serviceSupabase.auth.admin.listUsers()
      const invitedUser = invitedUsers?.users?.find(u => u.email === invitation.invited_email)
      if (invitedUser) {
        invitedUserId = invitedUser.id
      }
    } catch (error) {
      console.warn('Could not fetch invited user ID for notification:', error)
    }

    // Create notification and emit real-time event
    try {
      // Create notification in database for the invited user (if they exist)
      if (invitedUserId) {
        const { createInvitationCancelledNotification } = await import('@/lib/notification-service')
        const categoryName = (invitation.categories as any)?.name || 'Unknown Folder'
        await createInvitationCancelledNotification(
          invitedUserId,
          categoryName || 'Unknown Folder',
          user.email!,
          invitationId,
          invitation.folder_id
        )

        // Emit invitation cancelled event to the invited user
        await emitToUser(invitedUserId, 'invitation:cancelled', {
          invitationId: invitation.id,
          folderId: invitation.folder_id,
          folderName: categoryName || 'Unknown Folder',
          ownerEmail: user.email
        })

        // Also emit notification event
        await emitToUser(invitedUserId, 'notification:new', {
          type: 'invitation_cancelled',
          title: 'Invitation Cancelled',
          message: `${user.email} cancelled your invitation to the "${categoryName || 'Unknown Folder'}" folder`,
          data: {
            invitationId: invitation.id,
            folderId: invitation.folder_id,
            folderName: categoryName || 'Unknown Folder',
            ownerEmail: user.email
          }
        })
      }

      // Emit invitation cancelled event for real-time updates to the owner
      await emitToUser(user.id, 'invitation:cancelled', {
        folderId: invitation.folder_id,
        invitedEmail: invitation.invited_email,
        invitationId: invitation.id
      })

    } catch (error) {
      console.warn('Failed to create notification or emit socket event for invitation cancellation:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling invitation:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined 
    }, { status: 500 })
  }
}
