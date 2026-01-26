#!/bin/bash

# Stop on error
set -e

echo "🚀 Deploy jarayoni boshlandi..."

# 1. Kodlarni yangilash
echo "📥 Git pull..."
git checkout main
git pull origin main

# 2. Frontendni tozalash va build qilish
echo "🏗️ Frontend Build..."
cd frontend
rm -rf .next
rm -rf node_modules/.cache
npm install
npm run build

# 3. PM2 ni restart qilish
echo "cY PM2 Restart..."
pm2 restart frontend || pm2 start npm --name "frontend" -- start

# 4. Backendni yangilash
echo "🐍 Backend Update..."
cd ../backend
source env/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gunicorn

# 5. Nginx ni tekshirish
echo "cY Nginx Restart..."
sudo systemctl restart nginx

echo "✅ Muvaffaqiyatli yakunlandi!"
