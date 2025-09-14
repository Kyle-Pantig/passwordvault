'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      fetchPendingInvitations()
      fetchSharedUsers()
    }
  }, [isOpen, isProUser, folderId])

  useEffect(() => {
    // Listen for real-time updates
    on('invitation:created', handleInvitationCreated)
    on('invitation:accepted', handleInvitationAccepted)
    on('invitation:declined', handleInvitationDeclined)

    return () => {
      off('invitation:created', handleInvitationCreated)
      off('invitation:accepted', handleInvitationAccepted)
      off('invitation:declined', handleInvitationDeclined)
    }
  }, [])

  const fetchPendingInvitations = async () => {
    try {
      const response = await fetch(`/api/folder-sharing/invitations?folderId=${folderId}`)
      const data = await response.json()
      
      if (data.success) {
        setPendingInvitations(data.invitations || [])
      }
    } catch (error) {
    }
  }

  const fetchSharedUsers = async () => {
    try {
      const response = await fetch(`/api/folder-sharing/shared-users?folderId=${folderId}`)
      const data = await response.json()
      
      if (data.success) {
        setSharedUsers(data.users || [])
      }
    } catch (error) {
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
        toast.error(data.error || 'Failed to send invitation')
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Share Folder: {folderName}</span>
          </DialogTitle>
          <DialogDescription>
            Invite up to 5 users to access this folder. They will receive an email invitation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Pending Invitations</span>
                </CardTitle>
                <CardDescription>
                  Invitations waiting for response
                </CardDescription>
              </CardHeader>
              <CardContent onClick={(e) => e.stopPropagation()}>
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
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Pending</span>
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shared Users */}
          {sharedUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Shared With</span>
                </CardTitle>
                <CardDescription>
                  Users who have access to this folder
                </CardDescription>
              </CardHeader>
              <CardContent onClick={(e) => e.stopPropagation()}>
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
                              className="text-green-600 hover:text-green-700"
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
                              className="text-gray-600 hover:text-gray-700"
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
                              className="text-blue-600 hover:text-blue-700"
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
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Info */}
          <div className="text-sm text-gray-500 text-center">
            {pendingInvitations.length + sharedUsers.length} of 5 users invited
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
