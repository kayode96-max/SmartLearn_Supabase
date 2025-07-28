# SmartLearn - School Management System

## Overview
SmartLearn is a modern school management application built with **Next.js 15**, **TypeScript**, and **Supabase**. It provides separate portals for students and lecturers with real-time grade tracking, course management, and secure authentication.

## Core Features

### For Students
- Browse and enroll in department courses
- Real-time grade tracking and notifications
- View assignments and academic performance analytics

### For Lecturers
- Create and manage courses and assignments
- Direct table-based grading system with automatic grade calculation
- Student enrollment management and performance analytics

### System Features
- Role-based authentication (student/lecturer/admin)
- Real-time updates and notifications
- Department-based course organization

## Supabase Integration

### Authentication & Security
- **Supabase Auth**: Secure user authentication with role-based access
- **Row Level Security (RLS)**: Students access only their data, lecturers manage only their courses

### Database (PostgreSQL)
**Core Tables:**
- **profiles**: User roles and information
- **courses**: Course management with department filtering
- **enrollments**: Student-course relationships
- **assignments**: Assessment types with automatic max points (Assignment:10, Test:20, Exam:60, Attendance:5, Classwork:5)
- **grades**: Automatic percentage and grade letter calculation
- **notifications**: Real-time notification system

**Advanced Features:**
- Generated columns for automatic calculations
- Database triggers for grade notifications
- Complex join queries for related data

### Real-time Features
- Live grade updates using Supabase Realtime
- Instant notifications via WebSocket connections
- Real-time dashboard statistics

## Technical Stack

### Frontend
- **Next.js 15** with App Router and TypeScript
- **Tailwind CSS** for responsive design
- **React Hook Form** for form validation
- **Custom hooks** for state management (`useAuth`, `useGrades`, `useNotifications`)

### Backend (Supabase)
- **PostgreSQL** database with advanced features
- **JWT Authentication** with role-based access
- **Real-time subscriptions** for live updates
- **Row Level Security** for data protection

## Key Features

### Intelligent Grading System
- Direct table grading for all assessment types in one interface
- Automatic assignment creation when grades are entered
- Real-time grade publishing to students
- Automatic percentage and letter grade calculation

### Security & Performance
- Comprehensive RLS policies for data privacy
- Real-time collaboration with conflict handling
- Optimized database queries with proper indexing
- Mobile-responsive design

## Conclusion
SmartLearn demonstrates modern web development using Supabase as a powerful backend. The combination provides a scalable, real-time school management solution with excellent security and user experience.
