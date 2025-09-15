'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import io from 'socket.io-client'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'

interface SocketContextType {
  socket: any | null
  isConnected: boolean
  emit: (event: string, data: any) => void
  on: (event: string, callback: (data: any) => void) => void
  off: (event: string, callback?: (data: any) => void) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<any | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    // Get the session token
    const getSessionToken = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token
    }

    // Initialize socket connection with retry logic
    const initSocket = async () => {
      const token = await getSessionToken()
      // Use the Railway socket server URL for production
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://passwordvault-production.up.railway.app'
          : 'http://localhost:3001')
      
      const newSocket = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000, // 20 second timeout
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        forceNew: true
      })

      newSocket.on('connect', () => {
        setIsConnected(true)
        setConnectionAttempts(0) // Reset attempts on successful connection
      })

      newSocket.on('disconnect', (reason: any) => {
        setIsConnected(false)
      })

      newSocket.on('connect_error', (error: any) => {
        console.error('Socket connection error:', error)
        setIsConnected(false)
        setConnectionAttempts(prev => {
          const newAttempts = prev + 1
          // If too many failed attempts, show a warning
          if (newAttempts >= 3) {
            console.warn('Socket connection failed multiple times. Real-time features may not work.')
          }
          return newAttempts
        })
      })

      newSocket.on('reconnect', (attemptNumber: any) => {
        setIsConnected(true)
        setConnectionAttempts(0)
      })

      newSocket.on('reconnect_attempt', (attemptNumber: any) => {
      })

      newSocket.on('reconnect_error', (error: any) => {
        console.error('Socket reconnection error:', error)
      })

      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed')
        setIsConnected(false)
      })

      setSocket(newSocket)
    }

    initSocket()

    return () => {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [user, connectionAttempts])

  const emit = (event: string, data: any) => {
    if (socket && isConnected) {
      try {
        socket.emit(event, data)
      } catch (error) {
        console.error('Error emitting socket event:', error)
      }
    } else {
      console.warn('Cannot emit socket event - socket not connected:', { socket: !!socket, isConnected })
    }
  }

  const on = (event: string, callback: (data: any) => void) => {
    if (socket) {
      try {
        socket.on(event, callback)
      } catch (error) {
        console.error('Error adding socket listener:', error)
      }
    } else {
      console.warn('Cannot add socket listener - socket not available')
    }
  }

  const off = (event: string, callback?: (data: any) => void) => {
    if (socket) {
      try {
        socket.off(event, callback)
      } catch (error) {
        console.error('Error removing socket listener:', error)
      }
    } else {
      console.warn('Cannot remove socket listener - socket not available')
    }
  }

  const value: SocketContextType = {
    socket,
    isConnected,
    emit,
    on,
    off
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
