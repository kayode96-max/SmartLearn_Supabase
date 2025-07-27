'use client'

import { useAuth } from '@/hooks/useAuth'
import { useGrades } from '@/hooks/useGrades'
import { useNotifications } from '@/hooks/useNotifications'
import Layout from '@/components/layout/Layout'
import { BookOpen, GraduationCap, Bell, TrendingUp, Clock, Users, Award } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Enrollment, Assignment } from '@/types'
import Link from 'next/link'

export default function DashboardPage() {
  const { profile, isStudent, isLecturer, isAuthenticated, loading } = useAuth()
  const { grades } = useGrades()
  const { notifications, unreadCount } = useNotifications()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const router = useRouter()

  // Redirect to home if not authenticated or no profile
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !profile) {
        router.push('/')
        return
      }
    }
  }, [isAuthenticated, profile, loading, router])

  const fetchDashboardData = useCallback(async () => {
    if (!profile) return

    try {
      if (isStudent) {
        // Fetch student enrollments
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select(`
            *,
            course:courses(*)
          `)
          .eq('student_id', profile.id)

        setEnrollments(enrollmentData || [])

        // Fetch upcoming assignments
        const courseIds = enrollmentData?.map(e => e.course_id) || []
        if (courseIds.length > 0) {
          const { data: assignmentData } = await supabase
            .from('assignments')
            .select(`
              *,
              course:courses(course_code, course_name)
            `)
            .in('course_id', courseIds)
            .gte('due_date', new Date().toISOString())
            .order('due_date', { ascending: true })
            .limit(5)

          setAssignments(assignmentData || [])
        }
      } else if (isLecturer) {
        // Fetch lecturer courses
        const { data: courseData } = await supabase
          .from('courses')
          .select('*')
          .eq('lecturer_id', profile.id)

        // Fetch recent assignments for lecturer's courses
        const courseIds = courseData?.map(c => c.id) || []
        if (courseIds.length > 0) {
          const { data: assignmentData } = await supabase
            .from('assignments')
            .select(`
              *,
              course:courses(course_code, course_name)
            `)
            .in('course_id', courseIds)
            .order('created_at', { ascending: false })
            .limit(5)

          setAssignments(assignmentData || [])
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setDashboardLoading(false)
    }
  }, [profile, isStudent, isLecturer])

  useEffect(() => {
    if (profile) {
      fetchDashboardData()
      
      // Subscribe to real-time updates for grades
      const gradesSubscription = supabase
        .channel('dashboard_grades')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'grades' }, fetchDashboardData)
        .subscribe()

      // Subscribe to real-time updates for enrollments
      const enrollmentsSubscription = supabase
        .channel('dashboard_enrollments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, fetchDashboardData)
        .subscribe()

      return () => {
        gradesSubscription.unsubscribe()
        enrollmentsSubscription.unsubscribe()
      }
    }
  }, [profile, fetchDashboardData])

  const getStudentStats = () => {
    const publishedGrades = grades.filter(g => g.status === 'published')
    const averageGrade = publishedGrades.length > 0
      ? publishedGrades.reduce((acc, g) => acc + (g.percentage || 0), 0) / publishedGrades.length
      : 0

    return {
      totalCourses: enrollments.length,
      totalGrades: publishedGrades.length,
      averageGrade: Math.round(averageGrade),
      upcomingAssignments: assignments.length
    }
  }

  const getLecturerStats = () => {
    const pendingGrades = grades.filter(g => g.status === 'draft')
    const publishedGrades = grades.filter(g => g.status === 'published')

    return {
      totalCourses: new Set(grades.map(g => g.course_id)).size,
      totalStudents: new Set(grades.map(g => g.student_id)).size,
      pendingGrades: pendingGrades.length,
      publishedGrades: publishedGrades.length
    }
  }

  const recentGrades = grades
    .filter(g => g.status === 'published')
    .slice(0, 5)

  const recentNotifications = notifications.slice(0, 5)

  // Show loading while auth is loading or while redirecting
  if (loading || !isAuthenticated || !profile) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (dashboardLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.full_name}!
          </h1>
          <p className="text-gray-600 mt-1">
            {isStudent ? 'Track your academic progress and stay updated with your courses.' 
                       : 'Manage your courses and monitor student progress.'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isStudent ? (
            <>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Enrolled Courses</p>
                    <p className="text-2xl font-bold text-gray-900">{getStudentStats().totalCourses}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <GraduationCap className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Total Grades</p>
                    <p className="text-2xl font-bold text-gray-900">{getStudentStats().totalGrades}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Average Grade</p>
                    <p className="text-2xl font-bold text-gray-900">{getStudentStats().averageGrade}%</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Upcoming Assignments</p>
                    <p className="text-2xl font-bold text-gray-900">{getStudentStats().upcomingAssignments}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">My Courses</p>
                    <p className="text-2xl font-bold text-gray-900">{getLecturerStats().totalCourses}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{getLecturerStats().totalStudents}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Pending Grades</p>
                    <p className="text-2xl font-bold text-gray-900">{getLecturerStats().pendingGrades}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <Award className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Published Grades</p>
                    <p className="text-2xl font-bold text-gray-900">{getLecturerStats().publishedGrades}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Grades */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {isStudent ? 'Recent Grades' : 'Recent Grading Activity'}
              </h2>
              <Link href="/grades" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentGrades.length > 0 ? (
                recentGrades.map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {grade.assignment?.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        {grade.course?.course_code} - {grade.course?.course_name}
                      </p>
                      {isLecturer && (
                        <p className="text-xs text-gray-500">
                          Student: {grade.student?.full_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{grade.marks_obtained}/{grade.total_marks}</p>
                      <p className="text-sm text-gray-600">{grade.grade_letter}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No grades available yet
                </p>
              )}
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Recent Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </h2>
              <Link href="/notifications" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((notification) => (
                  <div key={notification.id} className={`p-3 rounded-lg ${
                    notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-l-4 border-blue-600'
                  }`}>
                    <p className="font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No notifications yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isStudent ? (
              <>
                <Link href="/courses" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                  <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">View Courses</p>
                </Link>
                <Link href="/grades" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                  <GraduationCap className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">Check Grades</p>
                </Link>
                <Link href="/feedback" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                  <Bell className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">View Feedback</p>
                </Link>
              </>
            ) : (
              <>
                <Link href="/courses" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                  <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">Manage Courses</p>
                </Link>
                <Link href="/grades" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                  <GraduationCap className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">Grade Students</p>
                </Link>
                <Link href="/feedback" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                  <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">Student Feedback</p>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
