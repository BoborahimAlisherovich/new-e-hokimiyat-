#!/bin/bash

# Xato bo‘lsa to‘xtaydi
set -e

PROJECT_ROOT="/home/www/e-hokimiyat-hatirchi"
FRONTEND_NAME="frontend"

echo "🚀 Deploy jarayoni boshlandi..."

cd $PROJECT_ROOT

# 1. Kodlarni yangilash
echo "📥 Git pull..."
git checkout main
git pull origin main

# 2. Frontend — tozalash
echo "🧹 Frontend tozalash..."
rm -rf .next
rm -rf node_modules

# 3. Dependency o‘rnatish (PNPM)
echo "📦 Dependencies o‘rnatilmoqda (pnpm)..."
pnpm install

# 4. Production build
echo "🏗️ Frontend build..."
pnpm build

# 5. PM2 restart (to‘g‘ri cwd bilan)
echo "🔁 PM2 restart..."
pm2 delete $FRONTEND_NAME || true

pm2 start pnpm \
  --name $FRONTEND_NAME \
  --cwd $PROJECT_ROOT \
  -- start

pm2 save

# 6. Backend
echo "🐍 Backend update..."
cd $PROJECT_ROOT/backend

source env/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

sudo systemctl restart gunicorn

# 7. Nginx
echo "🌐 Nginx restart..."
sudo systemctl restart nginx

echo "✅ Deploy muvaffaqiyatli yakunlandi!"