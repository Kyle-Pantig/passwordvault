export interface AdvancedCredentialField {
  id: string
  name: string
  value: string
  isVisible: boolean
  showValue?: boolean
}

export type CredentialType = 'basic' | 'advanced'

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
  created_at: string
  updated_at: string
}

export interface CreateCredentialData {
  service_name: string
  service_url?: string
  credential_type: CredentialType
  username?: string
  password?: string
  custom_fields?: AdvancedCredentialField[]
  notes?: string
}

export interface UpdateCredentialData {
  service_name?: string
  service_url?: string
  credential_type?: CredentialType
  username?: string
  password?: string
  custom_fields?: AdvancedCredentialField[]
  notes?: string
}
