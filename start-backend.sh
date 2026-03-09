#!/bin/bash

# Backend only startup script
echo "🔧 Starting Django backend only..."

cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
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

# Start Django development server
echo "🚀 Starting Django server on http://localhost:8000"
python manage.py runserver 0.0.0.0:8000
