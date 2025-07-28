# Database Migration Check

This error suggests that the assignments table might not have the correct structure. Let's run the database migration to ensure all columns exist.

## Steps to Fix:

### 1. Go to your Supabase Dashboard
- Visit: https://supabase.com/dashboard
- Select your project: `rieibnyrvkidvlvjcwdx` 

### 2. Run the Database Schema
- Go to **SQL Editor** in the sidebar
- Copy the contents of `supabase/schema.sql` and run it
- This will create all the necessary tables and columns

### 3. Or Run the Migration
- In SQL Editor, copy and paste the contents of `migration_update_assignments.sql` 
- This will add any missing columns to the assignments table

### 4. Test the Database Structure
After running the schema, you can test if the assignments table has the right structure by running this query in the SQL Editor:

```sql
-- Check assignments table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'assignments' 
ORDER BY ordinal_position;
```

The assignments table should have these columns:
- id (uuid)
- course_id (uuid) 
- instructor_id (uuid)
- title (text)
- description (text)
- assignment_type (text)
- max_points (integer)
- due_date (timestamp with time zone)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### 5. Check Profiles Table
Also verify the profiles table exists with proper role column:

```sql
-- Check profiles table structure  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
```

### 6. Restart Development Server
After running the database setup, restart the development server to ensure the connection is fresh.
