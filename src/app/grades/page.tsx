'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useGrades } from '@/hooks/useGrades'
import Layout from '@/components/layout/Layout'
import { supabase } from '@/lib/supabase'
import { Grade, Course } from '@/types'
import { Search, Download, Plus, Edit, Eye } from 'lucide-react'
import { toast } from 'react-hot-toast'
import QuickGradeEntry from '@/components/grades/QuickGradeEntry'

export default function GradesPage() {
  const { profile, isStudent, isLecturer } = useAuth()
  const { grades, updateGrade, publishGrade } = useGrades()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedCourse, setSelectedCourse] = useState('all')
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null)
  const [showQuickEntry, setShowQuickEntry] = useState(false)

  const fetchData = useCallback(async () => {
    if (!profile) return

    try {
      if (isStudent) {
        // Fetch student's courses
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course:courses(*)')
          .eq('student_id', profile.id)

        const studentCourses = enrollments?.map(e => e.course as unknown as Course).filter(Boolean) || []
        setCourses(studentCourses)
      } else if (isLecturer) {
        // Fetch lecturer's courses
        const { data: lecturerCourses } = await supabase
          .from('courses')
          .select('*')
          .eq('lecturer_id', profile.id)

        setCourses(lecturerCourses || [])
      }
    } catch {
      console.error('Error fetching data')
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [profile, isStudent, isLecturer])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredGrades = grades.filter(grade => {
    const matchesSearch = searchTerm === '' || 
      grade.course?.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.assignment?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || grade.status === statusFilter
    const matchesCourse = selectedCourse === 'all' || grade.course_id === selectedCourse

    return matchesSearch && matchesStatus && matchesCourse
  })

  const handlePublishGrade = async (gradeId: string) => {
    try {
      await publishGrade(gradeId)
      toast.success('Grade published successfully!')
    } catch {
      toast.error('Failed to publish grade')
    }
  }

  const handleEditGrade = async () => {
    if (!editingGrade) return

    try {
      await updateGrade(editingGrade.id, {
        marks_obtained: editingGrade.marks_obtained,
        lecturer_comments: editingGrade.lecturer_comments
      })
      setEditingGrade(null)
      toast.success('Grade updated successfully!')
    } catch {
      toast.error('Failed to update grade')
    }
  }

  const getGradeColor = (percentage?: number) => {
    if (!percentage) return 'text-gray-500'
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 80) return 'text-blue-600'
    if (percentage >= 70) return 'text-yellow-600'
    if (percentage >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  if (loading) {
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isStudent ? 'My Grades' : 'Student Grades'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isStudent ? 'View your academic performance and feedback' : 'Manage and publish student grades'}
            </p>
          </div>
          
          {isLecturer && (
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowQuickEntry(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Quick Entry</span>
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Grade</span>
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search grades..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="revised">Revised</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} - {course.course_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grades Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {isLecturer && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGrades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50">
                    {isLecturer && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {grade.student?.full_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {grade.student?.student_id}
                          </p>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {grade.course?.course_code}
                        </p>
                        <p className="text-sm text-gray-500">
                          {grade.course?.course_name}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">
                        {grade.assignment?.title}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg font-bold text-gray-900">
                          {grade.marks_obtained || 0}
                        </span>
                        <span className="text-gray-500 mx-1">/</span>
                        <span className="text-gray-700">
                          {grade.total_marks}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg font-bold ${getGradeColor(grade.percentage)}`}>
                          {grade.percentage?.toFixed(1) || '0.0'}%
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getGradeColor(grade.percentage)} bg-opacity-10`}>
                          {grade.grade_letter}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        grade.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : grade.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {grade.status.charAt(0).toUpperCase() + grade.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {isStudent ? (
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingGrade(grade)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {grade.status === 'draft' && (
                              <button
                                onClick={() => handlePublishGrade(grade.id)}
                                className="text-green-600 hover:text-green-900 text-xs"
                              >
                                Publish
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredGrades.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No grades found matching your criteria</p>
            </div>
          )}
        </div>

        {/* Statistics */}
        {isStudent && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Average</h3>
              <p className="text-3xl font-bold text-blue-600">
                {filteredGrades.length > 0
                  ? (filteredGrades.reduce((acc, g) => acc + (g.percentage || 0), 0) / filteredGrades.length).toFixed(1)
                  : '0.0'
                }%
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Highest Grade</h3>
              <p className="text-3xl font-bold text-green-600">
                {filteredGrades.length > 0
                  ? Math.max(...filteredGrades.map(g => g.percentage || 0)).toFixed(1)
                  : '0.0'
                }%
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Grades</h3>
              <p className="text-3xl font-bold text-purple-600">
                {filteredGrades.length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Grade Modal */}
      {editingGrade && isLecturer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Grade</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Marks Obtained
                </label>
                <input
                  type="number"
                  value={editingGrade.marks_obtained || 0}
                  onChange={(e) => setEditingGrade({
                    ...editingGrade,
                    marks_obtained: Number(e.target.value)
                  })}
                  max={editingGrade.total_marks}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Comments
                </label>
                <textarea
                  value={editingGrade.lecturer_comments || ''}
                  onChange={(e) => setEditingGrade({
                    ...editingGrade,
                    lecturer_comments: e.target.value
                  })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add feedback for the student..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingGrade(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleEditGrade}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Grade Entry Modal */}
      {showQuickEntry && (
        <QuickGradeEntry
          onClose={() => setShowQuickEntry(false)}
          onGradeAdded={() => {
            fetchData()
            setShowQuickEntry(false)
          }}
        />
      )}
    </Layout>
  )
}
