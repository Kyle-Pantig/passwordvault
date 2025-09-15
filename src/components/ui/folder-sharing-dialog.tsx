'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useSocket } from '@/contexts/socket-context'
import { useSubscription } from '@/contexts/subscription-context'
import { UserPlus, Mail, Shield, Users, Clock, CheckCircle, XCircle, Edit2, Save, X } from 'lucide-react'

interface FolderSharingDialogProps {
  isOpen: boolean
  onClose: () => void
  folderId: string
  folderName: string
}

interface PendingInvitation {
  id: string
  invited_email: string
  permission_level: string
  status: string
  created_at: string
  expires_at: string
}

export function FolderSharingDialog({ isOpen, onClose, folderId, folderName }: FolderSharingDialogProps) {
  const [invitedEmail, setInvitedEmail] = useState('')
  const [permissionLevel, setPermissionLevel] = useState('read')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPending, setIsLoadingPending] = useState(false)
  const [isLoadingShared, setIsLoadingShared] = useState(false)
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [sharedUsers, setSharedUsers] = useState<any[]>([])
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editingPermission, setEditingPermission] = useState<string>('read')

  const { subscription } = useSubscription()
  const { emit, on, off } = useSocket()

  // Check if user has Pro subscription
  const isProUser = subscription?.plan === 'PRO'

  useEffect(() => {
    if (isOpen && isProUser) {
      // Small delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        // Load both data sources in parallel for better performance
        Promise.all([
          fetchPendingInvitations(),
          fetchSharedUsers()
        ])
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [isOpen, isProUser, folderId])

  useEffect(() => {
    // Listen for real-time updates
    on('invitation:created', handleInvitationCreated)
    on('invitation:accepted', handleInvitationAccepted)
    on('invitation:declined', handleInvitationDeclined)
    on('invitation:cancelled', handleInvitationCancelled)

    return () => {
      off('invitation:created', handleInvitationCreated)
      off('invitation:accepted', handleInvitationAccepted)
      off('invitation:declined', handleInvitationDeclined)
      off('invitation:cancelled', handleInvitationCancelled)
    }
  }, [on, off])

  const fetchPendingInvitations = async () => {
    setIsLoadingPending(true)
    try {
      const response = await fetch(`/api/folder-sharing/pending?folderId=${folderId}`)
      const data = await response.json()
      
      if (data.success) {
        setPendingInvitations(data.invitations || [])
      } else {
        console.error('Failed to fetch pending invitations:', data.error)
        setPendingInvitations([])
      }
    } catch (error) {
      console.error('Error fetching pending invitations:', error)
      setPendingInvitations([])
    } finally {
      setIsLoadingPending(false)
    }
  }

  const fetchSharedUsers = async () => {
    setIsLoadingShared(true)
    try {
      const response = await fetch(`/api/folder-sharing/shared-users?folderId=${folderId}`)
      const data = await response.json()
      
      if (data.success) {
        setSharedUsers(data.users || [])
      } else {
        console.error('Failed to fetch shared users:', data.error)
        setSharedUsers([])
      }
    } catch (error) {
      console.error('Error fetching shared users:', error)
      setSharedUsers([])
    } finally {
      setIsLoadingShared(false)
    }
  }

  const handleInvitationCreated = (data: any) => {
    if (data.folderId === folderId) {
      fetchPendingInvitations()
      toast.success(`Invitation sent to ${data.invitedEmail}`)
    }
  }

  const handleInvitationAccepted = (data: any) => {
    if (data.folderId === folderId) {
      fetchPendingInvitations()
      fetchSharedUsers()
      toast.success('Invitation accepted')
    }
  }

  const handleInvitationDeclined = (data: any) => {
    if (data.folderId === folderId) {
      fetchPendingInvitations()
      toast.info('Invitation declined')
    }
  }

  const handleInvitationCancelled = (data: any) => {
    if (data.folderId === folderId) {
      fetchPendingInvitations()
      toast.info('Invitation cancelled')
    }
  }

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!invitedEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    if (!isProUser) {
      toast.error('Pro subscription required for folder sharing')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/folder-sharing/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId,
          invitedEmail: invitedEmail.trim(),
          permissionLevel
        }),
      })

      const data = await response.json()

      if (data.success) {
        setInvitedEmail('')
        setPermissionLevel('read')
        fetchPendingInvitations()
        toast.success(`Invitation sent to ${invitedEmail}`)
      } else {
        // Show more detailed error message if available
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to send invitation'
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.error('Failed to send invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeAccess = async (userId: string) => {
    try {
      const response = await fetch('/api/folder-sharing/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId,
          userId
        }),
      })

      const data = await response.json()

      if (data.success) {
        fetchSharedUsers()
        toast.success('Access revoked successfully')
      } else {
        toast.error(data.error || 'Failed to revoke access')
      }
    } catch (error) {
      toast.error('Failed to revoke access')
    }
  }

  const handleEditPermission = (user: any) => {
    setEditingUser(user.id)
    setEditingPermission(user.permission_level)
  }

  const handleSavePermission = async (userId: string) => {
    try {
      const response = await fetch('/api/folder-sharing/update-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId,
          userId,
          permissionLevel: editingPermission
        }),
      })

      const data = await response.json()

      if (data.success) {
        setEditingUser(null)
        fetchSharedUsers()
        toast.success('Permission updated successfully')
      } else {
        toast.error(data.error || 'Failed to update permission')
      }
    } catch (error) {
      toast.error('Failed to update permission')
    }
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setEditingPermission('read')
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch('/api/folder-sharing/cancel-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId
        }),
      })

      const data = await response.json()

      if (data.success) {
        fetchPendingInvitations()
        toast.success('Invitation cancelled successfully')
      } else {
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to cancel invitation'
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast.error('Failed to cancel invitation')
    }
  }

  if (!isProUser) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Pro Feature</span>
            </DialogTitle>
            <DialogDescription>
              Folder sharing is available for Pro users only. Upgrade to Pro to share folders with up to 5 other users.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <Button 
              onClick={() => window.location.href = '/pricing'}
              className="w-full"
            >
              Upgrade to Pro
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Share Folder: {folderName}</span>
          </DialogTitle>
          <DialogDescription>
            Invite up to 5 users to access this folder. They will receive an email invitation.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
          {/* Send Invitation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <UserPlus className="h-4 w-4" />
                <span>Send Invitation</span>
              </CardTitle>
              <CardDescription>
                Invite users by email address. They will receive an email with instructions.
              </CardDescription>
            </CardHeader>
            <CardContent onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleSendInvitation} className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={invitedEmail}
                        onChange={(e) => setInvitedEmail(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="permission">Permission Level</Label>
                    <Select value={permissionLevel} onValueChange={setPermissionLevel}>
                      <SelectTrigger onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4" />
                            <span>Read Only</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="write">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4" />
                            <span>Read & Write</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full" onClick={(e) => e.stopPropagation()}>
                  {isLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Pending Invitations Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="pending-invitations">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Pending Invitations</span>
                  {pendingInvitations.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {pendingInvitations.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  {isLoadingPending ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-500">Loading pending invitations...</span>
                      </div>
                    </div>
                  ) : pendingInvitations.length > 0 ? (
                    <div className="space-y-3">
                      {pendingInvitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{invitation.invited_email}</p>
                              <p className="text-sm text-gray-500">
                                {invitation.permission_level === 'read' ? 'Read Only' : 'Read & Write'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Pending</span>
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCancelInvitation(invitation.id)
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No pending invitations</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Shared Users Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="shared-users">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Shared With</span>
                  {sharedUsers.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {sharedUsers.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  {isLoadingShared ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-500">Loading shared users...</span>
                      </div>
                    </div>
                  ) : sharedUsers.length > 0 ? (
                    <div className="space-y-3">
                      {sharedUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.email}</p>
                              {editingUser === user.id ? (
                                <div className="flex items-center space-x-2 mt-1">
                                  <Select
                                    value={editingPermission}
                                    onValueChange={setEditingPermission}
                                  >
                                    <SelectTrigger className="w-32 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="read">Read Only</SelectItem>
                                      <SelectItem value="write">Read & Write</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">
                                  {user.permission_level === 'read' ? 'Read Only' : 'Read & Write'}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {editingUser === user.id ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSavePermission(user.id)
                                  }}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancelEdit()
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditPermission(user)
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRevokeAccess(user.id)
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No users have access yet</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Usage Info */}
          <div className="text-sm text-gray-500 text-center">
            {pendingInvitations.length + sharedUsers.length} of 5 users invited
          </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
