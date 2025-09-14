'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useSocket } from '@/contexts/socket-context'
import { Mail, Users, CheckCircle, XCircle, Folder } from 'lucide-react'

interface PendingInvitation {
  invitation_id: string
  folder_id: string
  folder_name: string
  folder_color: string
  folder_icon: string
  owner_email: string
  permission_level: string
  expires_at: string
  created_at: string
}

export function InvitationsNotification() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null)

  const { emit, on, off } = useSocket()

  useEffect(() => {
    fetchInvitations()

    // Listen for real-time updates
    on('invitation:created', handleNewInvitation)
    on('invitation:accepted', handleInvitationAccepted)
    on('invitation:declined', handleInvitationDeclined)

    return () => {
      off('invitation:created', handleNewInvitation)
      off('invitation:accepted', handleInvitationAccepted)
      off('invitation:declined', handleInvitationDeclined)
    }
  }, [])

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/folder-sharing/invitations')
      const data = await response.json()
      
      if (data.success) {
        setInvitations(data.invitations || [])
      }
    } catch (error) {
    }
  }

  const handleNewInvitation = (data: any) => {
    fetchInvitations()
    toast.info(`New folder sharing invitation from ${data.ownerEmail}`)
  }

  const handleInvitationAccepted = (data: any) => {
    fetchInvitations()
  }

  const handleInvitationDeclined = (data: any) => {
    fetchInvitations()
  }

  const handleInvitationAction = async (invitationId: string, action: 'accept' | 'decline') => {
    setProcessingInvitation(invitationId)
    setIsLoading(true)

    try {
      const response = await fetch('/api/folder-sharing/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          action
        }),
      })

      const data = await response.json()

      if (data.success) {
        fetchInvitations()
        toast.success(`Invitation ${action}ed successfully`)
        
        // Emit socket event for real-time updates
        emit('invitation:accept', { invitationId })
      } else {
        toast.error(data.error || `Failed to ${action} invitation`)
      }
    } catch (error) {
      toast.error(`Failed to ${action} invitation`)
    } finally {
      setIsLoading(false)
      setProcessingInvitation(null)
    }
  }

  const getPermissionBadge = (permission: string) => {
    return (
      <Badge variant="outline" className="text-xs">
        {permission === 'read' ? 'Read Only' : 'Read & Write'}
      </Badge>
    )
  }

  const getExpiryStatus = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const hoursLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (hoursLeft <= 0) {
      return { text: 'Expired', variant: 'destructive' as const }
    } else if (hoursLeft <= 24) {
      return { text: `${hoursLeft}h left`, variant: 'destructive' as const }
    } else {
      const daysLeft = Math.ceil(hoursLeft / 24)
      return { text: `${daysLeft}d left`, variant: 'outline' as const }
    }
  }

  if (invitations.length === 0) {
    return null
  }

  return (
    <>
      {/* Notification Badge */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="relative"
      >
        <Mail className="h-4 w-4 mr-2" />
        Invitations
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
        >
          {invitations.length}
        </Badge>
      </Button>

      {/* Invitations Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Folder Sharing Invitations</span>
            </DialogTitle>
            <DialogDescription>
              You have {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''} to access shared folders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {invitations.map((invitation) => {
              const expiryStatus = getExpiryStatus(invitation.expires_at)
              const isExpired = expiryStatus.variant === 'destructive' && expiryStatus.text === 'Expired'
              
              return (
                <Card key={invitation.invitation_id} className={isExpired ? 'opacity-50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: invitation.folder_color }}
                        >
                          <Folder className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{invitation.folder_name}</CardTitle>
                          <CardDescription>
                            Shared by {invitation.owner_email}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPermissionBadge(invitation.permission_level)}
                        <Badge variant={expiryStatus.variant}>
                          {expiryStatus.text}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Invited {new Date(invitation.created_at).toLocaleDateString()}
                      </div>
                      {!isExpired && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInvitationAction(invitation.invitation_id, 'decline')}
                            disabled={isLoading && processingInvitation === invitation.invitation_id}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleInvitationAction(invitation.invitation_id, 'accept')}
                            disabled={isLoading && processingInvitation === invitation.invitation_id}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="pt-4 border-t">
            <div className="text-sm text-gray-500 text-center">
              Accept invitations to access shared folders and their credentials.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
