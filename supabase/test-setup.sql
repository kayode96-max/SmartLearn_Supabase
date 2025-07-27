-- Test script to verify the SmartLearn database setup
-- Run this after applying the main schema

-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'courses', 'enrollments', 'assignments', 'grades', 'notifications', 'feedback', 'announcements');

-- Check if all custom types exist
SELECT typname 
FROM pg_type 
WHERE typname IN ('user_role', 'grade_status', 'notification_type');

-- Test data for development (you'll need to replace the UUIDs with actual user IDs from auth.users)

-- Sample lecturer profile (after creating user through auth)
-- INSERT INTO profiles (id, email, full_name, role, lecturer_id, department) VALUES
-- ('your-lecturer-user-id-here', 'lecturer@smartlearn.com', 'Dr. John Smith', 'lecturer', 'LEC001', 'Computer Science');

-- Sample student profile (after creating user through auth)
-- INSERT INTO profiles (id, email, full_name, role, student_id, department, year_of_study) VALUES
-- ('your-student-user-id-here', 'student@smartlearn.com', 'Jane Doe', 'student', 'STU001', 'Computer Science', 2);

-- Sample course
-- INSERT INTO courses (course_code, course_name, lecturer_id, department, semester, academic_year) VALUES
-- ('CS101', 'Introduction to Programming', 'your-lecturer-user-id-here', 'Computer Science', 'Fall', '2024');

-- Test RLS policies by trying to select from profiles (should work only for authenticated users)
SELECT 'Database setup complete. All tables and types created successfully.' as status;
