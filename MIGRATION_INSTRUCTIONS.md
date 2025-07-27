# Database Migration Instructions

## Problem
The assignments table in your Supabase database has the old structure with `total_marks` and `created_by` columns, but the application code expects `max_points` and `instructor_id` columns, plus the new `assignment_type` column.

## Solution
Run the migration SQL file to update your database structure.

## Steps to Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the "SQL Editor" section
3. Create a new query
4. Copy and paste the contents of `migration_update_assignments.sql`
5. Click "Run" to execute the migration

### Option 2: Using Supabase CLI (if you have it configured)
```bash
# If you have Supabase CLI configured with your remote project
supabase db push --db-url "your-supabase-connection-string"
```

### Option 3: Using psql (if you have PostgreSQL client)
```bash
# Connect to your Supabase database and run the migration
psql "your-supabase-connection-string" -f migration_update_assignments.sql
```

## What the Migration Does
1. **Adds new columns**: `assignment_type`, `instructor_id`, `max_points`
2. **Migrates existing data**: Copies `total_marks` → `max_points` and `created_by` → `instructor_id`
3. **Sets default values**: All existing assignments get `assignment_type = 'assignment'`
4. **Adds constraints**: Makes new columns NOT NULL after data migration
5. **Adds RLS policies**: Proper Row Level Security for assignments table

## After Migration
Once you run the migration successfully:
1. The assignment creation should work without errors
2. Students will be able to view assignments for their enrolled courses
3. Lecturers will be able to create and manage assignments for their courses
4. All existing assignments will be preserved with migrated data

## Optional Cleanup
The migration file includes commented lines to drop the old columns (`total_marks` and `created_by`). Only uncomment and run these after you've verified everything works correctly:

```sql
-- After verification, you can run these to clean up old columns:
-- ALTER TABLE assignments DROP COLUMN IF EXISTS total_marks;
-- ALTER TABLE assignments DROP COLUMN IF EXISTS created_by;
```

## Verification
After running the migration, you can verify it worked by:
1. Trying to create a new assignment in the application
2. Checking that existing assignments still display correctly
3. Running this query in SQL Editor to see the new structure:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'assignments' 
ORDER BY ordinal_position;
```
