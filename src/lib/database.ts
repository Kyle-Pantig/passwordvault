import { createClient } from '@/lib/supabase/client'
import { encrypt, decrypt } from '@/lib/encryption'
import { Credential, CreateCredentialData, UpdateCredentialData, AdvancedCredentialField } from '@/lib/types'

export class DatabaseService {
  private supabase = createClient()

  private encryptCustomFields(fields: AdvancedCredentialField[]): AdvancedCredentialField[] {
    return fields.map(field => ({
      ...field,
      name: encrypt(field.name),
      value: encrypt(field.value)
    }))
  }

  private decryptCustomFields(fields: any): AdvancedCredentialField[] {
    // Handle case where fields might be an object, null, or undefined
    if (!fields || typeof fields !== 'object') {
      return []
    }
    
    // If it's an array, process it
    if (Array.isArray(fields)) {
      return fields.map(field => {
        try {
          const decryptedName = decrypt(field.name)
          const decryptedValue = decrypt(field.value)
          return {
            ...field,
            name: decryptedName,
            value: decryptedValue
          }
        } catch (error) {
          console.error('Custom field decryption error:', error)
          return {
            ...field,
            name: '[Decryption Error]',
            value: '[Decryption Error]'
          }
        }
      })
    }
    
    // If it's an object but not an array, return empty array
    return []
  }

  async getCredentials(): Promise<Credential[]> {
    try {
      const { data, error } = await this.supabase
        .from('credentials')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Database error:', error)
        throw new Error(`Failed to fetch credentials: ${error.message}`)
      }

      if (!data) {
        return []
      }

      // Decrypt passwords, usernames, and custom fields
      return data.map(cred => {
        let decryptedPassword = cred.password
        let decryptedUsername = cred.username
        let decryptedCustomFields = cred.custom_fields || []
        
        // Only decrypt if the fields exist
        if (cred.password) {
          try {
            decryptedPassword = decrypt(cred.password)
          } catch (passwordError) {
            console.error('Password decryption error for credential:', cred.id, passwordError)
            decryptedPassword = '[Decryption Error - Please re-enter password]'
          }
        }
        
        if (cred.username) {
          try {
            decryptedUsername = decrypt(cred.username)
          } catch (usernameError) {
            console.error('Username decryption error for credential:', cred.id, usernameError)
            decryptedUsername = '[Decryption Error - Please re-enter username]'
          }
        }
        
        try {
          if (cred.custom_fields) {
            decryptedCustomFields = this.decryptCustomFields(cred.custom_fields)
          }
        } catch (customFieldsError) {
          console.error('Custom fields decryption error for credential:', cred.id, customFieldsError)
          console.error('Custom fields data:', cred.custom_fields)
          decryptedCustomFields = []
        }
        
        return {
          ...cred,
          credential_type: cred.credential_type || 'basic',
          password: decryptedPassword,
          username: decryptedUsername,
          custom_fields: decryptedCustomFields,
          notes: cred.notes || ''
        }
      })
    } catch (error) {
      console.error('Error in getCredentials:', error)
      throw error
    }
  }

  async createCredential(credentialData: CreateCredentialData): Promise<Credential> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const insertData: any = {
      user_id: user.id,
      service_name: credentialData.service_name,
      service_url: credentialData.service_url,
      credential_type: credentialData.credential_type,
      custom_fields: credentialData.custom_fields 
        ? this.encryptCustomFields(credentialData.custom_fields)
        : [],
      notes: credentialData.notes || ''
    }

    // Only encrypt and include username/password if they exist
    if (credentialData.username) {
      insertData.username = encrypt(credentialData.username)
    }
    if (credentialData.password) {
      insertData.password = encrypt(credentialData.password)
    }
    
    const { data, error } = await this.supabase
      .from('credentials')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create credential: ${error.message}`)
    }

    return {
      ...data,
      credential_type: credentialData.credential_type,
      password: credentialData.password || undefined,
      username: credentialData.username || undefined,
      custom_fields: credentialData.custom_fields || [],
      notes: credentialData.notes || ''
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
    if (credentialData.custom_fields) {
      updateData.custom_fields = this.encryptCustomFields(credentialData.custom_fields)
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
      credential_type: credentialData.credential_type || data.credential_type || 'basic',
      password: credentialData.password || (data.password ? decrypt(data.password) : undefined),
      username: credentialData.username || (data.username ? decrypt(data.username) : undefined),
      custom_fields: credentialData.custom_fields || (data.custom_fields ? this.decryptCustomFields(data.custom_fields) : []),
      notes: credentialData.notes !== undefined ? credentialData.notes : (data.notes || '')
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
