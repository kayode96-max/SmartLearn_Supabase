'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

export default function DatabaseTest() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    const results: any = {}

    try {
      // Test 1: Check if we can connect to Supabase
      const { data: authData } = await supabase.auth.getSession()
      results.auth_connection = {
        success: true,
        session_exists: !!authData.session,
        user_id: authData.session?.user?.id || null
      }

      // Test 2: Try to read from profiles table (should work with RLS)
      try {
        const { data: profilesData, error: profilesError, count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })

        results.profiles_read = {
          success: !profilesError,
          error: profilesError?.message || null,
          count: count || 0
        }
      } catch (err) {
        results.profiles_read = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }

      // Test 3: Check current user's profile if authenticated
      if (authData.session?.user) {
        try {
          const { data: userProfile, error: userProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.session.user.id)
            .maybeSingle()

          results.user_profile = {
            success: !userProfileError,
            error: userProfileError?.message || null,
            profile_exists: !!userProfile,
            profile: userProfile
          }
        } catch (err) {
          results.user_profile = {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          }
        }
      }

      // Test 4: Test other tables
      try {
        const { data: coursesData, error: coursesError, count } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })

        results.courses_read = {
          success: !coursesError,
          error: coursesError?.message || null,
          count: count || 0
        }
      } catch (err) {
        results.courses_read = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }

      setTestResults(results)
      toast.success('Database tests completed')
    } catch (error) {
      toast.error('Database tests failed')
      setTestResults({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const createTestProfile = async () => {
    const { data: authData } = await supabase.auth.getSession()
    if (!authData.session?.user) {
      toast.error('No authenticated user found')
      return
    }

    try {
      const testProfileData = {
        id: authData.session.user.id,
        email: authData.session.user.email!,
        full_name: 'Test User',
        role: 'student' as const
      }

      console.log('Creating test profile:', testProfileData)

      const { data, error } = await supabase
        .from('profiles')
        .insert(testProfileData)
        .select()
        .single()

      if (error) {
        console.error('Profile creation error:', error)
        toast.error(`Failed to create profile: ${error.message}`)
      } else {
        console.log('Profile created:', data)
        toast.success('Test profile created successfully!')
        runTests() // Re-run tests
      }
    } catch (error) {
      console.error('Profile creation exception:', error)
      toast.error('Failed to create test profile')
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return null // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg max-w-lg text-xs">
      <h3 className="font-bold mb-2">Database Test</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={runTests}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white disabled:opacity-50"
        >
          {loading ? 'Running Tests...' : 'Run Database Tests'}
        </button>
        
        <button
          onClick={createTestProfile}
          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white ml-2"
        >
          Create Test Profile
        </button>
      </div>
      
      {testResults && (
        <div className="bg-gray-800 p-2 rounded mt-2 overflow-x-auto max-h-64 overflow-y-auto">
          <pre>{JSON.stringify(testResults, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
