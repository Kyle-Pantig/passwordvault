export interface Credential {
  id: string
  user_id: string
  service_name: string
  service_url?: string
  username: string
  password: string
  created_at: string
  updated_at: string
}

export interface CreateCredentialData {
  service_name: string
  service_url?: string
  username: string
  password: string
}

export interface UpdateCredentialData {
  service_name?: string
  service_url?: string
  username?: string
  password?: string
}
