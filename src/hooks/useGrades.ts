'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Grade } from '@/types'
import { useAuth } from './useAuth'

export function useGrades() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const { user, profile } = useAuth()

  useEffect(() => {
    if (!user || !profile) {
      setGrades([])
      setLoading(false)
      return
    }

    fetchGrades()
    subscribeToGrades()
  }, [user, profile])

  const fetchGrades = async () => {
    if (!user || !profile) return

    try {
      let query = supabase
        .from('grades')
        .select(`
          *,
          student:profiles!grades_student_id_fkey(full_name, student_id),
          course:courses(course_code, course_name),
          assignment:assignments(title, total_marks),
          grader:profiles!grades_graded_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

      // Filter based on user role
      if (profile.role === 'student') {
        query = query.eq('student_id', user.id)
      } else if (profile.role === 'lecturer') {
        // Get grades for courses taught by this lecturer
        query = query.in('course_id', 
          await supabase
            .from('courses')
            .select('id')
            .eq('lecturer_id', user.id)
            .then(({ data }) => data?.map(c => c.id) || [])
        )
      }

      const { data, error } = await query

      if (error) throw error

      setGrades(data || [])
    } catch (error) {
      console.error('Error fetching grades:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToGrades = () => {
    if (!user || !profile) return

    let subscription: any

    if (profile.role === 'student') {
      // Subscribe to student's grades
      subscription = supabase
        .channel('student_grades')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'grades',
            filter: `student_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Grade change for student:', payload)
            fetchGrades() // Refetch to get updated data with relations
          }
        )
        .subscribe()
    } else if (profile.role === 'lecturer') {
      // Subscribe to all grade changes (lecturer can see all grades for their courses)
      subscription = supabase
        .channel('lecturer_grades')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'grades'
          },
          (payload) => {
            console.log('Grade change for lecturer:', payload)
            fetchGrades() // Refetch to get updated data with relations
          }
        )
        .subscribe()
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }

  const updateGrade = async (gradeId: string, updates: Partial<Grade>) => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .update(updates)
        .eq('id', gradeId)
        .select()
        .single()

      if (error) throw error

      await fetchGrades() // Refetch to get updated data with relations
      return data
    } catch (error) {
      console.error('Error updating grade:', error)
      throw error
    }
  }

  const publishGrade = async (gradeId: string) => {
    return updateGrade(gradeId, { 
      status: 'published', 
      graded_at: new Date().toISOString(),
      graded_by: user?.id 
    })
  }

  const addGrade = async (gradeData: Omit<Grade, 'id' | 'created_at' | 'updated_at' | 'percentage' | 'grade_letter'>) => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .insert(gradeData)
        .select()
        .single()

      if (error) throw error

      await fetchGrades() // Refetch to get updated data with relations
      return data
    } catch (error) {
      console.error('Error adding grade:', error)
      throw error
    }
  }

  const getStudentGrades = (studentId: string) => {
    return grades.filter(g => g.student_id === studentId)
  }

  const getCourseGrades = (courseId: string) => {
    return grades.filter(g => g.course_id === courseId)
  }

  const getPublishedGrades = () => {
    return grades.filter(g => g.status === 'published')
  }

  const getPendingGrades = () => {
    return grades.filter(g => g.status === 'draft')
  }

  return {
    grades,
    loading,
    updateGrade,
    publishGrade,
    addGrade,
    getStudentGrades,
    getCourseGrades,
    getPublishedGrades,
    getPendingGrades,
    refetch: fetchGrades
  }
}
