-- Add RLS policy to allow lecturers to view students from departments they teach
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
