# Supabase Setup Guide for SmartLearn

## Step-by-Step Supabase Configuration

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: SmartLearn
   - **Database Password**: Create a secure password
   - **Region**: Choose closest to your location
6. Click "Create new project"
7. Wait for the project to be set up (takes 1-2 minutes)

### 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., https://abcdefgh.supabase.co)
   - **anon/public key** (starts with "eyJ...")
   - **service_role key** (starts with "eyJ...")

### 3. Set Up Environment Variables

1. In your SmartLearn project, copy `.env.local.example` to `.env.local`
2. Update the values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4. Set Up the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql` from this project
4. Paste it into the SQL editor
5. Click "Run" to execute the schema

This will create:
- All necessary tables (profiles, courses, enrollments, etc.)
- Row Level Security policies
- Database functions and triggers
- Indexes for performance

**Note**: The schema no longer includes sample users since Supabase manages authentication separately.

### 5. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Under "Site URL", add your local development URL: `http://localhost:3000`
3. Under "Redirect URLs", add: `http://localhost:3000/auth/callback`
4. Enable "Confirm email" if you want email verification
5. Configure email templates under **Auth** → **Templates** (optional)

### 6. Set Up Real-time Features

1. Go to **Database** → **Replication**
2. Enable real-time for these tables:
   - `grades`
   - `notifications` 
   - `feedback`
3. Click "Enable" for each table

### 7. Test the Setup

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000`
3. Create test accounts by signing up through the app:
   - Create a lecturer account with email `lecturer@smartlearn.com`
   - Create a student account with email `student@smartlearn.com`
4. After creating accounts, you'll need to manually set user roles in the database:

**Setting User Roles:**
1. Go to Supabase dashboard → **Authentication** → **Users**
2. Find your test users and copy their User IDs
3. Go to **SQL Editor** and run:

```sql
-- Update user profile to be a lecturer
UPDATE profiles 
SET role = 'lecturer', lecturer_id = 'LEC001', department = 'Computer Science'
WHERE email = 'lecturer@smartlearn.com';

-- Update user profile to be a student  
UPDATE profiles 
SET role = 'student', student_id = 'STU001', department = 'Computer Science', year_of_study = 2
WHERE email = 'student@smartlearn.com';
```

5. Now you can log in with these accounts to test different functionalities

### 8. Optional: Email Configuration

For email notifications, you can configure SMTP:

1. In `.env.local`, add:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

2. For Gmail, you'll need to:
   - Enable 2-factor authentication
   - Generate an app-specific password
   - Use that password in SMTP_PASS

### 9. Production Deployment

When deploying to production:

1. Update "Site URL" in Supabase Auth settings to your production domain
2. Add production domain to "Redirect URLs"
3. Update environment variables in your hosting platform
4. Ensure your production domain is added to Supabase CORS settings

### Common Issues and Solutions

**Issue**: "Failed to fetch" errors
- **Solution**: Check your environment variables and Supabase project URL

**Issue**: Authentication not working
- **Solution**: Verify Site URL and Redirect URLs in Supabase Auth settings

**Issue**: Database connection errors
- **Solution**: Ensure your Supabase project is active and API keys are correct

**Issue**: Real-time not working
- **Solution**: Check if real-time is enabled for the required tables

### Database Tables Overview

- **profiles**: User information extending Supabase auth
- **courses**: Course details and lecturer assignments
- **enrollments**: Student-course relationships
- **assignments**: Assignment information
- **grades**: Grade records with automatic calculations
- **notifications**: System notifications for users
- **feedback**: Communication between students and lecturers
- **announcements**: Course announcements

### Security Features

- Row Level Security (RLS) enabled on all tables
- Students can only see their own data
- Lecturers can only access their courses and students
- Automatic grade calculations and validations
- Secure authentication with JWT tokens

### Next Steps

After setup:
1. Test all functionality with demo accounts
2. Create real courses and assignments
3. Invite users to test the system
4. Customize the UI as needed
5. Set up automated backups
6. Monitor usage and performance

For support, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [SmartLearn README](./README.md)
- Project issues on GitHub
