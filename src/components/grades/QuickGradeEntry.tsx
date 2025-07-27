'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useGrades } from '@/hooks/useGrades'
import { supabase } from '@/lib/supabase'
import { Grade, Assignment, Course } from '@/types'
import { Plus, Save, X, Users, BookOpen, ClipboardList } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface QuickGradeEntryProps {
  onClose: () => void
  onGradeAdded: () => void
}

export default function QuickGradeEntry({ onClose, onGradeAdded }: QuickGradeEntryProps) {
  const { profile } = useAuth()
  const { addGrade } = useGrades()
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedAssignment, setSelectedAssignment] = useState('')
  const [grades, setGrades] = useState<{ [studentId: string]: { marks: number; comments: string } }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile?.role === 'lecturer') {
      fetchCourses()
    }
  }, [profile])

  useEffect(() => {
    if (selectedCourse) {
      fetchAssignments()
      fetchStudents()
    }
  }, [selectedCourse])

  const fetchCourses = async () => {
    try {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('lecturer_id', profile?.id)
        .order('course_name')

      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchAssignments = async () => {
    try {
      const { data } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', selectedCourse)
        .order('title')

      setAssignments(data || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      const { data } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          student:profiles!enrollments_student_id_fkey(
            id,
            full_name,
            student_id
          )
        `)
        .eq('course_id', selectedCourse)
        .eq('status', 'active')

      const studentsData = data?.map(e => e.student).filter(Boolean) || []
      setStudents(studentsData)
      
      // Initialize grades object
      const initialGrades: { [studentId: string]: { marks: number; comments: string } } = {}
      studentsData.forEach((student: any) => {
        if (student?.id) {
          initialGrades[student.id] = { marks: 0, comments: '' }
        }
      })
      setGrades(initialGrades)
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const handleGradeChange = (studentId: string, field: 'marks' | 'comments', value: string | number) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }))
  }

  const handleSaveAll = async () => {
    if (!selectedAssignment || students.length === 0) {
      toast.error('Please select an assignment and ensure students are enrolled')
      return
    }

    setLoading(true)
    try {
      const assignment = assignments.find(a => a.id === selectedAssignment)
      if (!assignment) return

      const gradePromises = students.map(async (student) => {
        const gradeData = grades[student.id]
        if (gradeData.marks > 0) {
          return addGrade({
            student_id: student.id,
            course_id: selectedCourse,
            assignment_id: selectedAssignment,
            marks_obtained: gradeData.marks,
            total_marks: assignment.max_points,
            lecturer_comments: gradeData.comments,
            status: 'published',
            graded_by: profile?.id,
            graded_at: new Date().toISOString()
          })
        }
      })

      await Promise.all(gradePromises.filter(Boolean))
      
      toast.success('Grades saved successfully!')
      onGradeAdded()
      onClose()
    } catch (error) {
      console.error('Error saving grades:', error)
      toast.error('Failed to save grades')
    } finally {
      setLoading(false)
    }
  }

  const selectedAssignmentData = assignments.find(a => a.id === selectedAssignment)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Quick Grade Entry</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Course and Assignment Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="inline h-4 w-4 mr-1" />
                Course *
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a course...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} - {course.course_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ClipboardList className="inline h-4 w-4 mr-1" />
                Assignment *
              </label>
              <select
                value={selectedAssignment}
                onChange={(e) => setSelectedAssignment(e.target.value)}
                disabled={!selectedCourse}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select an assignment...</option>
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.title} (Total: {assignment.max_points} marks)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignment Info */}
          {selectedAssignmentData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">{selectedAssignmentData.title}</h3>
              <p className="text-blue-700 text-sm mb-2">{selectedAssignmentData.description}</p>
              <div className="flex items-center space-x-4 text-sm text-blue-600">
                <span>Total Marks: {selectedAssignmentData.max_points}</span>
                {selectedAssignmentData.due_date && (
                  <span>Due: {new Date(selectedAssignmentData.due_date).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          )}

          {/* Students and Grades */}
          {students.length > 0 && selectedAssignment && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  Enter Grades for {students.length} Students
                </h3>
              </div>

              <div className="space-y-4">
                {students.map((student) => (
                  <div key={student.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{student.full_name}</h4>
                        <p className="text-sm text-gray-500">ID: {student.student_id}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Marks (out of {selectedAssignmentData?.max_points})
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={selectedAssignmentData?.max_points}
                          value={grades[student.id]?.marks || 0}
                          onChange={(e) => handleGradeChange(student.id, 'marks', Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Comments (optional)
                        </label>
                        <textarea
                          rows={2}
                          value={grades[student.id]?.comments || ''}
                          onChange={(e) => handleGradeChange(student.id, 'comments', e.target.value)}
                          placeholder="Feedback for student..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Grade Calculation */}
                    {grades[student.id]?.marks > 0 && selectedAssignmentData && (
                      <div className="mt-3 flex items-center space-x-4 text-sm">
                        <span className="text-gray-600">
                          Percentage: {((grades[student.id].marks / selectedAssignmentData.max_points) * 100).toFixed(1)}%
                        </span>
                        <span className={`font-medium ${
                          ((grades[student.id].marks / selectedAssignmentData.max_points) * 100) >= 60 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {((grades[student.id].marks / selectedAssignmentData.max_points) * 100) >= 90 ? 'A' :
                           ((grades[student.id].marks / selectedAssignmentData.max_points) * 100) >= 80 ? 'B' :
                           ((grades[student.id].marks / selectedAssignmentData.max_points) * 100) >= 70 ? 'C' :
                           ((grades[student.id].marks / selectedAssignmentData.max_points) * 100) >= 60 ? 'D' : 'F'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No students message */}
          {selectedCourse && students.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Enrolled</h3>
              <p className="text-gray-500">This course doesn't have any enrolled students yet.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            disabled={loading || !selectedAssignment || students.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving...' : 'Save All Grades'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
