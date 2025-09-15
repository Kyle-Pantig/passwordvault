// Utility to emit socket events from API routes to the standalone socket server

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 
  (process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL?.replace('3000', '3001') || 'https://passwordvault-production.up.railway.app'
    : 'http://localhost:3001')

export async function emitToSocketServer(event: string, userId: string, data: any) {
  try {
    const response = await fetch(`${SOCKET_SERVER_URL}/api/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        userId,
        data
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.warn(`Failed to emit socket event: ${result.message}`)
      return false
    }

    return result.success
  } catch (error) {
    console.error('Error emitting socket event:', error)
    return false
  }
}

export async function emitToUser(userId: string, event: string, data: any) {
  return emitToSocketServer(event, userId, data)
}
