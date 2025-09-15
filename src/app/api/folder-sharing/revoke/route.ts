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

    const { folderId, userId } = await request.json()

    if (!folderId || !userId) {
      return NextResponse.json({ error: 'Folder ID and User ID are required' }, { status: 400 })
    }

    // Create service client for admin operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify the user owns this folder
    const { data: folder, error: folderError } = await supabase
      .from('categories')
      .select('id, user_id, name')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single()

    if (folderError || !folder) {
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 })
    }

    // Remove shared folder access
    const { error: revokeError } = await serviceSupabase
      .from('shared_folder_access')
      .delete()
      .eq('folder_id', folderId)
      .eq('shared_with_user_id', userId)
      .eq('owner_id', user.id)

    if (revokeError) {
      console.error('Error revoking access:', revokeError)
      return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
    }

    // Remove shared credentials for this user and folder
    const { error: credentialsError } = await serviceSupabase
      .from('shared_credentials')
      .delete()
      .eq('folder_id', folderId)
      .eq('shared_with_user_id', userId)
      .eq('owner_id', user.id)

    if (credentialsError) {
      throw new Error('Error removing shared credentials:', credentialsError)
      // Don't fail the entire request if credentials can't be removed
    }

    // Clean up any accepted invitations for this user and folder
    // This allows the user to be invited again
    // First, get the user's email to clean up invitations by email
    let userEmail = null
    try {
      const { data: userData } = await serviceSupabase.auth.admin.getUserById(userId)
      userEmail = userData?.user?.email
    } catch (error) {
      console.warn('Could not fetch user email for invitation cleanup:', error)
    }

    // Clean up invitations by user ID
    const { error: invitationCleanupError1 } = await serviceSupabase
      .from('folder_sharing_invitations')
      .delete()
      .eq('folder_id', folderId)
      .eq('invited_user_id', userId)
      .eq('owner_id', user.id)
      .eq('status', 'accepted')

    if (invitationCleanupError1) {
      console.warn('Error cleaning up accepted invitations by user ID:', invitationCleanupError1)
    }

    // Clean up invitations by email (if we have the email)
    if (userEmail) {
      const { error: invitationCleanupError2 } = await serviceSupabase
        .from('folder_sharing_invitations')
        .delete()
        .eq('folder_id', folderId)
        .eq('invited_email', userEmail)
        .eq('owner_id', user.id)
        .eq('status', 'accepted')

      if (invitationCleanupError2) {
        console.warn('Error cleaning up accepted invitations by email:', invitationCleanupError2)
      }
    }

    // Use the email we already fetched for notification
    const notificationEmail = userEmail || 'Unknown User'

    // Create notification for the user whose access was revoked
    try {
      const { createAccessRevokedNotification } = await import('@/lib/notification-service')
      const notification = await createAccessRevokedNotification(
        userId,
        folder.name || 'Unknown Folder',
        user.email!,
        folderId
      )

      // Emit real-time notification event
      if (notification) {
        await emitToUser(userId, 'notification:new', {
          type: 'access_revoked',
          title: 'Folder Access Revoked',
          message: `Your access to the "${folder.name || 'Unknown Folder'}" folder has been revoked by ${user.email}`,
          data: {
            folderId,
            folderName: folder.name || 'Unknown Folder',
            ownerEmail: user.email
          }
        })
      }

      // Emit vault data refresh event to update the user's vault
      await emitToUser(userId, 'vault:refresh', {
        type: 'access_revoked',
        folderId,
        message: 'Your access to a shared folder has been revoked'
      })
    } catch (error) {
      console.warn('Failed to create notification for access revocation:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Access revoked successfully'
    })

  } catch (error) {
    console.error('Error in revoke access:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 })
  }
}
