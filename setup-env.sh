#!/bin/bash

echo "🔧 SmartLearn Supabase Environment Setup"
echo "========================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo ""
    echo "📋 To fix this issue:"
    echo "1. Copy the example file: cp .env.example .env.local"
    echo "2. Get your Supabase credentials:"
    echo "   - Go to https://supabase.com/dashboard"
    echo "   - Select your project"
    echo "   - Go to Settings > API"
    echo "   - Copy Project URL and anon key"
    echo "3. Edit .env.local with your credentials"
    echo "4. Restart the development server: npm run dev"
    echo ""
    
    # Ask if user wants to create template
    read -p "🤔 Would you like me to create a template .env.local file? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.example .env.local
        echo "✅ Created .env.local template file"
        echo "📝 Please edit .env.local with your Supabase credentials"
        echo ""
        echo "🌐 Your Supabase credentials can be found at:"
        echo "   https://supabase.com/dashboard → Your Project → Settings → API"
    fi
else
    echo "✅ .env.local file found"
    
    # Check if environment variables are set
    if grep -q "your_supabase_project_url_here" .env.local || grep -q "your_supabase_anon_key_here" .env.local; then
        echo "⚠️  Environment variables appear to be using placeholder values"
        echo "📝 Please update .env.local with your actual Supabase credentials"
    else
        echo "✅ Environment variables appear to be configured"
    fi
fi

echo ""
echo "🚀 Once environment variables are set, restart with: npm run dev"
