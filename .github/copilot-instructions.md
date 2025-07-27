<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# SmartLearn School Management App

This is a school management application built with Next.js, TypeScript, and Supabase. The app provides separate portals for students and lecturers with real-time grade tracking, authentication, and email notifications.

## Key Features:
- Student and Lecturer authentication
- Real-time grade tracking and updates
- Email notifications for new activities
- Grade query system for students
- Feedback system for lecturers
- Real-time database with Supabase

## Tech Stack:
- Frontend: Next.js 15 with TypeScript
- Backend: Supabase (Database, Auth, Real-time)
- Styling: Tailwind CSS
- Forms: React Hook Form
- Notifications: React Hot Toast
- Icons: Lucide React

## Project Structure:
- `/src/app` - Next.js App Router pages
- `/src/components` - Reusable React components
- `/src/lib` - Utility functions and Supabase client
- `/src/types` - TypeScript type definitions
- `/supabase` - Database schema and migrations

## Development Guidelines:
- Use TypeScript for all components and utilities
- Follow React best practices and hooks patterns
- Implement proper error handling and loading states
- Use Supabase real-time subscriptions for live updates
- Ensure proper authentication and authorization
- Use Tailwind CSS for styling with a clean, modern design
