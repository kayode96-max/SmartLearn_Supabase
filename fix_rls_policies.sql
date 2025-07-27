-- Fix RLS policy to allow lecturers to view students from departments they teach

-- First, let's make sure lecturers can view students from departments where they have courses
DROP POLICY IF EXISTS "Lecturers can view students from departments they teach" ON profiles;

CREATE POLICY "Lecturers can view students from departments they teach" ON profiles
    FOR SELECT USING (
        role = 'student' AND
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.lecturer_id = auth.uid()
            AND c.department = profiles.department
        )
    );

-- Also ensure the existing policy works correctly
DROP POLICY IF EXISTS "Lecturers can view students in their courses" ON profiles;

CREATE POLICY "Lecturers can view students in their courses" ON profiles
    FOR SELECT USING (
        role = 'student' AND
        EXISTS (
            SELECT 1 FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = profiles.id
            AND c.lecturer_id = auth.uid()
        )
    );
