// Production socket server
require('dotenv').config({ path: '.env.local' })

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
          if (socketId) {
            io.to(socketId).emit(event, data)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, message: 'Event emitted' }))
          } else {
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
    origin: process.env.NEXT_PUBLIC_APP_URL || "https://passwordvault-production.up.railway.app",
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
