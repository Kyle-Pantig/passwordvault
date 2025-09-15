import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendInvitationEmail } from '@/lib/email-service'
import { emitToUser } from '@/lib/socket-emitter'
import crypto from 'crypto'

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

    const { folderId, invitedEmail, permissionLevel = 'read' } = await request.json()

    if (!folderId || !invitedEmail) {
      return NextResponse.json({ error: 'Folder ID and invited email are required' }, { status: 400 })
    }

    if (!['read', 'write'].includes(permissionLevel)) {
      return NextResponse.json({ error: 'Invalid permission level' }, { status: 400 })
    }

    // Check if user has Pro subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single()

    if (subError) {
      console.error('Error checking subscription:', subError)
      return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 })
    }

    if (!subscription || subscription.plan !== 'PRO') {
      return NextResponse.json({ error: 'Pro subscription required for folder sharing' }, { status: 403 })
    }

    // Verify folder ownership
    const { data: folder, error: folderError } = await supabase
      .from('categories')
      .select('id, name, user_id, color, icon')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single()

    if (folderError || !folder) {
      console.error('Folder verification failed:', folderError)
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 })
    }

    // Check if user is trying to invite themselves
    if (invitedEmail === user.email) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })
    }

    // Check existing shared users count (max 5) - count unique users, not invitation records
    const { data: existingSharedUsers, error: countError } = await serviceSupabase
      .from('shared_folder_access')
      .select('shared_with_user_id')
      .eq('folder_id', folderId)
      .eq('owner_id', user.id)

    if (countError) {
      console.error('Error checking existing shared users:', countError)
      return NextResponse.json({ error: 'Failed to check existing shared users' }, { status: 500 })
    }

    // Also count pending invitations for users who don't have access yet
    const { data: pendingInvitations, error: pendingError } = await serviceSupabase
      .from('folder_sharing_invitations')
      .select('invited_email')
      .eq('folder_id', folderId)
      .eq('owner_id', user.id)
      .eq('status', 'pending')

    if (pendingError) {
      console.error('Error checking pending invitations:', pendingError)
      return NextResponse.json({ error: 'Failed to check pending invitations' }, { status: 500 })
    }

    // Count unique users (existing shared users + pending invitations)
    const uniqueUsers = new Set()
    
    // Add existing shared users
    existingSharedUsers?.forEach(user => {
      uniqueUsers.add(user.shared_with_user_id)
    })
    
    // Add pending invitations (by email, since we don't know their user ID yet)
    pendingInvitations?.forEach(invitation => {
      uniqueUsers.add(invitation.invited_email)
    })

    if (uniqueUsers.size >= 5) {
      return NextResponse.json({ error: 'Maximum of 5 users can be invited to a folder' }, { status: 400 })
    }

    // Check if invitation already exists
    const { data: existingInvitation, error: existingError } = await serviceSupabase
      .from('folder_sharing_invitations')
      .select('id, status, expires_at')
      .eq('folder_id', folderId)
      .eq('invited_email', invitedEmail)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing invitation:', existingError)
      return NextResponse.json({ error: 'Failed to check existing invitation' }, { status: 500 })
    }

    if (existingInvitation) {
      if (existingInvitation.status === 'pending') {
        // Check if invitation is expired
        const isExpired = new Date(existingInvitation.expires_at) < new Date()
        if (isExpired) {
          // Delete expired invitation and continue with new one
          await serviceSupabase
            .from('folder_sharing_invitations')
            .delete()
            .eq('id', existingInvitation.id)
        } else {
          return NextResponse.json({ 
            error: 'Invitation already sent to this email',
            details: 'A pending invitation already exists for this email address'
          }, { status: 400 })
        }
      } else if (existingInvitation.status === 'accepted') {
        return NextResponse.json({ 
          error: 'User already has access to this folder',
          details: 'This user has already accepted an invitation to access this folder'
        }, { status: 400 })
      } else if (existingInvitation.status === 'declined') {
        // Allow resending invitation if it was previously declined
        await serviceSupabase
          .from('folder_sharing_invitations')
          .delete()
          .eq('id', existingInvitation.id)
      }
    }

    // Generate secure invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex')

    // Create invitation
    const invitationData = {
      folder_id: folderId,
      owner_id: user.id,
      invited_email: invitedEmail,
      permission_level: permissionLevel,
      invitation_token: invitationToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }

    const { data: invitation, error: invitationError } = await serviceSupabase
      .from('folder_sharing_invitations')
      .insert(invitationData)
      .select()
      .single()

    if (invitationError) {
      console.error('Error creating invitation:', invitationError)
      console.error('Invitation error details:', {
        code: invitationError.code,
        message: invitationError.message,
        details: invitationError.details,
        hint: invitationError.hint
      })
      
      // Handle specific database errors
      if (invitationError.code === '23505') {
        return NextResponse.json({ 
          error: 'Invitation already exists',
          details: 'An invitation for this email address already exists for this folder'
        }, { status: 400 })
      }
      
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Send invitation email
    const emailSent = await sendInvitationEmail({
      to: invitedEmail,
      from: user.email!,
      folderName: folder.name,
      permissionLevel: permissionLevel,
      invitationToken: invitationToken,
      expiresAt: invitation.expires_at
    })

    if (!emailSent) {
      console.warn('Failed to send invitation email, but invitation was created')
    }

    // Create notification and emit real-time event to notify the invited user (if they're online)
    try {
      // Get the invited user's ID from auth.users table
      const { data: invitedUsers } = await serviceSupabase.auth.admin.listUsers()
      const invitedUser = invitedUsers?.users?.find(u => u.email === invitedEmail)

      if (invitedUser) {
        // Create notification in database
        const { createInvitationNotification } = await import('@/lib/notification-service')
        await createInvitationNotification(
          invitedUser.id,
          folder.name,
          user.email!,
          invitation.id,
          folderId,
          permissionLevel
        )

        // Emit invitation created event to the invited user
        await emitToUser(invitedUser.id, 'invitation:created', {
          invitationId: invitation.id,
          folderId: folderId,
          folderName: folder.name,
          folderColor: folder.color || '#3b82f6',
          folderIcon: folder.icon || 'folder',
          ownerEmail: user.email,
          permissionLevel: permissionLevel,
          expiresAt: invitation.expires_at
        })

        // Emit invitation created event for real-time updates
        await emitToUser(user.id, 'invitation:created', {
          folderId: folderId,
          invitedEmail: invitedEmail,
          invitationId: invitation.id,
          permissionLevel: permissionLevel
        })

        // Also emit notification event
        await emitToUser(invitedUser.id, 'notification:new', {
          type: 'invitation_created',
          title: 'New Folder Invitation',
          message: `${user.email} invited you to access the "${folder.name}" folder`,
          data: {
            invitationId: invitation.id,
            folderId: folderId,
            folderName: folder.name,
            ownerEmail: user.email,
            permissionLevel: permissionLevel,
            folderColor: folder.color || '#3b82f6',
            folderIcon: folder.icon || 'folder'
          }
        })
      }
    } catch (error) {
      console.warn('Failed to create notification or emit socket event for invitation creation:', error)
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        folderId: folderId,
        invitedEmail: invitedEmail,
        permissionLevel: permissionLevel,
        expiresAt: invitation.expires_at
      }
    })

  } catch (error) {
    console.error('Error in folder sharing invite:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    })
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined 
    }, { status: 500 })
  }
}
