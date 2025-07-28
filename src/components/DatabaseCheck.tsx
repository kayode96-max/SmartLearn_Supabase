'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface DatabaseStatus {
  assignments: boolean
  grades: boolean
  courses: boolean
  profiles: boolean
  enrollments: boolean
  message: string
}

export default function DatabaseCheck() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkDatabase()
  }, [])

  const checkDatabase = async () => {
    try {
      const results = {
        assignments: false,
        grades: false,
        courses: false,
        profiles: false,
        enrollments: false,
        message: ''
      }

      // Test assignments table
      try {
        const { data, error } = await supabase
          .from('assignments')
          .select('id, title, assignment_type, max_points, instructor_id')
          .limit(1)
        
        results.assignments = !error
        if (error) results.message += `Assignments error: ${error.message}. `
      } catch (error) {
        results.message += `Assignments table issue. `
      }

      // Test grades table
      try {
        const { data, error } = await supabase
          .from('grades')
          .select('id, student_id, course_id, assignment_id')
          .limit(1)
        
        results.grades = !error
        if (error) results.message += `Grades error: ${error.message}. `
      } catch (error) {
        results.message += `Grades table issue. `
      }

      // Test courses table
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, course_code, lecturer_id')
          .limit(1)
        
        results.courses = !error
        if (error) results.message += `Courses error: ${error.message}. `
      } catch (error) {
        results.message += `Courses table issue. `
      }

      // Test profiles table
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role, full_name')
          .limit(1)
        
        results.profiles = !error
        if (error) results.message += `Profiles error: ${error.message}. `
      } catch (error) {
        results.message += `Profiles table issue. `
      }

      // Test enrollments table
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('id, student_id, course_id')
          .limit(1)
        
        results.enrollments = !error
        if (error) results.message += `Enrollments error: ${error.message}. `
      } catch (error) {
        results.message += `Enrollments table issue. `
      }

      if (!results.message) {
        results.message = 'All database tables are accessible!'
      }

      setStatus(results)
    } catch (error) {
      setStatus({
        assignments: false,
        grades: false,
        courses: false,
        profiles: false,
        enrollments: false,
        message: 'Database connection failed'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium mb-4">Database Status Check</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    )
  }

  if (!status) return null

  const allGood = Object.values(status).slice(0, 5).every(val => val === true)

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center">
        Database Status Check
        {allGood ? (
          <CheckCircle className="h-5 w-5 text-green-500 ml-2" />
        ) : (
          <AlertCircle className="h-5 w-5 text-yellow-500 ml-2" />
        )}
      </h3>
      
      <div className="space-y-2 mb-4">
        {Object.entries(status).slice(0, 5).map(([table, isWorking]) => (
          <div key={table} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 capitalize">{table} Table:</span>
            <div className="flex items-center">
              {isWorking ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={`ml-2 text-sm ${isWorking ? 'text-green-600' : 'text-red-600'}`}>
                {isWorking ? 'OK' : 'Error'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
        <strong>Status:</strong> {status.message}
      </div>

      {!allGood && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> If you see database errors, you may need to:
          </p>
          <ul className="text-sm text-yellow-700 mt-2 ml-4 list-disc">
            <li>Run the database migration from <code>migration_update_assignments.sql</code></li>
            <li>Check your Supabase connection and permissions</li>
            <li>Verify that all tables exist in your database</li>
          </ul>
        </div>
      )}

      <button
        onClick={checkDatabase}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
      >
        Recheck Database
      </button>
    </div>
  )
}
