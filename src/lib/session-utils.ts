import { createClient } from '@/lib/supabase/client'

export interface SessionInfo {
  id: string
  deviceInfo: string | null
  ipAddress: string | null
  lastActivity: string
  createdAt: string
  expiresAt: string
}

export class SessionManager {
  private supabase = createClient()

  /**
   * Register a new session in the database
   */
  async registerSession(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/sessions/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to register session' 
      }
    }
  }

  /**
   * Validate the current session
   */
  async validateSession(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch('/api/sessions/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { valid: false, error: errorData.error }
      }

      const data = await response.json()
      return { valid: data.valid }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Failed to validate session' 
      }
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupSessions(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/sessions/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cleanup sessions' 
      }
    }
  }

  /**
   * Get user's active sessions (for admin purposes)
   */
  async getUserSessions(): Promise<{ sessions: SessionInfo[]; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      
      if (!user) {
        return { sessions: [], error: 'Not authenticated' }
      }

      const { data: sessions, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false })

      if (error) {
        return { sessions: [], error: error.message }
      }

      return { sessions: sessions || [] }
    } catch (error) {
      return { 
        sessions: [], 
        error: error instanceof Error ? error.message : 'Failed to get sessions' 
      }
    }
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      
      if (!user) {
        return { success: false, error: 'Not authenticated' }
      }

      const { error } = await this.supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', sessionId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to terminate session' 
      }
    }
  }
}

// Export a singleton instance
export const sessionManager = new SessionManager()
