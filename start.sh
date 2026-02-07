#!/bin/bash

# E-Hokimiyat Platform Startup Script
echo "🚀 Starting E-Hokimiyat Platform..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use. Attempting to free it..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 2
        if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
            echo "❌ Port $1 is still in use. Please stop the service manually or choose a different port."
            exit 1
        fi
    fi
}

# Check if ports are available
echo "📋 Checking port availability..."
check_port 8000
check_port 3000

# Start Redis for WebSocket channel layer
echo "🔴 Starting Redis server..."
redis-server --daemonize yes --port 6379 2>/dev/null || echo "⚠️  Redis already running or not installed"

# Start Django backend with Daphne ASGI server (supports WebSocket)
echo "🔧 Starting Django backend with Daphne ASGI server on port 8000..."
cd backend
python3 -m daphne -b 0.0.0.0 -p 8000 ehokimiyat.asgi:application > /tmp/daphne.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 5
if ! lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Backend failed to start. Check /tmp/daphne.log for errors."
    exit 1
fi
echo "✅ Backend started with WebSocket support"

# Start Next.js frontend
echo "⚛️  Starting Next.js frontend on port 3000..."
npx next dev -H 0.0.0.0 -p 3000 &
FRONTEND_PID=$!

echo "✅ Both services started successfully!"
echo "🌐 Frontend: http://10.185.6.214:3000"
echo "🔗 Backend API: http://10.185.6.214:8000"
echo "💬 WebSocket Chat: ws://10.185.6.214:8000/ws/tasks/{task_id}/chat/"
echo ""
echo "📝 To stop the services, press Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID"
echo "🔴 Redis logs: redis-cli ping"
echo "📋 Backend logs: tail -f /tmp/daphne.log"

# Wait for user interrupt
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; redis-cli shutdown 2>/dev/null; exit" INT

# Keep the script running
wait