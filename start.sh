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

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Ensure dotenv file exists for default credentials
if [ ! -f ".env" ]; then
    echo "📝 .env fayli topilmadi, env.example nusxasi asosida yaratilmoqda..."
    cp env.example .env
    echo "ℹ️  Yaratilgan .env faylni joylashuvga moslab o'zgartiring."
fi

# Install dependencies if needed
if [ ! -f "venv/pyvenv.cfg" ] || ! pip list | grep -q "daphne"; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
fi

# Run migrations
echo "🗄️  Running migrations..."
python manage.py migrate

# Ensure admin user exists with configured credentials
echo "🛡️  Ensuring admin user exists..."
python create_admin.py

# Start Daphne server
python -m daphne -b 0.0.0.0 -p 8000 ehokimiyat.asgi:application > /tmp/daphne.log 2>&1 &
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
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies (node_modules)..."
    npm install
fi
# Disable Turbopack to avoid workspace root resolution issues
NEXT_DISABLE_TURBOPACK=1 npx next dev -H 0.0.0.0 -p 3000 &
FRONTEND_PID=$!

echo "✅ Both services started successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:8000"
echo "💬 WebSocket Chat: ws://localhost:8000/ws/tasks/{task_id}/chat/"
echo ""
echo "📝 To stop the services, press Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID"
echo "🔴 Redis logs: redis-cli ping"
echo "📋 Backend logs: tail -f /tmp/daphne.log"

# Wait for user interrupt
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; redis-cli shutdown 2>/dev/null; exit" INT

# Keep the script running
wait
