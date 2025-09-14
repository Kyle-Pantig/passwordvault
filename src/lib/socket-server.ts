import { Server as SocketIOServer } from 'socket.io'
import { createClient } from '@/lib/supabase/server'

interface AuthenticatedSocket {
  userId: string
  email: string
  subscription: string
}

interface SocketEvents {
  // Invitation events
  'invitation:created': (data: { invitationId: string, folderId: string, invitedEmail: string }) => void
  'invitation:accepted': (data: { invitationId: string, folderId: string, userId: string }) => void
  'invitation:declined': (data: { invitationId: string, folderId: string, userId: string }) => void
  
  // Folder sharing events
  'folder:shared': (data: { folderId: string, sharedWithUserId: string, permissionLevel: string }) => void
  'folder:unshared': (data: { folderId: string, sharedWithUserId: string }) => void
  
  // Credential events
  'credential:added': (data: { credentialId: string, folderId: string, sharedWithUserIds: string[] }) => void
  'credential:updated': (data: { credentialId: string, folderId: string, sharedWithUserIds: string[] }) => void
  'credential:deleted': (data: { credentialId: string, folderId: string, sharedWithUserIds: string[] }) => void
  
  // Real-time updates
  'folder:updated': (data: { folderId: string, sharedWithUserIds: string[] }) => void
}

class SocketManager {
  private io: SocketIOServer | null = null
  private userSockets: Map<string, string> = new Map() // userId -> socketId

  initialize(server: any) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXT_PUBLIC_APP_URL 
          : "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.io.use(this.authenticateSocket.bind(this))
    this.io.on('connection', this.handleConnection.bind(this))
  }

  private async authenticateSocket(socket: any, next: any) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return next(new Error('Authentication token required'))
      }

      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser(token)

      if (error || !user) {
        return next(new Error('Invalid authentication token'))
      }

      // Get user subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single()

      socket.userData = {
        userId: user.id,
        email: user.email,
        subscription: subscription?.plan || 'FREE'
      } as AuthenticatedSocket

      next()
    } catch (error) {
      next(new Error('Authentication failed'))
    }
  }

  private handleConnection(socket: any) {
    const userData = socket.userData as AuthenticatedSocket
    
    // Store user socket mapping
    this.userSockets.set(userData.userId, socket.id)

    // Join user to their personal room
    socket.join(`user:${userData.userId}`)

    // Handle invitation acceptance
    socket.on('invitation:accept', async (data: { invitationId: string }) => {
      await this.handleInvitationAccept(socket, data)
    })

    // Handle invitation decline
    socket.on('invitation:decline', async (data: { invitationId: string }) => {
      await this.handleInvitationDecline(socket, data)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      this.userSockets.delete(userData.userId)
    })
  }

  private async handleInvitationAccept(socket: any, data: { invitationId: string }) {
    try {
      const userData = socket.userData as AuthenticatedSocket
      const supabase = await createClient()

      // Update invitation status
      const { data: invitation, error: invitationError } = await supabase
        .from('folder_sharing_invitations')
        .update({ 
          status: 'accepted',
          invited_user_id: userData.userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.invitationId)
        .eq('invited_email', userData.email)
        .select()
        .single()

      if (invitationError || !invitation) {
        socket.emit('error', { message: 'Failed to accept invitation' })
        return
      }

      // Create shared folder access
      const { error: accessError } = await supabase
        .from('shared_folder_access')
        .insert({
          folder_id: invitation.folder_id,
          owner_id: invitation.owner_id,
          shared_with_user_id: userData.userId,
          permission_level: invitation.permission_level
        })

      if (accessError) {
        socket.emit('error', { message: 'Failed to create shared access' })
        return
      }

      // Notify the owner
      const ownerSocketId = this.userSockets.get(invitation.owner_id)
      if (ownerSocketId) {
        this.io?.to(ownerSocketId).emit('invitation:accepted', {
          invitationId: data.invitationId,
          folderId: invitation.folder_id,
          userId: userData.userId
        })
      }

      // Notify the user
      socket.emit('invitation:accepted', {
        invitationId: data.invitationId,
        folderId: invitation.folder_id,
        userId: userData.userId
      })

    } catch (error) {
      socket.emit('error', { message: 'Internal server error' })
    }
  }

  private async handleInvitationDecline(socket: any, data: { invitationId: string }) {
    try {
      const userData = socket.userData as AuthenticatedSocket
      const supabase = await createClient()

      // Update invitation status
      const { data: invitation, error: invitationError } = await supabase
        .from('folder_sharing_invitations')
        .update({ 
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.invitationId)
        .eq('invited_email', userData.email)
        .select()
        .single()

      if (invitationError || !invitation) {
        socket.emit('error', { message: 'Failed to decline invitation' })
        return
      }

      // Notify the owner
      const ownerSocketId = this.userSockets.get(invitation.owner_id)
      if (ownerSocketId) {
        this.io?.to(ownerSocketId).emit('invitation:declined', {
          invitationId: data.invitationId,
          folderId: invitation.folder_id,
          userId: userData.userId
        })
      }

      // Notify the user
      socket.emit('invitation:declined', {
        invitationId: data.invitationId,
        folderId: invitation.folder_id,
        userId: userData.userId
      })

    } catch (error) {
      socket.emit('error', { message: 'Internal server error' })
    }
  }

  // Public methods for emitting events
  emitToUser(userId: string, event: keyof SocketEvents, data: any) {
    const socketId = this.userSockets.get(userId)
    if (socketId) {
      this.io?.to(socketId).emit(event, data)
    }
  }

  emitToUsers(userIds: string[], event: keyof SocketEvents, data: any) {
    userIds.forEach(userId => {
      this.emitToUser(userId, event, data)
    })
  }

  emitToRoom(room: string, event: keyof SocketEvents, data: any) {
    this.io?.to(room).emit(event, data)
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.userSockets.size
  }

  // Check if user is connected
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId)
  }
}

export const socketManager = new SocketManager()
export default socketManager
