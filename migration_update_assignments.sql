-- Migration to update assignments table structure
-- Run this in your Supabase SQL editor to update the existing assignments table

-- First, add the new columns to the assignments table
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS assignment_type TEXT DEFAULT 'assignment' CHECK (assignment_type IN ('assignment', 'test', 'attendance', 'practical', 'examination')),
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS max_points INTEGER DEFAULT 100;

-- Update existing data: copy total_marks to max_points and created_by to instructor_id
UPDATE assignments 
SET max_points = total_marks,
    instructor_id = created_by,
    assignment_type = 'assignment'
WHERE max_points IS NULL OR instructor_id IS NULL;

-- Now make the new columns NOT NULL after data migration
ALTER TABLE assignments 
ALTER COLUMN assignment_type SET NOT NULL,
ALTER COLUMN max_points SET NOT NULL;

-- Drop old columns (be careful - this will remove data permanently)
-- Uncomment these lines after you've verified the migration worked:
-- ALTER TABLE assignments DROP COLUMN IF EXISTS total_marks;
-- ALTER TABLE assignments DROP COLUMN IF EXISTS created_by;

-- Add RLS policies for assignments
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Students can view assignments for enrolled courses
CREATE POLICY IF NOT EXISTS "Students can view assignments for enrolled courses" ON assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = assignments.course_id
            AND e.student_id = auth.uid()
            AND e.status = 'active'
        )
    );

-- Lecturers can manage assignments for their courses
CREATE POLICY IF NOT EXISTS "Lecturers can manage assignments for their courses" ON assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = assignments.course_id
            AND c.lecturer_id = auth.uid()
        )
    );
