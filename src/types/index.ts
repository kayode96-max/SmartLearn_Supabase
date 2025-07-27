export type UserRole = 'student' | 'lecturer' | 'admin'
export type GradeStatus = 'draft' | 'published' | 'revised'
export type NotificationType = 'grade_published' | 'grade_updated' | 'feedback_received' | 'announcement'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  student_id?: string
  lecturer_id?: string
  department?: string
  year_of_study?: number
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Course {
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
  lecturer?: Profile
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  enrollment_date: string
  status: string
  course?: Course
  student?: Profile
}

export interface EnrollmentRequest {
  id: string
  student_id: string
  course_id: string
  request_date: string
  status: 'pending' | 'approved' | 'rejected'
  message?: string
  reviewed_by?: string
  reviewed_at?: string
  course?: Course
  student?: Profile
  reviewer?: Profile
}

export interface Assignment {
  id: string
  course_id: string
  instructor_id?: string
  title: string
  description?: string
  assignment_type: 'assignment' | 'test' | 'attendance' | 'practical' | 'examination'
  max_points: number
  due_date: string
  created_at: string
  updated_at?: string
  course?: Course
  instructor?: Profile
}

export interface Grade {
  id: string
  student_id: string
  course_id: string
  assignment_id: string
  marks_obtained?: number
  total_marks: number
  percentage?: number
  grade_letter?: string
  status: GradeStatus
  lecturer_comments?: string
  graded_by?: string
  graded_at?: string
  created_at: string
  updated_at: string
  student?: Profile
  course?: Course
  assignment?: Assignment
  grader?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  related_id?: string
  is_read: boolean
  is_email_sent: boolean
  created_at: string
}

export interface Feedback {
  id: string
  grade_id: string
  student_id: string
  lecturer_id: string
  message: string
  is_read: boolean
  created_at: string
  grade?: Grade
  student?: Profile
  lecturer?: Profile
}

export interface Announcement {
  id: string
  course_id: string
  title: string
  content: string
  created_by?: string
  is_published: boolean
  created_at: string
  updated_at: string
  course?: Course
  creator?: Profile
}

export interface AuthUser {
  id: string
  email: string
  profile?: Profile
}

export interface DashboardStats {
  totalCourses: number
  totalStudents: number
  totalGrades: number
  averageGrade: number
  pendingGrades: number
  publishedGrades: number
}

export interface StudentDashboardData {
  enrollments: Enrollment[]
  recentGrades: Grade[]
  notifications: Notification[]
  upcomingAssignments: Assignment[]
}

export interface LecturerDashboardData {
  courses: Course[]
  pendingGrades: Grade[]
  recentFeedback: Feedback[]
  notifications: Notification[]
  stats: DashboardStats
}
