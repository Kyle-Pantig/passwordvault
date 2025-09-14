import { createClient } from '@/lib/supabase/server'
import { encrypt, safeDecrypt } from '@/lib/encryption'
import { Credential, CreateCredentialData, UpdateCredentialData, AdvancedCredentialField, Category, CreateCategoryData, UpdateCategoryData } from '@/lib/types'

export class DatabaseServiceServer {
  private async getSupabase() {
    return await createClient()
  }

  private encryptCustomFields(fields: AdvancedCredentialField[]): AdvancedCredentialField[] {
    return fields.map(field => ({
      id: field.id,
      value: field.value ? encrypt(field.value) : '',
      isMasked: field.isMasked || false
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
          // Check if the field has the required properties
          if (!field || typeof field !== 'object') {
            return {
              id: field?.id || `field-${Date.now()}`,
              value: '[Invalid Field]',
              isMasked: false
            }
          }

          // Only try to decrypt if the fields exist and are strings and look like encrypted data
          const isEncrypted = (text: string) => text && typeof text === 'string' && text.startsWith('U2FsdGVkX1')
          
          // Only handle value field - no name field needed
          let decryptedValue = ''
          
          if (field.value && isEncrypted(field.value)) {
            decryptedValue = safeDecrypt(field.value, '[Decryption Error]')
          } else {
            decryptedValue = field.value || ''
          }
          
          return {
            id: field.id || `field-${Date.now()}`,
            value: decryptedValue,
            isMasked: field.isMasked || false
          }
        } catch (error) {
          return {
            id: field?.id || `field-${Date.now()}`,
            value: '[Decryption Error]',
            isMasked: field?.isMasked || false
          }
        }
      })
    }
    
    // If it's an object but not an array, return empty array
    return []
  }

  async getCredentials(): Promise<Credential[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('credentials')
        .select(`
          *,
          category:categories(*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
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
          decryptedPassword = safeDecrypt(cred.password, '[Decryption Error - Please re-enter password]')
        }
        
        if (cred.username) {
          decryptedUsername = safeDecrypt(cred.username, '[Decryption Error - Please re-enter username]')
        }
        
        try {
          if (cred.custom_fields) {
            decryptedCustomFields = this.decryptCustomFields(cred.custom_fields)
          }
        } catch (customFieldsError) {
          decryptedCustomFields = []
        }
        
        return {
          ...cred,
          credential_type: cred.credential_type || 'basic',
          password: decryptedPassword,
          username: decryptedUsername,
          custom_fields: decryptedCustomFields,
          notes: cred.notes || '',
          category: cred.category || null
        }
      })
    } catch (error) {
      throw error
    }
  }

  async createCredential(credentialData: CreateCredentialData): Promise<Credential> {
    const supabase = await this.getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
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
      notes: credentialData.notes || '',
      category_id: credentialData.category_id || null
    }

    // Only encrypt and include username/password if they exist
    if (credentialData.username) {
      insertData.username = encrypt(credentialData.username)
    }
    if (credentialData.password) {
      insertData.password = encrypt(credentialData.password)
    }
    
    const { data, error } = await supabase
      .from('credentials')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create credential: ${error.message}`)
    }

    // If credential is added to a shared folder, share it with all users who have access to that folder
    if (credentialData.category_id) {
      try {
        // Get all users who have access to this folder
        const { data: sharedAccess, error: sharedError } = await supabase
          .from('shared_folder_access')
          .select('shared_with_user_id, permission_level')
          .eq('folder_id', credentialData.category_id)
          .eq('owner_id', user.id)

        if (!sharedError && sharedAccess && sharedAccess.length > 0) {
          // Create shared_credentials records for all users who have access to this folder
          const sharedCredsData = sharedAccess.map((access: any) => ({
            credential_id: data.id,
            folder_id: credentialData.category_id,
            owner_id: user.id,
            shared_with_user_id: access.shared_with_user_id,
            permission_level: access.permission_level
          }))

          await supabase
            .from('shared_credentials')
            .insert(sharedCredsData)
        }
      } catch (shareError) {
        // Don't fail credential creation if sharing fails
      }
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
    const supabase = await this.getSupabase()
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

    const { data, error } = await supabase
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
      password: credentialData.password || (data.password ? safeDecrypt(data.password, '[Decryption Error]') : undefined),
      username: credentialData.username || (data.username ? safeDecrypt(data.username, '[Decryption Error]') : undefined),
      custom_fields: credentialData.custom_fields || (data.custom_fields ? this.decryptCustomFields(data.custom_fields) : []),
      notes: credentialData.notes !== undefined ? credentialData.notes : (data.notes || '')
    }
  }

  async deleteCredential(id: string): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('credentials')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete credential: ${error.message}`)
    }
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }

      return data || []
    } catch (error) {
      throw error
    }
  }

  async createCategory(categoryData: CreateCategoryData): Promise<Category> {
    const supabase = await this.getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Check if category with same name already exists for this user
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('name', categoryData.name.trim())
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw new Error(`Failed to check for existing category: ${checkError.message}`)
    }

    if (existingCategory) {
      throw new Error('A folder with this name already exists. Please choose a different name.')
    }

    const insertData = {
      user_id: user.id,
      name: categoryData.name.trim(),
      color: categoryData.color || '#3B82F6',
      icon: categoryData.icon || 'folder'
    }
    
    const { data, error } = await supabase
      .from('categories')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw new Error('A folder with this name already exists. Please choose a different name.')
      }
      throw new Error(`Failed to create category: ${error.message}`)
    }

    return data
  }

  async updateCategory(id: string, categoryData: UpdateCategoryData): Promise<Category> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`)
    }

    return data
  }

  async deleteCategory(id: string, moveCredentialsTo?: string, deleteCredentials: boolean = false): Promise<void> {
    const supabase = await this.getSupabase()
    
    if (deleteCredentials) {
      // Delete all credentials in this category
      const { error: deleteError } = await supabase
        .from('credentials')
        .delete()
        .eq('category_id', id)
      
      if (deleteError) {
        throw new Error(`Failed to delete credentials: ${deleteError.message}`)
      }
    } else if (moveCredentialsTo) {
      // Move all credentials to the specified category
      const { error: moveError } = await supabase
        .from('credentials')
        .update({ category_id: moveCredentialsTo })
        .eq('category_id', id)
      
      if (moveError) {
        throw new Error(`Failed to move credentials: ${moveError.message}`)
      }
    } else {
      // If no move destination specified, throw an error
      throw new Error('Cannot delete folder with credentials. Please specify a destination folder or choose to delete all credentials.')
    }

    // Then delete the category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`)
    }
  }

  async moveCredentialsToCategory(credentialIds: string[], targetCategoryId: string | null): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('credentials')
      .update({ category_id: targetCategoryId })
      .in('id', credentialIds)

    if (error) {
      throw new Error(`Failed to move credentials: ${error.message}`)
    }
  }

  async getCredentialsInCategory(categoryId: string): Promise<Credential[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('credentials')
        .select(`
          id,
          service_name,
          service_url,
          credential_type,
          created_at,
          updated_at,
          category_id
        `)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch credentials: ${error.message}`)
      }

      if (!data) {
        return []
      }

      // Return credentials without decryption for the delete dialog
      return data.map(cred => ({
        ...cred,
        user_id: '', // Not needed for display
        username: undefined,
        password: undefined,
        custom_fields: [],
        notes: undefined,
        category: undefined
      }))
    } catch (error) {
      throw error
    }
  }
}

export const dbServer = new DatabaseServiceServer()
