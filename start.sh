#!/bin/bash

# Visitor Intelligence Platform - Startup Script

echo "🚀 Starting Visitor Intelligence Platform..."

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

if ! command_exists python3; then
    echo "❌ Python is not installed. Please install Python 3.11+"
    exit 1
fi

if ! command_exists redis-server; then
    echo "⚠️  Redis is not installed. Please install Redis for background tasks"
fi

echo "✅ Prerequisites check completed"

# Start services
echo "🔄 Starting services..."

# Start Redis (if available)
if command_exists redis-server; then
    echo "📦 Starting Redis..."
    redis-server --daemonize yes
fi

# Start backend
echo "🐍 Starting Python backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
python run.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "⚛️  Starting React frontend..."
cd frontend
npm install > /dev/null 2>&1
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 Visitor Intelligence Platform is starting up!"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/api/v1/docs"
echo "❤️  Health Check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    if command_exists redis-server; then
        redis-cli shutdown 2>/dev/null
    fi
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for processes
wait
