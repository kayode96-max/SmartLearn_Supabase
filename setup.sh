#!/bin/bash

echo "🚀 Setting up SmartLearn School Management System..."
echo "================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Install dependencies
echo "📦 Installing dependencies..."
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react react-hook-form react-hot-toast lucide-react date-fns

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies. Please check your internet connection and try again."
    echo "You can also try installing packages individually:"
    echo "npm install @supabase/supabase-js"
    echo "npm install @supabase/auth-helpers-nextjs"
    echo "npm install react-hook-form react-hot-toast lucide-react date-fns"
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating environment file..."
    cp .env.local.example .env.local
    echo "✅ Created .env.local from example. Please update it with your Supabase credentials."
else
    echo "ℹ️  .env.local already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo "================================================="
echo "Next steps:"
echo "1. Set up your Supabase project at https://supabase.com"
echo "2. Run the SQL schema from supabase/schema.sql in your Supabase dashboard"
echo "3. Update .env.local with your Supabase credentials"
echo "4. Run 'npm run dev' to start the development server"
echo ""
echo "For detailed setup instructions, see README.md"
