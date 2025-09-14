export interface AdvancedCredentialField {
  id: string
  value: string
  isMasked?: boolean
}

export type CredentialType = 'basic' | 'advanced'

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  created_at: string
  updated_at: string
}

export interface Credential {
  id: string
  user_id: string
  service_name: string
  service_url?: string
  credential_type: CredentialType
  username?: string
  password?: string
  custom_fields: AdvancedCredentialField[]
  notes?: string
  category_id?: string
  category?: Category
  created_at: string
  updated_at: string
  is_shared?: boolean
  shared_permission?: string
}

export interface CreateCredentialData {
  service_name: string
  service_url?: string
  credential_type: CredentialType
  username?: string
  password?: string
  custom_fields?: AdvancedCredentialField[]
  notes?: string
  category_id?: string
}

export interface UpdateCredentialData {
  service_name?: string
  service_url?: string
  credential_type?: CredentialType
  username?: string
  password?: string
  custom_fields?: AdvancedCredentialField[]
  notes?: string
  category_id?: string
}

export type FolderLockType = 'passcode_4' | 'passcode_6' | 'password'

export interface FolderLock {
  id: string
  user_id: string
  category_id: string
  lock_type: FolderLockType
  encrypted_lock_data: string
  salt: string
  created_at: string
  updated_at: string
  is_locked: boolean
  last_unlock_attempt?: string
  failed_attempts: number
  max_attempts: number
  lockout_until?: string
}

export interface CreateFolderLockData {
  category_id: string
  lock_type: FolderLockType
  passcode: string
}

export interface UnlockFolderData {
  category_id: string
  passcode: string
}

export interface CreateCategoryData {
  name: string
  color?: string
  icon?: string
}

export interface UpdateCategoryData {
  name?: string
  color?: string
  icon?: string
}
