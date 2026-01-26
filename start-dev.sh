#!/bin/bash

# E-Hokimiyat Development Server Startup Script

echo "🚀 Starting E-Hokimiyat Development Servers..."

# Kill any existing processes
echo "🔄 Cleaning up existing processes..."
pkill -f "python manage.py runserver" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 2

# Start Django backend
echo "📦 Starting Django backend on port 8001..."
cd backend
python manage.py runserver 8001 > /tmp/django.log 2>&1 &
DJANGO_PID=$!
cd ..

# Wait for Django to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Test backend
if curl -s http://localhost:8001/api/auth/login/ > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:8001"
else
    echo "❌ Backend failed to start. Check /tmp/django.log for errors"
    exit 1
fi

# Start Next.js frontend
echo "🎨 Starting Next.js frontend on port 3000..."
npm run dev &
NEXTJS_PID=$!

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✨ Development servers are running!"
echo "═══════════════════════════════════════════════════════════"
echo "📱 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:8001"
echo "📊 Admin:     http://localhost:8001/admin"
echo ""
echo "Django PID:   $DJANGO_PID"
echo "Next.js PID:  $NEXTJS_PID"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "═══════════════════════════════════════════════════════════"

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping servers...'; kill $DJANGO_PID $NEXTJS_PID 2>/dev/null; exit 0" INT
wait
