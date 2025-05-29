import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../config/supabase'
import type { AuthState, AuthUser, AuthCredentials } from '../types/auth'

interface AuthContextType extends AuthState {
  signIn: (credentials: AuthCredentials) => Promise<void>
  signUp: (credentials: AuthCredentials) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at
        } : null,
        loading: false
      }))
    })

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState(prev => ({
          ...prev,
          user: session?.user ? {
            id: session.user.id,
            email: session.user.email!,
            created_at: session.user.created_at
          } : null,
          loading: false,
          error: null
        }))
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (credentials: AuthCredentials) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      if (error) throw error

      setState(prev => ({
        ...prev,
        user: data.user ? {
          id: data.user.id,
          email: data.user.email!,
          created_at: data.user.created_at
        } : null,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error de autenticación',
        loading: false
      }))
      throw error
    }
  }

  const signUp = async (credentials: AuthCredentials) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          emailRedirectTo: undefined // Sin validación de email
        }
      })

      if (error) throw error

      // Para registro sin validación de email, el usuario se crea inmediatamente
      setState(prev => ({
        ...prev,
        user: data.user ? {
          id: data.user.id,
          email: data.user.email!,
          created_at: data.user.created_at
        } : null,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al registrarse',
        loading: false
      }))
      throw error
    }
  }

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setState(prev => ({
        ...prev,
        user: null,
        loading: false,
        error: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al cerrar sesión',
        loading: false
      }))
    }
  }

  return (
    <AuthContext.Provider value={{
      ...state,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
} 