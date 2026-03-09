#!/bin/bash

# Localhost startup script
echo "🚀 Starting E-Hokimiyat Platform on localhost..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use. Attempting to free it..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Check if ports are available
echo "📋 Checking port availability..."
check_port 8000
check_port 3000

# Start Redis for WebSocket channel layer
echo "🔴 Starting Redis server..."
redis-server --daemonize yes --port 6379 2>/dev/null || echo "⚠️  Redis already running or not installed"

# Start Django backend
echo "🔧 Starting Django backend on localhost:8000..."
cd backend

if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

if ! pip list | grep -q "daphne"; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
fi

# Create .env file if not exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "ℹ️  Kerak bo'lsa .env faylini lokal muhitga moslab tahrirlang."
fi

# Run migrations
echo "🗄️  Running migrations..."
python manage.py migrate

# Ensure admin user exists
echo "🛡️  Ensuring admin user exists..."
python create_admin.py

# Start Django development server
echo "🚀 Starting Django server on http://localhost:8000"
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start Next.js frontend
echo "⚛️  Starting Next.js frontend on localhost:3000..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies (node_modules)..."
    npm install
fi
# Disable Turbopack to avoid workspace root resolution issues
NEXT_DISABLE_TURBOPACK=1 npx next dev -H localhost -p 3000 &
FRONTEND_PID=$!

echo "✅ Both services started successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:8000"
echo "🔗 Django Admin: http://localhost:8000/admin/"
echo ""
echo "📝 To stop services, press Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID"

# Wait for user interrupt
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; redis-cli shutdown 2>/dev/null; exit" INT

# Keep the script running
wait
