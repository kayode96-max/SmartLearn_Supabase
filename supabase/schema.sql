-- SmartLearn Database Schema
-- This file contains all the SQL commands to set up the database for the school management app

-- Safely create custom types if they don't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'lecturer', 'admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grade_status') THEN
        CREATE TYPE grade_status AS ENUM ('draft', 'published', 'revised');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('grade_published', 'grade_updated', 'feedback_received', 'announcement');
    END IF;
END $$;

-- Create profiles table to extend Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    student_id TEXT UNIQUE, -- Only for students
    lecturer_id TEXT UNIQUE, -- Only for lecturers
    department TEXT,
    year_of_study INTEGER, -- Only for students
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_code TEXT UNIQUE NOT NULL,
    course_name TEXT NOT NULL,
    description TEXT,
    lecturer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    department TEXT NOT NULL,
    credits INTEGER DEFAULT 3,
    semester TEXT,
    academic_year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enrollments table (many-to-many relationship between students and courses)
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    UNIQUE(student_id, course_id)
);

-- Create enrollment requests table
CREATE TABLE IF NOT EXISTS enrollment_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    message TEXT,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(student_id, course_id)
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    assignment_type TEXT NOT NULL DEFAULT 'assignment' CHECK (assignment_type IN ('assignment', 'test', 'attendance', 'practical', 'examination')),
    max_points INTEGER NOT NULL DEFAULT 100,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2),
    total_marks INTEGER NOT NULL,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_marks > 0 THEN (marks_obtained / total_marks) * 100 
        ELSE 0 END
    ) STORED,
    grade_letter TEXT,
    status grade_status DEFAULT 'draft',
    lecturer_comments TEXT,
    graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, assignment_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    related_id UUID, -- Can reference grades, assignments, etc.
    is_read BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grade_id UUID REFERENCES grades(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_role') THEN
        CREATE INDEX idx_profiles_role ON profiles(role);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_student_id') THEN
        CREATE INDEX idx_profiles_student_id ON profiles(student_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_lecturer_id') THEN
        CREATE INDEX idx_profiles_lecturer_id ON profiles(lecturer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_enrollments_student_id') THEN
        CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_enrollments_course_id') THEN
        CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grades_student_id') THEN
        CREATE INDEX idx_grades_student_id ON grades(student_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grades_course_id') THEN
        CREATE INDEX idx_grades_course_id ON grades(course_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grades_status') THEN
        CREATE INDEX idx_grades_status ON grades(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_id') THEN
        CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_is_read') THEN
        CREATE INDEX idx_notifications_is_read ON notifications(is_read);
    END IF;
END $$;

-- Row Level Security (RLS) Policies

-- Profiles policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile'
    ) THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own profile" ON profiles
            FOR SELECT USING (auth.uid() = id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" ON profiles
            FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" ON profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Students can view other students in same courses'
    ) THEN
        CREATE POLICY "Students can view other students in same courses" ON profiles
            FOR SELECT USING (
                role = 'student' AND 
                EXISTS (
                    SELECT 1 FROM enrollments e1, enrollments e2 
                    WHERE e1.student_id = auth.uid() 
                    AND e2.student_id = profiles.id 
                    AND e1.course_id = e2.course_id
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Lecturers can view students in their courses'
    ) THEN
        CREATE POLICY "Lecturers can view students in their courses" ON profiles
            FOR SELECT USING (
                role = 'student' AND
                EXISTS (
                    SELECT 1 FROM enrollments e, courses c
                    WHERE e.student_id = profiles.id
                    AND e.course_id = c.id
                    AND c.lecturer_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Lecturers can view students from departments they teach'
    ) THEN
        CREATE POLICY "Lecturers can view students from departments they teach" ON profiles
            FOR SELECT USING (
                role = 'student' AND
                EXISTS (
                    SELECT 1 FROM courses c
                    WHERE c.lecturer_id = auth.uid()
                    AND c.department = profiles.department
                )
            );
    END IF;
END $$;

-- Courses policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'courses' AND policyname = 'Anyone can view published courses'
    ) THEN
        ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Anyone can view published courses" ON courses
            FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'courses' AND policyname = 'Lecturers can manage their own courses'
    ) THEN
        CREATE POLICY "Lecturers can manage their own courses" ON courses
            FOR ALL USING (lecturer_id = auth.uid());
    END IF;
END $$;

-- Enrollments policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'enrollments' AND policyname = 'Students can view their own enrollments'
    ) THEN
        ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Students can view their own enrollments" ON enrollments
            FOR SELECT USING (student_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'enrollments' AND policyname = 'Lecturers can view enrollments for their courses'
    ) THEN
        CREATE POLICY "Lecturers can view enrollments for their courses" ON enrollments
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM courses c
                    WHERE c.id = enrollments.course_id
                    AND c.lecturer_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'enrollments' AND policyname = 'Lecturers can manage enrollments for their courses'
    ) THEN
        CREATE POLICY "Lecturers can manage enrollments for their courses" ON enrollments
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM courses c
                    WHERE c.id = enrollments.course_id
                    AND c.lecturer_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Grades policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'grades' AND policyname = 'Students can view their own grades'
    ) THEN
        ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Students can view their own grades" ON grades
            FOR SELECT USING (student_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'grades' AND policyname = 'Lecturers can manage grades for their courses'
    ) THEN
        CREATE POLICY "Lecturers can manage grades for their courses" ON grades
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM courses c
                    WHERE c.id = grades.course_id
                    AND c.lecturer_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Notifications policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications'
    ) THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own notifications" ON notifications
            FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

-- Assignments policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assignments' AND policyname = 'Students can view assignments for enrolled courses'
    ) THEN
        ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Students can view assignments for enrolled courses" ON assignments
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM enrollments e
                    WHERE e.course_id = assignments.course_id
                    AND e.student_id = auth.uid()
                    AND e.status = 'active'
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assignments' AND policyname = 'Lecturers can manage assignments for their courses'
    ) THEN
        CREATE POLICY "Lecturers can manage assignments for their courses" ON assignments
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM courses c
                    WHERE c.id = assignments.course_id
                    AND c.lecturer_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Enrollment requests policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'enrollment_requests' AND policyname = 'Students can view their own enrollment requests'
    ) THEN
        ALTER TABLE enrollment_requests ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Students can view their own enrollment requests" ON enrollment_requests
            FOR SELECT USING (student_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'enrollment_requests' AND policyname = 'Students can create enrollment requests'
    ) THEN
        CREATE POLICY "Students can create enrollment requests" ON enrollment_requests
            FOR INSERT WITH CHECK (student_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'enrollment_requests' AND policyname = 'Lecturers can manage requests for their courses'
    ) THEN
        CREATE POLICY "Lecturers can manage requests for their courses" ON enrollment_requests
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM courses c
                    WHERE c.id = enrollment_requests.course_id
                    AND c.lecturer_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications'
    ) THEN
        CREATE POLICY "Users can update their own notifications" ON notifications
            FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' AND policyname = 'System can create notifications for users'
    ) THEN
        CREATE POLICY "System can create notifications for users" ON notifications
            FOR INSERT WITH CHECK (user_id IS NOT NULL);
    END IF;
END $$;

-- Functions and Triggers

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_profiles_updated_at'
    ) THEN
        CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_courses_updated_at'
    ) THEN
        CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_assignments_updated_at'
    ) THEN
        CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_grades_updated_at'
    ) THEN
        CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_announcements_updated_at'
    ) THEN
        CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Function to automatically calculate grade letter
CREATE OR REPLACE FUNCTION calculate_grade_letter(percentage DECIMAL)
RETURNS TEXT AS $$
BEGIN
    CASE 
        WHEN percentage >= 90 THEN RETURN 'A+';
        WHEN percentage >= 85 THEN RETURN 'A';
        WHEN percentage >= 80 THEN RETURN 'A-';
        WHEN percentage >= 75 THEN RETURN 'B+';
        WHEN percentage >= 70 THEN RETURN 'B';
        WHEN percentage >= 65 THEN RETURN 'B-';
        WHEN percentage >= 60 THEN RETURN 'C+';
        WHEN percentage >= 55 THEN RETURN 'C';
        WHEN percentage >= 50 THEN RETURN 'C-';
        WHEN percentage >= 45 THEN RETURN 'D';
        ELSE RETURN 'F';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set grade letter when grade is updated
CREATE OR REPLACE FUNCTION set_grade_letter()
RETURNS TRIGGER AS $$
BEGIN
    NEW.grade_letter = calculate_grade_letter(NEW.percentage);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_grade_letter'
    ) THEN
        CREATE TRIGGER update_grade_letter BEFORE INSERT OR UPDATE ON grades
            FOR EACH ROW EXECUTE FUNCTION set_grade_letter();
    END IF;
END $$;

-- Function to create notifications when grades are published
CREATE OR REPLACE FUNCTION notify_grade_published()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status != 'published') THEN
        INSERT INTO notifications (user_id, title, message, type, related_id)
        VALUES (
            NEW.student_id,
            'New Grade Published',
            'A new grade has been published for your assignment',
            'grade_published',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'grade_published_notification'
    ) THEN
        CREATE TRIGGER grade_published_notification AFTER INSERT OR UPDATE ON grades
            FOR EACH ROW EXECUTE FUNCTION notify_grade_published();
    END IF;
END $$;

-- Real-time subscriptions setup (to be configured in the app)
-- These tables will have real-time enabled:
-- - grades (for live grade updates)
-- - notifications (for instant notifications)
-- - feedback (for real-time feedback)

-- Sample data insertion (for testing)
-- Note: Users must be created through the authentication system, not directly in the database
-- After creating users through the app, you can insert sample data like this:

-- Sample course (you can run this after setting up users)
-- INSERT INTO courses (course_code, course_name, lecturer_id, department, semester, academic_year) VALUES
--     ('CS101', 'Introduction to Programming', 'lecturer-user-id-here', 'Computer Science', 'Fall', '2024');

-- Sample enrollment (run after creating course and having student user)
-- INSERT INTO enrollments (student_id, course_id) VALUES
--     ('student-user-id-here', 'course-id-here');

-- Sample assignment
-- INSERT INTO assignments (course_id, title, description, total_marks, created_by) VALUES
--     ('course-id-here', 'Assignment 1', 'Basic programming concepts', 100, 'lecturer-user-id-here');
