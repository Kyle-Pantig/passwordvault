// Load environment variables
require('dotenv').config({ path: '.env.local' })

const { createServer } = require('http')
const { Server } = require('socket.io')
const { createClient } = require('@supabase/supabase-js')

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL 
      : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
})

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  console.error('Please check your .env.local file')
  process.exit(1)
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const userSockets = new Map() // userId -> socketId

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return next(new Error('Authentication token required'))
    }

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
    }

    next()
  } catch (error) {
    next(new Error('Authentication failed'))
  }
})

io.on('connection', (socket) => {
  const userData = socket.userData
  
  // Store user socket mapping
  userSockets.set(userData.userId, socket.id)

  // Join user to their personal room
  socket.join(`user:${userData.userId}`)

  // Handle invitation acceptance
  socket.on('invitation:accept', async (data) => {
    try {
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
      const ownerSocketId = userSockets.get(invitation.owner_id)
      if (ownerSocketId) {
        io.to(ownerSocketId).emit('invitation:accepted', {
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
      console.error('Error accepting invitation:', error)
      socket.emit('error', { message: 'Internal server error' })
    }
  })

  // Handle invitation decline
  socket.on('invitation:decline', async (data) => {
    try {
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
      const ownerSocketId = userSockets.get(invitation.owner_id)
      if (ownerSocketId) {
        io.to(ownerSocketId).emit('invitation:declined', {
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
      console.error('Error declining invitation:', error)
      socket.emit('error', { message: 'Internal server error' })
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    userSockets.delete(userData.userId)
  })
})

const PORT = process.env.SOCKET_PORT || 3001
httpServer.listen(PORT, () => {
})

// Export for use in other files
module.exports = { io, userSockets }
