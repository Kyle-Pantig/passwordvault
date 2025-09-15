// Production socket server
// In production, environment variables are set directly by Railway
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' })
}

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
      environment: 'production'
    }))
    return
  }
  
  // API endpoint to emit events from the main app
  if (req.method === 'POST' && req.url === '/api/emit') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const { event, userId, data } = JSON.parse(body)
        
        if (event && userId) {
          // Emit event to specific user
          const socketId = userSockets.get(userId)
          console.log(`Attempting to emit ${event} to user ${userId}, socket ID: ${socketId}`)
          console.log(`Current connected users:`, Array.from(userSockets.keys()))
          if (socketId) {
            io.to(socketId).emit(event, data)
            console.log(`Successfully emitted ${event} to user ${userId} with data:`, data)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, message: 'Event emitted' }))
          } else {
            console.log(`User ${userId} not connected, cannot emit ${event}`)
            console.log(`Available user IDs:`, Array.from(userSockets.keys()))
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: false, message: 'User not connected' }))
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, message: 'Missing event or userId' }))
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, message: 'Invalid JSON' }))
      }
    })
    return
  }
  
  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "https://digivault-sand.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  upgradeTimeout: 10000,
  allowEIO3: true
})

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
    console.log('Socket connection attempt from:', socket.handshake.address)
    const token = socket.handshake.auth.token
    
    if (!token) {
      console.log('No authentication token provided')
      return next(new Error('Authentication token required'))
    }

    console.log('Verifying token for user...')
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.log('Token verification failed:', error?.message)
      return next(new Error('Invalid authentication token'))
    }

    console.log('User authenticated:', user.email, user.id)
    // Store user data in socket
    socket.userData = {
      userId: user.id,
      email: user.email
    }

    next()
  } catch (error) {
    console.log('Authentication error:', error.message)
    next(new Error('Authentication failed'))
  }
})

// Handle socket connections
io.on('connection', (socket) => {
  const userData = socket.userData
  
  console.log(`User connected: ${userData.email} (${userData.userId}) - Socket ID: ${socket.id}`)
  console.log(`Total connected users: ${userSockets.size + 1}`)
  
  // Store user socket mapping
  userSockets.set(userData.userId, socket.id)
  console.log(`User socket mapping updated. Current mappings:`, Array.from(userSockets.entries()))

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
        .from('folder_sharing_invitations')
        .select('*, categories!inner(*)')
        .eq('id', invitationId)
        .eq('invited_email', userData.email)
        .single()

      if (invitationError || !invitation) {
        socket.emit('error', { message: 'Invitation not found' })
        return
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('folder_sharing_invitations')
        .update({ 
          status: 'accepted',
          invited_user_id: userData.userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (updateError) {
        socket.emit('error', { message: 'Failed to accept invitation' })
        return
      }

      // Notify folder owner
      const ownerSocketId = userSockets.get(invitation.owner_id)
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
        folderName: invitation.categories?.name || 'Unknown Folder'
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
        .from('folder_sharing_invitations')
        .update({ 
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('invited_email', userData.email)

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
    // Silent error handling
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  // Silent startup
})

// Export for use in other files
module.exports = { io, userSockets }
