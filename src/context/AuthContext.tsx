import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { Profile, UserRole } from '@/types/database'

export interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  role: UserRole | null
  isLoading: boolean
  profileMissing: boolean
  error: string | null
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null; role?: UserRole }>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profileMissing, setProfileMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Securely loads profile directly from the database using the authenticated user id.
   * Never trusts client-provided role data.
   */
  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('[Auth] Error fetching profile:', profileError.message)
        setProfile(null)
        setRole(null)
        setProfileMissing(true)
        return null
      }

      if (!data) {
        // auth.users exists, but public.profiles record is missing
        console.warn('[Auth] No profile record found for authenticated user:', userId)
        setProfile(null)
        setRole(null)
        setProfileMissing(true)
        return null
      }

      setProfile(data)
      setRole(data.role)
      setProfileMissing(false)
      return data
    } catch (err) {
      console.error('[Auth] Unexpected error during profile load:', err)
      setProfile(null)
      setRole(null)
      setProfileMissing(true)
      return null
    }
  }, [])

  // Initialize session and auth listener
  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('[Auth] Failed to retrieve session:', sessionError.message)
          if (isMounted) {
            setUser(null)
            setSession(null)
            setProfile(null)
            setRole(null)
            setIsLoading(false)
          }
          return
        }

        if (initialSession?.user) {
          if (isMounted) {
            setSession(initialSession)
            setUser(initialSession.user)
          }
          await loadProfile(initialSession.user.id)
        } else {
          if (isMounted) {
            setSession(null)
            setUser(null)
            setProfile(null)
            setRole(null)
          }
        }
      } catch (err) {
        console.error('[Auth] Error during auth initialization:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes (sign in, sign out, token refresh, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          await loadProfile(newSession.user.id)
        } else {
          setProfile(null)
          setRole(null)
          setProfileMissing(false)
        }

        setIsLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }, [user, loadProfile])

  const signInWithPassword = async (email: string, password: string) => {
    setError(null)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        const msg =
          signInError.message === 'Invalid login credentials'
            ? 'Invalid email or password. Please verify your credentials.'
            : signInError.message
        setError(msg)
        return { error: msg }
      }

      if (data.user) {
        setUser(data.user)
        setSession(data.session)
        const userProfile = await loadProfile(data.user.id)
        return { error: null, role: userProfile?.role ?? 'member' }
      }

      return { error: 'Authentication failed. Please try again.' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during sign in.'
      setError(msg)
      return { error: msg }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('[Auth] Error during signOut:', err)
    } finally {
      setUser(null)
      setSession(null)
      setProfile(null)
      setRole(null)
      setProfileMissing(false)
      setError(null)
    }
  }

  const sendPasswordReset = async (email: string) => {
    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (resetError) {
        return { error: resetError.message }
      }

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to send password reset email.' }
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        return { error: updateError.message }
      }

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update password.' }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    isLoading,
    profileMissing,
    error,
    signInWithPassword,
    signOut,
    sendPasswordReset,
    updatePassword,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
