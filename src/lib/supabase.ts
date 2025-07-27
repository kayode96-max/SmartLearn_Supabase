import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Single client instance for client-side usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// For server components, create a separate file
// Server component Supabase client will be in a separate file to avoid conflicts

// Database types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'student' | 'lecturer' | 'admin'
          student_id?: string
          lecturer_id?: string
          department?: string
          year_of_study?: number
          avatar_url?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'student' | 'lecturer' | 'admin'
          student_id?: string
          lecturer_id?: string
          department?: string
          year_of_study?: number
          avatar_url?: string
        }
        Update: {
          email?: string
          full_name?: string
          role?: 'student' | 'lecturer' | 'admin'
          student_id?: string
          lecturer_id?: string
          department?: string
          year_of_study?: number
          avatar_url?: string
        }
      }
      courses: {
        Row: {
          id: string
          course_code: string
          course_name: string
          description?: string
          lecturer_id?: string
          department: string
          credits: number
          semester?: string
          academic_year?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          course_code: string
          course_name: string
          description?: string
          lecturer_id?: string
          department: string
          credits?: number
          semester?: string
          academic_year?: string
        }
        Update: {
          course_code?: string
          course_name?: string
          description?: string
          lecturer_id?: string
          department?: string
          credits?: number
          semester?: string
          academic_year?: string
        }
      }
      enrollments: {
        Row: {
          id: string
          student_id: string
          course_id: string
          enrollment_date: string
          status: string
        }
        Insert: {
          student_id: string
          course_id: string
          status?: string
        }
        Update: {
          status?: string
        }
      }
      assignments: {
        Row: {
          id: string
          course_id: string
          title: string
          description?: string
          total_marks: number
          due_date?: string
          created_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          course_id: string
          title: string
          description?: string
          total_marks?: number
          due_date?: string
          created_by?: string
        }
        Update: {
          title?: string
          description?: string
          total_marks?: number
          due_date?: string
        }
      }
      grades: {
        Row: {
          id: string
          student_id: string
          course_id: string
          assignment_id: string
          marks_obtained?: number
          total_marks: number
          percentage?: number
          grade_letter?: string
          status: 'draft' | 'published' | 'revised'
          lecturer_comments?: string
          graded_by?: string
          graded_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          student_id: string
          course_id: string
          assignment_id: string
          marks_obtained?: number
          total_marks: number
          status?: 'draft' | 'published' | 'revised'
          lecturer_comments?: string
          graded_by?: string
          graded_at?: string
        }
        Update: {
          marks_obtained?: number
          total_marks?: number
          status?: 'draft' | 'published' | 'revised'
          lecturer_comments?: string
          graded_by?: string
          graded_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'grade_published' | 'grade_updated' | 'feedback_received' | 'announcement'
          related_id?: string
          is_read: boolean
          is_email_sent: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          title: string
          message: string
          type: 'grade_published' | 'grade_updated' | 'feedback_received' | 'announcement'
          related_id?: string
          is_read?: boolean
          is_email_sent?: boolean
        }
        Update: {
          is_read?: boolean
          is_email_sent?: boolean
        }
      }
      feedback: {
        Row: {
          id: string
          grade_id: string
          student_id: string
          lecturer_id: string
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          grade_id: string
          student_id: string
          lecturer_id: string
          message: string
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
        }
      }
      announcements: {
        Row: {
          id: string
          course_id: string
          title: string
          content: string
          created_by?: string
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          course_id: string
          title: string
          content: string
          created_by?: string
          is_published?: boolean
        }
        Update: {
          title?: string
          content?: string
          is_published?: boolean
        }
      }
    }
  }
}
