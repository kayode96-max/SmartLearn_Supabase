'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import LoginForm from '@/components/auth/LoginForm'
import SignUpForm from '@/components/auth/SignUpForm'
import ProfileSetup from '@/components/ProfileSetup'
import DebugAuth from '@/components/DebugAuth'
import DatabaseTest from '@/components/DatabaseTest'
import { GraduationCap, BookOpen, Users, TrendingUp } from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated, loading, user, profile } = useAuth()
  const [showSignUp, setShowSignUp] = useState(false)
  const router = useRouter()

  // Redirect to dashboard if user has profile
  useEffect(() => {
    if (isAuthenticated && profile && !loading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isAuthenticated && !loading) {
    // If user is authenticated but has no profile, show profile setup
    if (!profile) {
      return <ProfileSetup />
    }
    
    // User has profile, show loading while redirecting
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to SmartLearn
          </h1>
          <p className="text-gray-600">
            Redirecting to your dashboard...
          </p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-4">
            <GraduationCap className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">SmartLearn</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A comprehensive school management system for real-time grade tracking, 
            student-lecturer communication, and academic progress monitoring.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Course Management</h3>
            <p className="text-gray-600">
              Manage courses, assignments, and track academic progress in real-time.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Grades</h3>
            <p className="text-gray-600">
              Get instant notifications when grades are published and track performance.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Communication</h3>
            <p className="text-gray-600">
              Easy feedback system between students and lecturers for better learning.
            </p>
          </div>
        </div>

        {/* Auth Forms */}
        <div className="max-w-md mx-auto">
          {showSignUp ? (
            <SignUpForm onToggleForm={() => setShowSignUp(false)} />
          ) : (
            <LoginForm onToggleForm={() => setShowSignUp(true)} />
          )}
        </div>

        {/* Demo Info */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            🚀 Quick Start Guide
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <strong>For Students:</strong>
              <ul className="ml-4 mt-1 list-disc">
                <li>View your enrolled courses and assignments</li>
                <li>Check grades and feedback in real-time</li>
                <li>Query results and track academic progress</li>
                <li>Receive instant notifications for new grades</li>
              </ul>
            </div>
            <div>
              <strong>For Lecturers:</strong>
              <ul className="ml-4 mt-1 list-disc">
                <li>Manage courses and create assignments</li>
                <li>Grade students and provide feedback</li>
                <li>View student progress and analytics</li>
                <li>Send announcements and notifications</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <DebugAuth />
      <DatabaseTest />
    </div>
  )
}
