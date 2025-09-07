import { createClient } from '@/lib/supabase/client'
import { encrypt, decrypt } from '@/lib/encryption'
import { Credential, CreateCredentialData, UpdateCredentialData } from '@/lib/types'

export class DatabaseService {
  private supabase = createClient()

  async getCredentials(): Promise<Credential[]> {
    const { data, error } = await this.supabase
      .from('credentials')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch credentials: ${error.message}`)
    }

    // Decrypt passwords and usernames
    return data.map(cred => ({
      ...cred,
      password: decrypt(cred.password),
      username: decrypt(cred.username)
    }))
  }

  async createCredential(credentialData: CreateCredentialData): Promise<Credential> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const encryptedPassword = encrypt(credentialData.password)
    const encryptedUsername = encrypt(credentialData.username)
    
    const { data, error } = await this.supabase
      .from('credentials')
      .insert({
        user_id: user.id,
        service_name: credentialData.service_name,
        service_url: credentialData.service_url,
        username: encryptedUsername,
        password: encryptedPassword
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create credential: ${error.message}`)
    }

    return {
      ...data,
      password: credentialData.password, // Return unencrypted password for display
      username: credentialData.username // Return unencrypted username for display
    }
  }

  async updateCredential(id: string, credentialData: UpdateCredentialData): Promise<Credential> {
    const updateData: Record<string, unknown> = { ...credentialData }
    
    // Encrypt password and username if they're being updated
    if (credentialData.password) {
      updateData.password = encrypt(credentialData.password)
    }
    if (credentialData.username) {
      updateData.username = encrypt(credentialData.username)
    }

    const { data, error } = await this.supabase
      .from('credentials')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update credential: ${error.message}`)
    }

    return {
      ...data,
      password: credentialData.password || decrypt(data.password),
      username: credentialData.username || decrypt(data.username)
    }
  }

  async deleteCredential(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('credentials')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete credential: ${error.message}`)
    }
  }
}

export const db = new DatabaseService()
