'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Check, X, CheckCircle, XCircle, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSocket } from '@/contexts/socket-context'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: any
  is_read: boolean
  created_at: string | null
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [showInvitationDialog, setShowInvitationDialog] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState<Notification | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedInvitations, setProcessedInvitations] = useState<Set<string>>(new Set())
  const { socket, isConnected, emit, on, off } = useSocket()
  const queryClient = useQueryClient()

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      })
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH'
      })
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Handle invitation action
  const handleInvitationAction = async (notification: Notification, action: 'accept' | 'decline') => {
    if (!notification.data?.invitationId) {
      toast.error('Invalid invitation data')
      return
    }

    if (isProcessing) {
      toast.error('Please wait, action in progress...')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch('/api/folder-sharing/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: notification.data.invitationId,
          action
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Mark notification as read
        if (notification.id) {
          await markAsRead(notification.id)
        }
        
        // Mark invitation as processed
        if (notification.data?.invitationId) {
          setProcessedInvitations(prev => new Set([...prev, notification.data.invitationId]))
        }
        
        // Invalidate vault data to refresh shared folders when accepting
        if (action === 'accept') {
          queryClient.invalidateQueries({ queryKey: ['vault-data'] })
        }
        
        toast.success(`Invitation ${action}ed successfully`)
        
        // Emit socket event for real-time updates
        emit(`invitation:${action}`, { invitationId: notification.data.invitationId })
        
        // Close dialog
        setShowInvitationDialog(false)
        setSelectedInvitation(null)
      } else {
        toast.error(data.error || `Failed to ${action} invitation`)
      }
    } catch (error) {
      console.error('Error processing invitation:', error)
      toast.error(`Failed to ${action} invitation`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read first (if not already read and has an ID)
    if (!notification.is_read && notification.id) {
      markAsRead(notification.id)
    }
    
    // Then handle the specific action based on notification type
    if (notification.type === 'invitation_created' && notification.data?.invitationId) {
      setSelectedInvitation(notification)
      setShowInvitationDialog(true)
    }
    // For other notification types, just marking as read is sufficient
  }

  // Listen for new notifications via socket
  useEffect(() => {
    if (socket && isConnected) {
      const handleNewNotification = (notification: Notification) => {
        // Refresh notifications from database to get proper IDs
        fetchNotifications()
      }

      on('notification:new', handleNewNotification)
      
      return () => {
        off('notification:new', handleNewNotification)
      }
    }
  }, [socket, isConnected, on, off])

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications()
  }, [])

  // Fallback: periodically check for notifications if socket is not connected
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(() => {
        fetchNotifications()
      }, 10000) // Check every 10 seconds

      return () => {
        clearInterval(interval)
      }
    }
  }, [isConnected])

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invitation_created':
        return '📧'
      case 'invitation_accepted':
        return '✅'
      case 'invitation_declined':
        return '❌'
      case 'access_revoked':
        return '🚫'
      default:
        return '🔔'
    }
  }

  // Get notification color based on type
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'invitation_created':
        return 'text-blue-600'
      case 'invitation_accepted':
        return 'text-green-600'
      case 'invitation_declined':
        return 'text-red-600'
      case 'access_revoked':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <>
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80" 
        role="dialog" 
        aria-label="Notifications"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between p-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
              aria-label="Mark all notifications as read"
            >
              Mark all read
            </Button>
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications yet
            </div>
          ) : (
            <div className="p-1">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id || `notification-${index}`}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${notification.title}: ${notification.message}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleNotificationClick(notification)
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${getNotificationColor(notification.type)}`}>
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(() => {
                          try {
                            if (!notification.created_at) return 'Just now'
                            const date = new Date(notification.created_at)
                            if (isNaN(date.getTime())) return 'Just now'
                            return formatDistanceToNow(date, { addSuffix: true })
                          } catch (error) {
                            return 'Just now'
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Invitation Dialog */}
    <Dialog open={showInvitationDialog} onOpenChange={setShowInvitationDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Folder className="h-5 w-5" />
            <span>Folder Invitation</span>
          </DialogTitle>
          <DialogDescription>
            You've been invited to access a shared folder
          </DialogDescription>
        </DialogHeader>

        {selectedInvitation && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: selectedInvitation.data?.folderColor || '#3b82f6' }}
                  >
                    <Folder className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{selectedInvitation.data?.folderName || 'Unknown Folder'}</CardTitle>
                    <CardDescription>
                      Shared by {selectedInvitation.data?.ownerEmail || 'Unknown'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedInvitation.message}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {selectedInvitation.data?.permissionLevel === 'read' ? 'Read Only' : 'Read & Write'}
                    </Badge>
                    {(selectedInvitation.is_read || (selectedInvitation.data?.invitationId && processedInvitations.has(selectedInvitation.data.invitationId))) && (
                      <Badge variant="secondary" className="text-xs">
                        Already Processed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => handleInvitationAction(selectedInvitation, 'decline')}
                disabled={isProcessing || selectedInvitation.is_read || (selectedInvitation.data?.invitationId && processedInvitations.has(selectedInvitation.data.invitationId))}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-1" />
                {isProcessing ? 'Processing...' : 'Decline'}
              </Button>
              <Button
                onClick={() => handleInvitationAction(selectedInvitation, 'accept')}
                disabled={isProcessing || selectedInvitation.is_read || (selectedInvitation.data?.invitationId && processedInvitations.has(selectedInvitation.data.invitationId))}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {isProcessing ? 'Processing...' : 'Accept'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  </>
  )
}
