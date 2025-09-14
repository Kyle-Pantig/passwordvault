// Load environment variables
require('dotenv').config()

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
  console.error('Please check your environment variables')
  process.exit(1)
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Store user socket mappings
const userSockets = new Map()

// Middleware to authenticate socket connections
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    
    if (!token) {
      return next(new Error('Authentication token required'))
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return next(new Error('Invalid authentication token'))
    }

    // Store user data in socket
    socket.userData = {
      userId: user.id,
      email: user.email
    }

    next()
  } catch (error) {
    next(new Error('Authentication failed'))
  }
})

// Handle socket connections
io.on('connection', (socket) => {
  const userData = socket.userData
  
  // Store user socket mapping
  userSockets.set(userData.userId, socket.id)

  // Join user to their personal room
  socket.join(`user:${userData.userId}`)

  // Handle invitation acceptance
  socket.on('invitation:accept', async (data) => {
    try {
      const { invitationId } = data
      
      // Update invitation status in database
      const { data: invitation, error: invitationError } = await supabase
        .from('folder_invitations')
        .select('*, folder:categories(*)')
        .eq('id', invitationId)
        .eq('invited_user_id', userData.userId)
        .single()

      if (invitationError || !invitation) {
        socket.emit('error', { message: 'Invitation not found' })
        return
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('folder_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId)

      if (updateError) {
        socket.emit('error', { message: 'Failed to accept invitation' })
        return
      }

      // Notify folder owner
      const ownerSocketId = userSockets.get(invitation.folder.user_id)
      if (ownerSocketId) {
        io.to(ownerSocketId).emit('invitation:accepted', {
          invitationId,
          folderId: invitation.folder_id,
          userId: userData.userId
        })
      }

      socket.emit('invitation:accepted', {
        invitationId,
        folderId: invitation.folder_id,
        folderName: invitation.folder.name
      })

    } catch (error) {
      socket.emit('error', { message: 'Internal server error' })
    }
  })

  // Handle invitation decline
  socket.on('invitation:decline', async (data) => {
    try {
      const { invitationId } = data
      
      // Update invitation status
      const { error: updateError } = await supabase
        .from('folder_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId)
        .eq('invited_user_id', userData.userId)

      if (updateError) {
        socket.emit('error', { message: 'Failed to decline invitation' })
        return
      }

      socket.emit('invitation:declined', { invitationId })

    } catch (error) {
      socket.emit('error', { message: 'Internal server error' })
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    userSockets.delete(userData.userId)
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`)
})

// Export for use in other files
module.exports = { io, userSockets }
