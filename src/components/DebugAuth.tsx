'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugAuth() {
  const [authState, setAuthState] = useState<any>(null)
  const [profileState, setProfileState] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        setAuthState({
          session: sessionData.session,
          user: sessionData.session?.user,
          error: sessionError
        })

        if (sessionData.session?.user) {
          // Try to fetch profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionData.session.user.id)
            .maybeSingle()

          setProfileState({
            profile: profileData,
            error: profileError,
            errorDetails: profileError ? {
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint,
              code: profileError.code
            } : null
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    checkAuth()
  }, [])

  if (process.env.NODE_ENV === 'production') {
    return null // Don't show debug info in production
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-4 rounded-lg max-w-md text-xs">
      <h3 className="font-bold mb-2">Debug Auth State</h3>
      
      <div className="mb-2">
        <strong>Auth Status:</strong>
        <pre className="bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
          {JSON.stringify(authState, null, 2)}
        </pre>
      </div>
      
      <div className="mb-2">
        <strong>Profile Status:</strong>
        <pre className="bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
          {JSON.stringify(profileState, null, 2)}
        </pre>
      </div>
      
      {error && (
        <div className="mb-2">
          <strong className="text-red-400">Error:</strong>
          <pre className="bg-red-900 p-2 rounded mt-1 overflow-x-auto">
            {error}
          </pre>
        </div>
      )}
    </div>
  )
}
