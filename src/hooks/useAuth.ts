'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile, AuthUser } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!
        })
        await fetchProfile(session.user.id)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!
          })
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // Use maybeSingle instead of single to handle no results gracefully

      if (error) {
        console.error('Error fetching profile:', error)
        // Don't return early here, continue to check if data exists
      }

      if (data) {
        setProfile(data)
        setUser(prev => prev ? { ...prev, profile: data } : null)
      } else {
        // Profile doesn't exist yet - this is normal for new users
        console.log('No profile found for user:', userId)
        setProfile(null)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string, userData: Partial<Profile>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) throw error

    // Create profile only if user is confirmed (no email confirmation required)
    if (data.user && data.user.email_confirmed_at) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          ...userData
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw profileError
      }
    }

    return data
  }

  const signOut = async () => {
    try {
      console.log('Starting sign out process...')
      
      // Then sign out from Supabase first
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Supabase sign out error:', error)
        throw error
      }
      
      console.log('Supabase sign out successful')
      
      // Clear local state after successful Supabase sign out
      setUser(null)
      setProfile(null)
      console.log('Local state cleared')
      
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error

    setProfile(data)
    return data
  }

  const createProfile = async (userData: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')

    console.log('Creating profile with data:', userData)
    
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        ...userData
      })
      .select()
      .single()

    if (error) {
      console.error('Profile creation error:', error)
      throw error
    }

    console.log('Profile created successfully:', data)
    
    // Update local state immediately
    setProfile(data)
    setUser(prev => prev ? { ...prev, profile: data } : null)
    
    return data
  }

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    createProfile,
    isAuthenticated: !!user,
    isStudent: profile?.role === 'student',
    isLecturer: profile?.role === 'lecturer',
    isAdmin: profile?.role === 'admin'
  }
}
