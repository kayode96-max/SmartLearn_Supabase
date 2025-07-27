@echo off
echo 🚀 Setting up SmartLearn School Management System...
echo =================================================

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are available

echo 📦 Installing dependencies...
call npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react react-hook-form react-hot-toast lucide-react date-fns

if %ERRORLEVEL% EQU 0 (
    echo ✅ Dependencies installed successfully!
) else (
    echo ❌ Failed to install dependencies. Please check your internet connection and try again.
    echo You can also try installing packages individually:
    echo npm install @supabase/supabase-js
    echo npm install @supabase/auth-helpers-nextjs
    echo npm install react-hook-form react-hot-toast lucide-react date-fns
    pause
    exit /b 1
)

if not exist .env.local (
    echo 📝 Creating environment file...
    copy .env.local.example .env.local
    echo ✅ Created .env.local from example. Please update it with your Supabase credentials.
) else (
    echo ℹ️  .env.local already exists
)

echo.
echo 🎉 Setup complete!
echo =================================================
echo Next steps:
echo 1. Set up your Supabase project at https://supabase.com
echo 2. Run the SQL schema from supabase/schema.sql in your Supabase dashboard
echo 3. Update .env.local with your Supabase credentials
echo 4. Run 'npm run dev' to start the development server
echo.
echo For detailed setup instructions, see README.md
pause
