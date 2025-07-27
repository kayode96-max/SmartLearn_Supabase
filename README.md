# SmartLearn - School Management System

A comprehensive school management application built with Next.js, TypeScript, and Supabase. This app provides separate portals for students and lecturers with real-time grade tracking, authentication, email notifications, and a feedback system.

## 🚀 Features

### For Students
- **Real-time Grade Tracking**: View grades as they are published with instant notifications
- **Course Management**: View enrolled courses and assignments
- **Feedback System**: Receive and respond to lecturer feedback
- **Grade Query**: Search and filter grades by course, assignment, or date
- **Email Notifications**: Get notified about new grades and announcements
- **Progress Tracking**: View academic progress and statistics

### For Lecturers
- **Grade Management**: Grade assignments and publish results
- **Student Records**: Maintain accurate student records and progress
- **Feedback System**: Provide detailed feedback to students
- **Course Management**: Manage courses, assignments, and announcements
- **Real-time Updates**: See student submissions and manage grading efficiently
- **Analytics**: View student performance statistics and trends

### Technical Features
- **Real-time Updates**: Powered by Supabase real-time subscriptions
- **Secure Authentication**: Role-based access control (Student/Lecturer)
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Email Notifications**: Automated email alerts for important activities
- **Data Security**: Row-level security with Supabase
- **Modern UI**: Clean, intuitive interface built with Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 with TypeScript
- **Backend**: Supabase (Database, Authentication, Real-time)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📋 Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier available)
- Git

## 🚀 Quick Setup Guide

### Step 1: Install Dependencies

```bash
# Install required dependencies (run when network is available)
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react react-hook-form react-hot-toast lucide-react date-fns
```

### Step 2: Set Up Supabase Database

1. **Create a Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Create a new project (free tier available)
   - Note down your Project URL and API Key

2. **Set Up the Database Schema**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase/schema.sql`
   - Run the SQL script to create all tables, functions, and policies

3. **Configure Authentication**
   - In Supabase dashboard, go to Authentication > Settings
   - Enable email authentication
   - Configure email templates if needed

### Step 3: Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

### Step 4: Run the Application

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 👥 Test Accounts

To test the application, you'll need to create accounts through the signup process:

1. **Create Test Accounts**:
   - Go to `http://localhost:3000` 
   - Sign up with `lecturer@smartlearn.com` and `student@smartlearn.com`

2. **Set User Roles** (via Supabase SQL Editor):
   ```sql
   -- Make lecturer account
   UPDATE profiles 
   SET role = 'lecturer', lecturer_id = 'LEC001', department = 'Computer Science'
   WHERE email = 'lecturer@smartlearn.com';

   -- Make student account
   UPDATE profiles 
   SET role = 'student', student_id = 'STU001', department = 'Computer Science', year_of_study = 2
   WHERE email = 'student@smartlearn.com';
   ```

3. **Add Sample Course Data**:
   ```sql
   -- Insert sample course (replace lecturer-user-id with actual ID from auth.users)
   INSERT INTO courses (course_code, course_name, lecturer_id, department, semester, academic_year) 
   VALUES ('CS101', 'Introduction to Programming', 'lecturer-user-id-here', 'Computer Science', 'Fall', '2024');
   ```

## 📚 Database Schema Overview

### Key Tables
- **profiles**: User profiles extending Supabase auth
- **courses**: Course information and management
- **enrollments**: Student-course relationships
- **assignments**: Assignment details and deadlines
- **grades**: Grade records with real-time updates
- **notifications**: System notifications
- **feedback**: Student-lecturer communication
- **announcements**: Course announcements

## 🔧 Common Setup Issues

### Network/Installation Issues
```bash
# If npm install fails due to network issues, try:
npm install --registry https://registry.npmjs.org/
# Or install packages individually:
npm install @supabase/supabase-js
npm install @supabase/auth-helpers-nextjs
npm install react-hook-form react-hot-toast lucide-react date-fns
```

### Quick Development Start
```bash
# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## 📱 Real-time Features

The app uses Supabase real-time subscriptions for:
- Instant grade updates
- Live notifications
- Real-time feedback
- Course announcements

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

## 📞 Support

For setup issues:
1. Check network connectivity for npm install
2. Verify Supabase configuration
3. Ensure environment variables are correct
4. Review database schema setup

---

**Built for educational institutions seeking modern, efficient grade management solutions.**
