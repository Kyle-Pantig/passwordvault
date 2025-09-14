import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get invitation details by token
    const { data: invitation, error: invitationError } = await supabase
      .from('folder_sharing_invitations')
      .select(`
        id,
        folder_id,
        permission_level,
        status,
        expires_at,
        created_at,
        owner_id,
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('invitation_token', token)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if invitation is expired
    const isExpired = new Date(invitation.expires_at) < new Date()
    if (isExpired && invitation.status === 'pending') {
      // Update status to expired
      await supabase
        .from('folder_sharing_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        folder_id: invitation.folder_id,
        folder_name: (invitation.categories as any)?.name || 'Unknown Folder',
        folder_color: (invitation.categories as any)?.color || '#3b82f6',
        folder_icon: (invitation.categories as any)?.icon || 'folder',
        owner_id: invitation.owner_id,
        owner_email: `User ${invitation.owner_id?.slice(0, 8) || 'Unknown'}`, // Fallback display
        permission_level: invitation.permission_level,
        expires_at: invitation.expires_at,
        status: isExpired ? 'expired' : invitation.status
      }
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
