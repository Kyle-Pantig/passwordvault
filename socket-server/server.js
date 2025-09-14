// Load environment variables from parent directory
require('dotenv').config({ path: '../.env.local' })

const { createServer } = require('http')
const { Server } = require('socket.io')
const { createClient } = require('@supabase/supabase-js')

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    }))
    return
  }
  
  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL 
      : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  connectTimeout: 45000, // 45 seconds
  upgradeTimeout: 10000, // 10 seconds
  allowEIO3: true
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
  
  console.log(`User connected: ${userData.email} (${userData.userId})`)
  
  // Store user socket mapping
  userSockets.set(userData.userId, socket.id)

  // Join user to their personal room
  socket.join(`user:${userData.userId}`)
  
  // Send connection confirmation
  socket.emit('connected', { 
    message: 'Connected to socket server',
    userId: userData.userId 
  })

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
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${userData.email} (${userData.userId}) - Reason: ${reason}`)
    userSockets.delete(userData.userId)
  })
  
  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for user ${userData.email}:`, error)
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket server running on port ${PORT}`)
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 CORS origin: ${process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL : 'http://localhost:3000'}`)
  console.log(`🔗 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`)
  console.log(`🔑 Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`)
})

// Export for use in other files
module.exports = { io, userSockets }
