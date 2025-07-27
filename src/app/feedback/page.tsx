'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/layout/Layout'
import { supabase } from '@/lib/supabase'
import { Feedback, Grade } from '@/types'
import { MessageSquare, Send, Eye, User, Calendar, BookOpen } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function FeedbackPage() {
  const { profile, isStudent, isLecturer } = useAuth()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [newFeedbackMessage, setNewFeedbackMessage] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchData = useCallback(async () => {
    if (!profile) return

    try {
      if (isStudent) {
        // Fetch feedback for student
        const { data: studentFeedback } = await supabase
          .from('feedback')
          .select(`
            *,
            grade:grades(
              *,
              course:courses(course_code, course_name),
              assignment:assignments(title)
            ),
            lecturer:profiles!feedback_lecturer_id_fkey(full_name, email)
          `)
          .eq('student_id', profile.id)
          .order('created_at', { ascending: false })

        setFeedback(studentFeedback || [])
      } else if (isLecturer) {
        // Fetch feedback sent by lecturer
        const { data: lecturerFeedback } = await supabase
          .from('feedback')
          .select(`
            *,
            grade:grades(
              *,
              course:courses(course_code, course_name),
              assignment:assignments(title)
            ),
            student:profiles!feedback_student_id_fkey(full_name, student_id)
          `)
          .eq('lecturer_id', profile.id)
          .order('created_at', { ascending: false })

        setFeedback(lecturerFeedback || [])

        // Also fetch grades that can receive feedback
        const { data: lecturerGrades } = await supabase
          .from('grades')
          .select(`
            *,
            student:profiles!grades_student_id_fkey(full_name, student_id),
            course:courses(course_code, course_name),
            assignment:assignments(title)
          `)
          .in('course_id', 
            await supabase
              .from('courses')
              .select('id')
              .eq('lecturer_id', profile.id)
              .then(({ data }) => data?.map(c => c.id) || [])
          )
          .eq('status', 'published')
          .order('created_at', { ascending: false })

        setGrades(lecturerGrades || [])
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
      toast.error('Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }, [profile, isStudent, isLecturer])

  useEffect(() => {
    fetchData()

    // Subscribe to real-time updates
    const feedbackSubscription = supabase
      .channel('feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, fetchData)
      .subscribe()

    return () => {
      feedbackSubscription.unsubscribe()
    }
  }, [fetchData])

  const handleCreateFeedback = async () => {
    if (!profile || !isLecturer || !selectedGrade || !newFeedbackMessage.trim()) return

    try {
      const grade = grades.find(g => g.id === selectedGrade)
      if (!grade) return

      const { error } = await supabase
        .from('feedback')
        .insert({
          grade_id: selectedGrade,
          student_id: grade.student_id,
          lecturer_id: profile.id,
          message: newFeedbackMessage.trim(),
          is_read: false
        })

      if (error) throw error

      toast.success('Feedback sent successfully!')
      setShowCreateModal(false)
      setNewFeedbackMessage('')
      setSelectedGrade('')
      fetchData()

      // Create notification for student
      await supabase
        .from('notifications')
        .insert({
          user_id: grade.student_id,
          title: 'New Feedback Received',
          message: `You have received feedback on ${grade.course?.course_name} - ${grade.assignment?.title}`,
          type: 'feedback_received',
          related_id: selectedGrade,
          is_read: false,
          is_email_sent: false
        })
    } catch (error) {
      console.error('Error creating feedback:', error)
      toast.error('Failed to send feedback')
    }
  }

  const markAsRead = async (feedbackId: string) => {
    if (!isStudent) return

    try {
      await supabase
        .from('feedback')
        .update({ is_read: true })
        .eq('id', feedbackId)

      setFeedback(prev => 
        prev.map(f => f.id === feedbackId ? { ...f, is_read: true } : f)
      )
    } catch (error) {
      console.error('Error marking feedback as read:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
              {isStudent ? 'My Feedback' : 'Student Feedback'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isStudent 
                ? 'View feedback from your lecturers on assignments and grades' 
                : 'Send feedback to students on their performance'}
            </p>
          </div>
          
          {isLecturer && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Send Feedback</span>
            </button>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Feedback</h3>
            <p className="text-3xl font-bold text-blue-600">{feedback.length}</p>
          </div>
          
          {isStudent && (
            <>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unread</h3>
                <p className="text-3xl font-bold text-orange-600">
                  {feedback.filter(f => !f.is_read).length}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">This Month</h3>
                <p className="text-3xl font-bold text-green-600">
                  {feedback.filter(f => 
                    new Date(f.created_at).getMonth() === new Date().getMonth()
                  ).length}
                </p>
              </div>
            </>
          )}
          
          {isLecturer && (
            <>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">This Week</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {feedback.filter(f => {
                    const feedbackDate = new Date(f.created_at)
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return feedbackDate >= weekAgo
                  }).length}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Available Grades</h3>
                <p className="text-3xl font-bold text-green-600">{grades.length}</p>
              </div>
            </>
          )}
        </div>

        {/* Feedback List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {isStudent ? 'Received Feedback' : 'Sent Feedback'}
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {feedback.map((item) => (
              <div 
                key={item.id} 
                className={`p-6 hover:bg-gray-50 ${!item.is_read && isStudent ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {item.grade?.course?.course_code}
                        </span>
                        <span className="text-sm text-gray-500">
                          - {item.grade?.course?.course_name}
                        </span>
                      </div>
                      
                      {!item.is_read && isStudent && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        Assignment: {item.grade?.assignment?.title}
                      </h3>
                      <p className="text-gray-600">{item.message}</p>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>
                          {isStudent 
                            ? `From: ${item.lecturer?.full_name}` 
                            : `To: ${item.student?.full_name} (${item.student?.student_id})`
                          }
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      
                      {item.grade && (
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">
                            Grade: {item.grade.marks_obtained || 0}/{item.grade.total_marks}
                          </span>
                          <span className="text-blue-600 font-bold">
                            ({item.grade.percentage?.toFixed(1) || '0.0'}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isStudent && !item.is_read && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Mark as Read
                      </button>
                    )}
                    
                    <button className="text-gray-400 hover:text-gray-600">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {feedback.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isStudent ? 'No feedback received' : 'No feedback sent'}
              </h3>
              <p className="text-gray-500">
                {isStudent 
                  ? 'Your lecturers haven\'t sent any feedback yet.' 
                  : 'Start sending feedback to help your students improve.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Feedback Modal */}
      {showCreateModal && isLecturer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Feedback</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Grade *
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a grade to provide feedback on...</option>
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.student?.full_name} ({grade.student?.student_id}) - {grade.course?.course_code} - {grade.assignment?.title} - {grade.marks_obtained || 0}/{grade.total_marks}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback Message *
                </label>
                <textarea
                  value={newFeedbackMessage}
                  onChange={(e) => setNewFeedbackMessage(e.target.value)}
                  rows={6}
                  placeholder="Provide constructive feedback to help the student improve..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewFeedbackMessage('')
                  setSelectedGrade('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFeedback}
                disabled={!selectedGrade || !newFeedbackMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>Send Feedback</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
