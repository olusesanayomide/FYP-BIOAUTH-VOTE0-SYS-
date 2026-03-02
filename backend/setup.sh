#!/bin/bash
# Backend Quick Setup Script

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Biometric Voting System - Backend Quick Setup            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found"
    echo "Creating .env from .env.example..."
    
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file"
        echo ""
        echo "⚠️  Please edit .env with your Supabase credentials:"
        echo "   - SUPABASE_URL"
        echo "   - SUPABASE_ANON_KEY"
        echo "   - SUPABASE_SERVICE_ROLE_KEY"
        echo ""
        echo "Generate ENCRYPTION_KEY with:"
        echo "   openssl rand -hex 32"
        echo ""
        exit 1
    else
        echo "❌ .env.example not found"
        exit 1
    fi
fi

echo "✅ .env file configured"
echo ""

# Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
npm run typecheck

if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo "✅ TypeScript is valid"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Setup Complete!                              ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║                                                            ║"
echo "║  Next Steps:                                              ║"
echo "║  1. Run database setup:                                   ║"
echo "║     - Open Supabase dashboard                             ║"
echo "║     - Go to SQL Editor                                    ║"
echo "║     - Run scripts/schema.sql                              ║"
echo "║                                                            ║"
echo "║  2. Start the backend server:                             ║"
echo "║     npm run dev                                           ║"
echo "║                                                            ║"
echo "║  3. Test the server:                                      ║"
echo "║     curl http://localhost:3001/health                    ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
