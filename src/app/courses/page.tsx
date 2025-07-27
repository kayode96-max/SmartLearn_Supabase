'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/layout/Layout'
import { supabase } from '@/lib/supabase'
import { Course, Enrollment, EnrollmentRequest, Assignment } from '@/types'
import { BookOpen, Users, Calendar, Plus, Edit, Eye, UserPlus, Clock, CheckCircle, XCircle, FileText, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CourseWithStats extends Course {
  enrollment_count?: number
  assignments_count?: number
}

export default function CoursesPage() {
  const { profile, isStudent, isLecturer } = useAuth()
  const [courses, setCourses] = useState<CourseWithStats[]>([])
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]) // For students to see available courses
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [showAvailableCoursesModal, setShowAvailableCoursesModal] = useState(false)
  const [showRequestsModal, setShowRequestsModal] = useState(false)
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false)
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [editingCourse, setEditingCourse] = useState({
    course_code: '',
    course_name: '',
    description: '',
    credits: 3,
    semester: '',
    academic_year: '',
    department: ''
  })
  const [availableStudents, setAvailableStudents] = useState<any[]>([])
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    due_date: '',
    max_points: 100,
    assignment_type: 'assignment' as 'assignment' | 'test' | 'attendance' | 'practical' | 'examination',
    course_id: ''
  })

  // Generate academic year options
  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = -1; i <= 2; i++) {
      const startYear = currentYear + i
      const endYear = startYear + 1
      years.push(`${startYear}-${endYear}`)
    }
    return years
  }

  const academicYears = generateAcademicYears()

  // Debug logging
  console.log('CoursesPage - profile:', profile)
  console.log('CoursesPage - isLecturer:', isLecturer)
  console.log('CoursesPage - showCreateModal:', showCreateModal)
  const [newCourse, setNewCourse] = useState({
    course_code: '',
    course_name: '',
    description: '',
    credits: 3,
    semester: '',
    academic_year: academicYears[1], // Default to current academic year
    department: ''
  })

  const fetchData = useCallback(async () => {
    if (!profile) return

    try {
      if (isStudent) {
        // Fetch student's enrollments with detailed course information
        const { data: studentEnrollments } = await supabase
          .from('enrollments')
          .select(`
            *,
            course:courses(
              *,
              lecturer:profiles!courses_lecturer_id_fkey(full_name, email, lecturer_id)
            )
          `)
          .eq('student_id', profile.id)
          .eq('status', 'active')
          .order('enrollment_date', { ascending: false })

        console.log('Student enrollments:', studentEnrollments)
        
        setEnrollments(studentEnrollments || [])
        setCourses(studentEnrollments?.map(e => e.course as unknown as Course).filter(Boolean) || [])

        // Fetch available courses for the student's department that they're not enrolled in
        if (profile.department) {
          const enrolledCourseIds = studentEnrollments?.map(e => e.course_id) || []
          
          let availableCoursesQuery = supabase
            .from('courses')
            .select(`
              *,
              lecturer:profiles!courses_lecturer_id_fkey(full_name, email, lecturer_id)
            `)
            .eq('department', profile.department)
            .order('created_at', { ascending: false })

          // Only add the not-in filter if there are actually enrolled courses
          if (enrolledCourseIds.length > 0) {
            availableCoursesQuery = availableCoursesQuery.not('id', 'in', `(${enrolledCourseIds.join(',')})`)
          }

          const { data: availableCoursesData } = await availableCoursesQuery

          setAvailableCourses(availableCoursesData || [])
        }
      } else if (isLecturer) {
        // Fetch lecturer's courses with statistics
        const { data: lecturerCourses } = await supabase
          .from('courses')
          .select(`
            *,
            enrollments(count),
            assignments(count)
          `)
          .eq('lecturer_id', profile.id)
          .order('created_at', { ascending: false })

        const coursesWithStats = lecturerCourses?.map(course => ({
          ...course,
          enrollment_count: course.enrollments?.[0]?.count || 0,
          assignments_count: course.assignments?.[0]?.count || 0
        })) || []

        setCourses(coursesWithStats)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }, [profile, isStudent, isLecturer])

  useEffect(() => {
    fetchData()
    if (isLecturer) {
      fetchEnrollmentRequests()
    }
    fetchAssignments()

    // Subscribe to real-time updates
    const coursesSubscription = supabase
      .channel('courses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, fetchData)
      .subscribe()

    const enrollmentsSubscription = supabase
      .channel('enrollments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, fetchData)
      .subscribe()

    const requestsSubscription = supabase
      .channel('enrollment_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollment_requests' }, () => {
        if (isLecturer) fetchEnrollmentRequests()
      })
      .subscribe()

    const assignmentsSubscription = supabase
      .channel('assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, fetchAssignments)
      .subscribe()

    return () => {
      coursesSubscription.unsubscribe()
      enrollmentsSubscription.unsubscribe()
      requestsSubscription.unsubscribe()
      assignmentsSubscription.unsubscribe()
    }
  }, [fetchData, isLecturer])

  const handleCreateCourse = async () => {
    if (!profile || !isLecturer) return

    try {
      // Validate required fields
      if (!newCourse.course_code.trim()) {
        toast.error('Course code is required')
        return
      }
      if (!newCourse.course_name.trim()) {
        toast.error('Course name is required')
        return
      }
      if (!newCourse.department.trim()) {
        toast.error('Department is required')
        return
      }

      const { data, error } = await supabase
        .from('courses')
        .insert({
          course_code: newCourse.course_code.trim(),
          course_name: newCourse.course_name.trim(),
          description: newCourse.description.trim() || null,
          lecturer_id: profile.id,
          department: newCourse.department.trim(),
          credits: newCourse.credits,
          semester: newCourse.semester || null,
          academic_year: newCourse.academic_year || null
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        if (error.code === '23505') {
          toast.error('Course code already exists. Please use a different code.')
        } else {
          toast.error(`Failed to create course: ${error.message}`)
        }
        return
      }

      toast.success('Course created successfully!')
      setShowCreateModal(false)
      setNewCourse({
        course_code: '',
        course_name: '',
        description: '',
        credits: 3,
        semester: '',
        academic_year: academicYears[1], // Reset to current academic year
        department: ''
      })
      fetchData()
    } catch (error: any) {
      console.error('Error creating course:', error)
      toast.error(error?.message || 'Failed to create course')
    }
  }

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course)
    setEditingCourse({
      course_code: course.course_code,
      course_name: course.course_name,
      description: course.description || '',
      credits: course.credits,
      semester: course.semester || '',
      academic_year: course.academic_year || '',
      department: course.department
    })
    setShowEditModal(true)
  }

  const handleUpdateCourse = async () => {
    if (!selectedCourse || !profile || !isLecturer) return

    try {
      // Validate required fields
      if (!editingCourse.course_code.trim()) {
        toast.error('Course code is required')
        return
      }
      if (!editingCourse.course_name.trim()) {
        toast.error('Course name is required')
        return
      }
      if (!editingCourse.department.trim()) {
        toast.error('Department is required')
        return
      }

      const { error } = await supabase
        .from('courses')
        .update({
          course_code: editingCourse.course_code.trim(),
          course_name: editingCourse.course_name.trim(),
          description: editingCourse.description.trim() || null,
          department: editingCourse.department.trim(),
          credits: editingCourse.credits,
          semester: editingCourse.semester || null,
          academic_year: editingCourse.academic_year || null
        })
        .eq('id', selectedCourse.id)
        .eq('lecturer_id', profile.id) // Ensure lecturer can only edit their own courses

      if (error) {
        console.error('Supabase error:', error)
        if (error.code === '23505') {
          toast.error('Course code already exists. Please use a different code.')
        } else {
          toast.error(`Failed to update course: ${error.message}`)
        }
        return
      }

      toast.success('Course updated successfully!')
      setShowEditModal(false)
      setSelectedCourse(null)
      fetchData()
    } catch (error: any) {
      console.error('Error updating course:', error)
      toast.error(error?.message || 'Failed to update course')
    }
  }

  const handleManageStudents = async (course: Course) => {
    setSelectedCourse(course)
    
    try {
      console.log('Managing students for course:', course)
      
      // Fetch currently enrolled students
      const { data: enrolled, error: enrolledError } = await supabase
        .from('enrollments')
        .select(`
          *,
          student:profiles!enrollments_student_id_fkey(id, full_name, student_id, email, department, year_of_study)
        `)
        .eq('course_id', course.id)
        .eq('status', 'active')

      console.log('Enrolled students:', enrolled)

      // Fetch students from the same department using regular client
      const { data: departmentStudents, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, student_id, email, department, year_of_study')
        .eq('role', 'student')
        .eq('department', course.department)

      console.log('Department students query:', { departmentStudents, studentsError, department: course.department })

      const enrolledIds = enrolled?.map(e => e.student_id) || []
      const available = departmentStudents?.filter(student => !enrolledIds.includes(student.id)) || []

      console.log('Available students:', available)

      setEnrolledStudents(enrolled?.map(e => e.student).filter(Boolean) || [])
      setAvailableStudents(available)
      setShowStudentsModal(true)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load student data')
    }
  }

  const handleEnrollStudent = async (studentId: string) => {
    if (!selectedCourse) return

    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({
          student_id: studentId,
          course_id: selectedCourse.id,
          enrollment_date: new Date().toISOString(),
          status: 'active'
        })

      if (error) throw error

      toast.success('Student enrolled successfully!')
      
      // Refresh the student lists
      handleManageStudents(selectedCourse)
      fetchData() // Refresh courses data
    } catch (error) {
      console.error('Error enrolling student:', error)
      toast.error('Failed to enroll student')
    }
  }

  const handleUnenrollStudent = async (studentId: string) => {
    if (!selectedCourse) return

    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'inactive' })
        .eq('student_id', studentId)
        .eq('course_id', selectedCourse.id)

      if (error) throw error

      toast.success('Student unenrolled successfully!')
      
      // Refresh the student lists
      handleManageStudents(selectedCourse)
      fetchData() // Refresh courses data
    } catch (error) {
      console.error('Error unenrolling student:', error)
      toast.error('Failed to unenroll student')
    }
  }

  const handleBulkEnroll = async () => {
    if (!selectedCourse || selectedStudents.length === 0) return

    try {
      const enrollmentPromises = selectedStudents.map(studentId =>
        supabase
          .from('enrollments')
          .insert({
            student_id: studentId,
            course_id: selectedCourse.id,
            enrollment_date: new Date().toISOString(),
            status: 'active'
          })
      )

      await Promise.all(enrollmentPromises)

      toast.success(`${selectedStudents.length} students enrolled successfully!`)
      setSelectedStudents([])
      
      // Refresh the student lists
      handleManageStudents(selectedCourse)
      fetchData() // Refresh courses data
    } catch (error) {
      console.error('Error bulk enrolling students:', error)
      toast.error('Failed to enroll some students')
    }
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleEnrollInCourse = async (courseId: string) => {
    if (!profile || !isStudent) return

    try {
      // Check if already enrolled or has pending request
      const { data: existingRequest } = await supabase
        .from('enrollment_requests')
        .select('id, status')
        .eq('student_id', profile.id)
        .eq('course_id', courseId)
        .single()

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          toast.error('You already have a pending enrollment request for this course')
        } else if (existingRequest.status === 'approved') {
          toast.error('You are already enrolled in this course')
        } else {
          toast.error('You have already requested enrollment for this course')
        }
        return
      }

      // Create enrollment request
      const { error } = await supabase
        .from('enrollment_requests')
        .insert({
          student_id: profile.id,
          course_id: courseId,
          status: 'pending',
          message: 'Student requesting enrollment'
        })

      if (error) throw error

      toast.success('Enrollment request submitted successfully! Waiting for lecturer approval.')
      setShowAvailableCoursesModal(false)
      fetchData()
    } catch (error) {
      console.error('Error submitting enrollment request:', error)
      toast.error('Failed to submit enrollment request')
    }
  }

  const handleApproveRequest = async (requestId: string, studentId: string) => {
    if (!selectedCourse) return

    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('enrollment_requests')
        .update({ 
          status: 'approved', 
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      // Create enrollment
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          student_id: studentId,
          course_id: selectedCourse.id,
          enrollment_date: new Date().toISOString(),
          status: 'active'
        })

      if (enrollError) throw enrollError

      toast.success('Enrollment request approved!')
      fetchEnrollmentRequests()
      fetchData()
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error('Failed to approve enrollment request')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('enrollment_requests')
        .update({ 
          status: 'rejected',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      toast.success('Enrollment request rejected')
      fetchEnrollmentRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error('Failed to reject enrollment request')
    }
  }

  const fetchEnrollmentRequests = async () => {
    if (!profile || !isLecturer) return

    try {
      const { data: requests } = await supabase
        .from('enrollment_requests')
        .select(`
          *,
          student:profiles!enrollment_requests_student_id_fkey(full_name, student_id, email),
          course:courses!enrollment_requests_course_id_fkey(course_code, course_name)
        `)
        .in('course_id', courses.map(c => c.id))
        .eq('status', 'pending')
        .order('request_date', { ascending: false })

      setEnrollmentRequests(requests || [])
    } catch (error) {
      console.error('Error fetching enrollment requests:', error)
    }
  }

  const fetchAssignments = async () => {
    if (!profile) return

    try {
      if (isLecturer) {
        // Fetch assignments for lecturer's courses
        const { data: assignments } = await supabase
          .from('assignments')
          .select(`
            *,
            course:courses!assignments_course_id_fkey(course_code, course_name)
          `)
          .in('course_id', courses.map(c => c.id))
          .order('created_at', { ascending: false })

        setAssignments(assignments || [])
      } else if (isStudent) {
        // Fetch assignments for student's enrolled courses
        const enrolledCourseIds = enrollments.map(e => e.course_id)
        const { data: assignments } = await supabase
          .from('assignments')
          .select(`
            *,
            course:courses!assignments_course_id_fkey(course_code, course_name)
          `)
          .in('course_id', enrolledCourseIds)
          .order('due_date', { ascending: true })

        setAssignments(assignments || [])
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
  }

  const handleCreateAssignment = async () => {
    if (!profile || !isLecturer || !newAssignment.course_id) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!newAssignment.title || !newAssignment.due_date) {
      toast.error('Title and due date are required')
      return
    }

    try {
      console.log('Creating assignment with data:', {
        ...newAssignment,
        instructor_id: profile.id,
        created_at: new Date().toISOString()
      })

      const { data, error } = await supabase
        .from('assignments')
        .insert({
          ...newAssignment,
          instructor_id: profile.id,
          created_at: new Date().toISOString()
        })
        .select()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Assignment created successfully:', data)
      toast.success('Assignment created successfully!')
      setShowCreateAssignmentModal(false)
      setNewAssignment({
        title: '',
        description: '',
        due_date: '',
        max_points: 100,
        assignment_type: 'assignment',
        course_id: ''
      })
      fetchAssignments()
    } catch (error: any) {
      console.error('Error creating assignment:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      toast.error(`Failed to create assignment: ${error?.message || 'Unknown error'}`)
    }
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
              {isStudent ? 'My Courses' : 'Course Management'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isStudent 
                ? 'View your enrolled courses and access materials' 
                : 'Manage your courses, students, and assignments'}
            </p>
          </div>
          
          <div className="flex space-x-3">
            {isLecturer && (
              <>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Course</span>
                </button>
                
                <button 
                  onClick={() => setShowRequestsModal(true)}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center space-x-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>Enrollment Requests ({enrollmentRequests.length})</span>
                </button>
              </>
            )}
            
            {isStudent && (
              <>
                <button 
                  onClick={() => setShowAvailableCoursesModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Browse Available Courses</span>
                </button>
                
                <button 
                  onClick={() => setShowAssignmentsModal(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>View All Assignments</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {course.course_code}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {course.course_name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {course.credits} Credits • {course.semester} {course.academic_year}
                    </p>
                  </div>
                  <BookOpen className="h-8 w-8 text-blue-600 flex-shrink-0" />
                </div>

                {course.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>
                )}

                {isLecturer && (
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{course.enrollment_count || 0} students</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{course.assignments_count || 0} assignments</span>
                      </div>
                    </div>
                  </div>
                )}

                {isStudent && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Lecturer:</span>
                      <span className="font-medium text-gray-700">
                        {/* @ts-ignore */}
                        {course.lecturer?.full_name || 'TBA'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">Department:</span>
                      <span className="font-medium text-gray-700">{course.department}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Academic Year:</span>
                      <span className="font-medium text-gray-700">{course.academic_year || 'Not specified'}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs rounded-full bg-green-100 text-green-800`}>
                    {isStudent ? 'Enrolled' : 'Active'}
                  </span>

                  <div className="flex items-center space-x-2">
                    {isStudent ? (
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedCourse(course)
                            setShowAssignmentsModal(true)
                          }}
                          className="text-purple-600 hover:text-purple-800"
                          title="View Assignments"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <div className="text-xs text-gray-500">
                          Enrolled: {enrollments.find(e => e.course_id === course.id)?.enrollment_date 
                            ? new Date(enrollments.find(e => e.course_id === course.id)!.enrollment_date).toLocaleDateString()
                            : 'N/A'}
                        </div>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEditCourse(course)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit Course"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleManageStudents(course)}
                          className="text-green-600 hover:text-green-800"
                          title="Manage Students"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedCourse(course)
                            setShowAssignmentsModal(true)
                          }}
                          className="text-purple-600 hover:text-purple-800"
                          title="Manage Assignments"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isStudent ? 'No courses enrolled' : 'No courses created'}
            </h3>
            <p className="text-gray-500 mb-4">
              {isStudent 
                ? 'You are not enrolled in any courses yet. Browse available courses for your department.' 
                : 'Start by creating your first course.'}
            </p>
            {isLecturer ? (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Your First Course
              </button>
            ) : (
              <button 
                onClick={() => setShowAvailableCoursesModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 mx-auto"
              >
                <BookOpen className="h-4 w-4" />
                <span>Browse Available Courses</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Course Modal */}
      {showCreateModal && isLecturer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Course</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    value={newCourse.course_code}
                    onChange={(e) => setNewCourse({...newCourse, course_code: e.target.value})}
                    placeholder="e.g., CS101"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Credits
                  </label>
                  <input
                    type="number"
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({...newCourse, credits: Number(e.target.value)})}
                    min="1"
                    max="6"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Course Name *
                </label>
                <input
                  type="text"
                  value={newCourse.course_name}
                  onChange={(e) => setNewCourse({...newCourse, course_name: e.target.value})}
                  placeholder="e.g., Introduction to Computer Science"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department *
                </label>
                <select
                  value={newCourse.department}
                  onChange={(e) => setNewCourse({...newCourse, department: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Department</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Business">Business</option>
                  <option value="Arts">Arts</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Semester
                  </label>
                  <select
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse({...newCourse, semester: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Semester</option>
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Academic Year
                  </label>
                  <select
                    value={newCourse.academic_year}
                    onChange={(e) => setNewCourse({...newCourse, academic_year: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {academicYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                  rows={3}
                  placeholder="Describe the course content and objectives..."
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCourse}
                disabled={!newCourse.course_code || !newCourse.course_name || !newCourse.department}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Course</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    value={editingCourse.course_code}
                    onChange={(e) => setEditingCourse({...editingCourse, course_code: e.target.value})}
                    placeholder="e.g., CS101"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Credits
                  </label>
                  <input
                    type="number"
                    value={editingCourse.credits}
                    onChange={(e) => setEditingCourse({...editingCourse, credits: Number(e.target.value)})}
                    min="1"
                    max="6"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Course Name *
                </label>
                <input
                  type="text"
                  value={editingCourse.course_name}
                  onChange={(e) => setEditingCourse({...editingCourse, course_name: e.target.value})}
                  placeholder="e.g., Introduction to Computer Science"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department *
                </label>
                <select
                  value={editingCourse.department}
                  onChange={(e) => setEditingCourse({...editingCourse, department: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Department</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Business">Business</option>
                  <option value="Arts">Arts</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Semester
                  </label>
                  <select
                    value={editingCourse.semester}
                    onChange={(e) => setEditingCourse({...editingCourse, semester: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Semester</option>
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Academic Year
                  </label>
                  <select
                    value={editingCourse.academic_year}
                    onChange={(e) => setEditingCourse({...editingCourse, academic_year: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={editingCourse.description}
                  onChange={(e) => setEditingCourse({...editingCourse, description: e.target.value})}
                  rows={3}
                  placeholder="Describe the course content and objectives..."
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedCourse(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCourse}
                disabled={!editingCourse.course_code || !editingCourse.course_name || !editingCourse.department}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Students Modal */}
      {showStudentsModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Students - {selectedCourse.course_code}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing students from {selectedCourse.department} department
                  {selectedCourse.academic_year && ` for ${selectedCourse.academic_year} academic year`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowStudentsModal(false)
                  setSelectedCourse(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Available Students */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-900">
                    Available Students from {selectedCourse.department} ({availableStudents.length})
                  </h4>
                  {selectedStudents.length > 0 && (
                    <button
                      onClick={handleBulkEnroll}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Enroll Selected ({selectedStudents.length})
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{student.full_name}</p>
                          <p className="text-sm text-gray-500">ID: {student.student_id}</p>
                          <p className="text-xs text-gray-400">{student.email}</p>
                          <p className="text-xs text-blue-600">
                            {student.department} • Year {student.year_of_study}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEnrollStudent(student.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Enroll
                      </button>
                    </div>
                  ))}
                  {availableStudents.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No available students from {selectedCourse.department} department</p>
                      <p className="text-sm text-gray-400 mt-1">
                        This could be because:
                      </p>
                      <ul className="text-sm text-gray-400 mt-2 text-left max-w-md mx-auto">
                        <li>• No students have been created yet</li>
                        <li>• No students are in the {selectedCourse.department} department</li>
                        <li>• All students are already enrolled</li>
                        <li>• Database permissions need to be updated</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Enrolled Students */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Enrolled Students ({enrolledStudents.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {enrolledStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{student.full_name}</p>
                        <p className="text-sm text-gray-500">ID: {student.student_id}</p>
                        <p className="text-xs text-gray-400">{student.email}</p>
                        <p className="text-xs text-blue-600">
                          {student.department} • Year {student.year_of_study}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnenrollStudent(student.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {enrolledStudents.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No enrolled students</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowStudentsModal(false)
                  setSelectedCourse(null)
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Available Courses Modal for Students */}
      {showAvailableCoursesModal && isStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Available Courses - {profile?.department}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Courses available for your department and year level
                </p>
              </div>
              <button
                onClick={() => setShowAvailableCoursesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              {availableCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableCourses.map((course) => (
                    <div key={course.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{course.course_code}</h4>
                          <p className="text-sm text-gray-600">{course.course_name}</p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {course.credits} Credits
                        </span>
                      </div>
                      
                      {course.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                      
                      <div className="text-xs text-gray-500 mb-3 space-y-1">
                        <div className="flex justify-between">
                          <span>Lecturer:</span>
                          <span className="font-medium">
                            {/* @ts-ignore */}
                            {course.lecturer?.full_name || 'TBA'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Semester:</span>
                          <span>{course.semester || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Academic Year:</span>
                          <span>{course.academic_year || 'Not specified'}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleEnrollInCourse(course.id)}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 text-sm"
                      >
                        Request Enrollment
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Available Courses
                  </h3>
                  <p className="text-gray-500">
                    There are no courses available for your department at the moment.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAvailableCoursesModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Requests Modal */}
      {showRequestsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Enrollment Requests ({enrollmentRequests.length})
                </h3>
                <button
                  onClick={() => setShowRequestsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {enrollmentRequests.length > 0 ? (
                <div className="space-y-4">
                  {enrollmentRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {request.student?.full_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Student ID: {request.student?.student_id}
                          </p>
                          <p className="text-sm text-gray-600">
                            Email: {request.student?.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            Course: {request.course?.course_code} - {request.course?.course_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Requested: {new Date(request.request_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      {request.message && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-700 italic">
                            "{request.message}"
                          </p>
                        </div>
                      )}
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleApproveRequest(request.id, request.student_id)}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center space-x-2 text-sm"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center space-x-2 text-sm"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
                  <p className="text-gray-600">
                    No students have requested enrollment in your courses yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assignments Modal */}
      {showAssignmentsModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Assignments - {selectedCourse.course_code}: {selectedCourse.course_name}
                </h3>
                <button
                  onClick={() => setShowAssignmentsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {isLecturer && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setNewAssignment(prev => ({ ...prev, course_id: selectedCourse.id }))
                      setShowCreateAssignmentModal(true)
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Assignment</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {assignments.filter(a => a.course_id === selectedCourse.id).length > 0 ? (
                <div className="space-y-4">
                  {assignments.filter(a => a.course_id === selectedCourse.id).map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {assignment.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {assignment.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Type: {assignment.assignment_type}</span>
                            <span>Max Points: {assignment.max_points}</span>
                            <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            new Date(assignment.due_date) > new Date() 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {new Date(assignment.due_date) > new Date() ? 'Active' : 'Overdue'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignments</h3>
                  <p className="text-gray-600">
                    {isLecturer 
                      ? 'No assignments created for this course yet.'
                      : 'No assignments available for this course.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateAssignmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Create Assignment</h3>
                <button
                  onClick={() => setShowCreateAssignmentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Assignment title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Assignment description"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={newAssignment.assignment_type}
                    onChange={(e) => setNewAssignment(prev => ({ 
                      ...prev, 
                      assignment_type: e.target.value as 'assignment' | 'test' | 'attendance' | 'practical' | 'examination'
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="test">Test</option>
                    <option value="attendance">Attendance</option>
                    <option value="practical">Practical</option>
                    <option value="examination">Examination</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Points
                  </label>
                  <input
                    type="number"
                    value={newAssignment.max_points}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, max_points: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={newAssignment.due_date}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateAssignmentModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAssignment}
                  disabled={!newAssignment.title || !newAssignment.due_date}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
