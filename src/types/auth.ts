export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  created_at: string
}

export interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
} 