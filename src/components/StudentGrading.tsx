'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Assignment, Course, Grade } from '@/types'
import { Save, X, Users, BookOpen, Plus, Edit, Download } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface StudentProfile {
  id: string
  full_name: string
  student_id: string
  email: string
  department?: string
  year_of_study?: number
}

interface StudentGradingProps {
  course: Course
  onClose: () => void
  onGradeAdded?: () => void
}

interface StudentGrade {
  assignment_score: number
  test_score: number
  examination_score: number
  attendance_score: number
  classwork_score: number
  assignment_comments: string
  test_comments: string
  examination_comments: string
  attendance_comments: string
  classwork_comments: string
}

export default function StudentGrading({ course, onClose, onGradeAdded }: StudentGradingProps) {
  const { profile } = useAuth()
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [grades, setGrades] = useState<{ [studentId: string]: StudentGrade }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStudents()
  }, [course.id])

  const fetchStudents = async () => {
    try {
      const { data } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          student:profiles!enrollments_student_id_fkey(
            id,
            full_name,
            student_id,
            email,
            department,
            year_of_study
          )
        `)
        .eq('course_id', course.id)
        .eq('status', 'active')

      const studentsData = data?.map(e => e.student).filter(Boolean) || []
      setStudents(studentsData.flat() as StudentProfile[])
      
      // Initialize grades for all students
      const initialGrades: { [studentId: string]: StudentGrade } = {}
      studentsData.forEach((student: any) => {
        if (student?.id) {
          initialGrades[student.id] = {
            assignment_score: 0,
            test_score: 0,
            examination_score: 0,
            attendance_score: 0,
            classwork_score: 0,
            assignment_comments: '',
            test_comments: '',
            examination_comments: '',
            attendance_comments: '',
            classwork_comments: ''
          }
        }
      })
      setGrades(initialGrades)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to fetch students')
    }
  }

  const handleGradeChange = (studentId: string, field: keyof StudentGrade, value: string | number) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }))
  }

  const saveAllGrades = async () => {
    if (students.length === 0) {
      toast.error('No students to grade')
      return
    }

    setLoading(true)
    try {
      const assessmentTypes = ['assignment', 'test', 'examination', 'attendance', 'classwork']
      
      for (const type of assessmentTypes) {

        // Set max_points based on assessment type
        let maxPoints = 10;
        if (type === 'assignment') maxPoints = 10;
        else if (type === 'attendance') maxPoints = 5;
        else if (type === 'classwork') maxPoints = 5;
        else if (type === 'test') maxPoints = 20;
        else if (type === 'examination') maxPoints = 60;

        // Create a generic assignment for each assessment type
        const { data: assignment, error: assignmentError } = await supabase
          .from('assignments')
          .insert({
            course_id: course.id,
            instructor_id: profile?.id,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Scores`,
            description: `Direct ${type} scoring`,
            assignment_type: type,
            max_points: maxPoints,
            due_date: new Date().toISOString()
          })
          .select()
          .single()

        if (assignmentError) {
          console.error(`Error creating ${type} assignment:`, assignmentError)
          continue
        }

        // Save grades for students who have scores for this assessment type
        const gradePromises = students.map(async (student) => {
          const scoreField = `${type}_score` as keyof StudentGrade
          const commentField = `${type}_comments` as keyof StudentGrade
          const score = Number(grades[student.id]?.[scoreField] || 0)
          const comments = grades[student.id]?.[commentField] || ''
          
          if (score > 0) {
            return supabase
              .from('grades')
              .insert({
                student_id: student.id,
                course_id: course.id,
                assignment_id: assignment.id,
                marks_obtained: score,
                total_marks: maxPoints,
                lecturer_comments: comments,
                status: 'published',
                graded_by: profile?.id,
                graded_at: new Date().toISOString()
              })
          }
        })

        await Promise.all(gradePromises.filter(Boolean))
      }
      
      toast.success('All grades saved successfully!')
      onGradeAdded?.()
      onClose()
    } catch (error) {
      console.error('Error saving grades:', error)
      toast.error('Failed to save grades')
    } finally {
      setLoading(false)
    }
  }

  const exportGrades = () => {
    const csvContent = [
      ['Student ID', 'Full Name', 'Assignment', 'Test', 'Examination', 'Attendance', 'Classwork'],
      ...students.map(student => [
        student.student_id || '',
        student.full_name || '',
        grades[student.id]?.assignment_score || 0,
        grades[student.id]?.test_score || 0,
        grades[student.id]?.examination_score || 0,
        grades[student.id]?.attendance_score || 0,
        grades[student.id]?.classwork_score || 0
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${course.course_code}_grades_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Grade Students - {course.course_code}
            </h2>
            <p className="text-sm text-gray-600">{course.course_name}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportGrades}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={saveAllGrades}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Save All Grades</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          {students.length > 0 ? (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Student Grading Table ({students.length} students)
                </h3>
                <p className="text-sm text-gray-600">
                  Enter scores out of 100 for each assessment type. Leave blank or 0 for no score.
                </p>
              </div>

              {/* Grading Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Student Info
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Assignment<br/><span className="text-xs normal-case">(0-100)</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Test<br/><span className="text-xs normal-case">(0-100)</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Examination<br/><span className="text-xs normal-case">(0-100)</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Attendance<br/><span className="text-xs normal-case">(0-100)</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Classwork<br/><span className="text-xs normal-case">(0-100)</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student, index) => (
                      <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {/* Student Info */}
                        <td className="px-4 py-4 border-r border-gray-300">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">{student.full_name}</div>
                            <div className="text-sm text-gray-500">ID: {student.student_id}</div>
                            <div className="text-xs text-gray-400">{student.email}</div>
                          </div>
                        </td>

                        {/* Assignment Score */}
                        <td className="px-4 py-4 border-r border-gray-300">
                          <div className="space-y-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Score"
                              value={grades[student.id]?.assignment_score || ''}
                              onChange={(e) => handleGradeChange(student.id, 'assignment_score', Number(e.target.value))}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-center"
                            />
                            <input
                              type="text"
                              placeholder="Comments..."
                              value={grades[student.id]?.assignment_comments || ''}
                              onChange={(e) => handleGradeChange(student.id, 'assignment_comments', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                            />
                          </div>
                        </td>

                        {/* Test Score */}
                        <td className="px-4 py-4 border-r border-gray-300">
                          <div className="space-y-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Score"
                              value={grades[student.id]?.test_score || ''}
                              onChange={(e) => handleGradeChange(student.id, 'test_score', Number(e.target.value))}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-center"
                            />
                            <input
                              type="text"
                              placeholder="Comments..."
                              value={grades[student.id]?.test_comments || ''}
                              onChange={(e) => handleGradeChange(student.id, 'test_comments', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                            />
                          </div>
                        </td>

                        {/* Examination Score */}
                        <td className="px-4 py-4 border-r border-gray-300">
                          <div className="space-y-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Score"
                              value={grades[student.id]?.examination_score || ''}
                              onChange={(e) => handleGradeChange(student.id, 'examination_score', Number(e.target.value))}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-center"
                            />
                            <input
                              type="text"
                              placeholder="Comments..."
                              value={grades[student.id]?.examination_comments || ''}
                              onChange={(e) => handleGradeChange(student.id, 'examination_comments', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                            />
                          </div>
                        </td>

                        {/* Attendance Score */}
                        <td className="px-4 py-4 border-r border-gray-300">
                          <div className="space-y-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Score"
                              value={grades[student.id]?.attendance_score || ''}
                              onChange={(e) => handleGradeChange(student.id, 'attendance_score', Number(e.target.value))}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-center"
                            />
                            <input
                              type="text"
                              placeholder="Comments..."
                              value={grades[student.id]?.attendance_comments || ''}
                              onChange={(e) => handleGradeChange(student.id, 'attendance_comments', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                            />
                          </div>
                        </td>

                        {/* Classwork Score */}
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Score"
                              value={grades[student.id]?.classwork_score || ''}
                              onChange={(e) => handleGradeChange(student.id, 'classwork_score', Number(e.target.value))}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-center"
                            />
                            <input
                              type="text"
                              placeholder="Comments..."
                              value={grades[student.id]?.classwork_comments || ''}
                              onChange={(e) => handleGradeChange(student.id, 'classwork_comments', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Save Button */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAllGrades}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save All Grades'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Enrolled</h3>
              <p className="text-gray-500">This course doesn't have any enrolled students yet.</p>
              <p className="text-sm text-gray-400 mt-2">
                Use the "Manage Students" button to enroll students first.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
