#!/bin/bash

# Netlify Deployment Script for E-Hokimiyat Frontend

echo "🚀 Starting Netlify deployment for E-Hokimiyat Frontend..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Check if .next directory exists
if [ ! -d ".next" ]; then
    echo "❌ Build directory not found!"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📁 Build output is ready in .next directory"
echo ""
echo "🌐 Next steps for Netlify deployment:"
echo "1. Go to https://app.netlify.com/drop"
echo "2. Drag and drop the '.next' folder to Netlify"
echo "3. Or run: npx netlify deploy --prod --dir=.next"
echo ""
echo "🎉 Ready for deployment!"
