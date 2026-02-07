# pytech.uz Serverga Deploy Qilish - To'liq Qo'llanma

## Domenlar:
- **Frontend**: pytech.uz
- **Backend API**: api.pytech.uz

---

## 1-BOSQICH: Serverga SSH bilan ulanish

```bash
ssh root@SERVER_IP
# yoki
ssh username@SERVER_IP
```

Ulanganingizdan keyin menga yozing, keyingi qadamga o'tamiz.

---

## 2-BOSQICH: Server tayyorlash (Birinchi marta)

### 2.1 Tizimni yangilash
```bash
apt update && apt upgrade -y
```

### 2.2 Kerakli dasturlarni o'rnatish
```bash
apt install -y \
    git \
    curl \
    nginx \
    certbot \
    python3-certbot-nginx \
    python3-pip \
    python3-venv \
    postgresql \
    postgresql-contrib \
    redis-server \
    supervisor \
    ufw
```

### 2.3 Node.js (v20) o'rnatish
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
npm install -g pm2 pnpm
```

### 2.4 Firewall sozlash
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 3-BOSQICH: GitHub SSH kalitini sozlash

### 3.1 SSH kalit yaratish
```bash
ssh-keygen -t ed25519 -C "pytech@server"
# Barcha savollarga Enter bosing
```

### 3.2 Kalitni ko'rish
```bash
cat ~/.ssh/id_ed25519.pub
```

**Chiqgan natijani nusxalang va:**
1. GitHub.com -> Settings -> SSH and GPG keys -> New SSH key
2. Title: "pytech-server"
3. Key: Nusxalagan kalitni joylang
4. "Add SSH key" bosing

### 3.3 GitHub bilan bog'lanishni tekshirish
```bash
ssh -T git@github.com
# "Hi username! You've successfully authenticated" chiqishi kerak
```

---

## 4-BOSQICH: PostgreSQL Database sozlash

```bash
# PostgreSQL ga kirish
sudo -u postgres psql

# Database va user yaratish
CREATE DATABASE ehokimiyat;
CREATE USER ehokimiyat_user WITH PASSWORD 'KUCHLI_PAROL_YOZING';
ALTER ROLE ehokimiyat_user SET client_encoding TO 'utf8';
ALTER ROLE ehokimiyat_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE ehokimiyat_user SET timezone TO 'Asia/Tashkent';
GRANT ALL PRIVILEGES ON DATABASE ehokimiyat TO ehokimiyat_user;
\q
```

---

## 5-BOSQICH: Loyihani serverga yuklash

### 5.1 Papka yaratish va klonlash
```bash
mkdir -p /var/www
cd /var/www
git clone git@github.com:YOUR_USERNAME/e-hokimiyat-hatirchi.git pytech
cd pytech
```

---

## 6-BOSQICH: Backend (Django) sozlash

### 6.1 Virtual muhit yaratish
```bash
cd /var/www/pytech/backend
python3 -m venv env
source env/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn daphne
```

### 6.2 Environment faylini yaratish
```bash
nano /var/www/pytech/backend/.env
```

Quyidagilarni yozing:
```env
DEBUG=False
SECRET_KEY=super-secret-key-juda-uzun-va-murakkab-string
ALLOWED_HOSTS=api.pytech.uz,localhost,127.0.0.1

# Database
DATABASE_URL=postgres://ehokimiyat_user:KUCHLI_PAROL_YOZING@localhost:5432/ehokimiyat

# Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://pytech.uz,https://www.pytech.uz

# CSRF
CSRF_TRUSTED_ORIGINS=https://api.pytech.uz,https://pytech.uz

# AI (ixtiyoriy)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Telegram Bot (ixtiyoriy)
TELEGRAM_BOT_TOKEN=your-bot-token
```

**Ctrl+O, Enter, Ctrl+X** - saqlash

### 6.3 Database migratsiya
```bash
source /var/www/pytech/backend/env/bin/activate
cd /var/www/pytech/backend
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

---

## 7-BOSQICH: Backend servicelari sozlash

### 7.1 Daphne (ASGI) service
```bash
nano /etc/systemd/system/daphne.service
```

```ini
[Unit]
Description=Daphne ASGI Server for pytech.uz
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/pytech/backend
Environment="PATH=/var/www/pytech/backend/env/bin"
EnvironmentFile=/var/www/pytech/backend/.env
ExecStart=/var/www/pytech/backend/env/bin/daphne \
    -u /var/www/pytech/backend/daphne.sock \
    ehokimiyat.asgi:application
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 7.2 Celery Worker service
```bash
nano /etc/systemd/system/celery.service
```

```ini
[Unit]
Description=Celery Worker for pytech.uz
After=network.target redis.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/pytech/backend
Environment="PATH=/var/www/pytech/backend/env/bin"
EnvironmentFile=/var/www/pytech/backend/.env
ExecStart=/var/www/pytech/backend/env/bin/celery -A ehokimiyat worker -l info
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 7.3 Celery Beat (scheduler) service
```bash
nano /etc/systemd/system/celery-beat.service
```

```ini
[Unit]
Description=Celery Beat Scheduler for pytech.uz
After=network.target redis.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/pytech/backend
Environment="PATH=/var/www/pytech/backend/env/bin"
EnvironmentFile=/var/www/pytech/backend/.env
ExecStart=/var/www/pytech/backend/env/bin/celery -A ehokimiyat beat -l info
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 7.4 Papka egaligini o'zgartirish va serviclarni ishga tushirish
```bash
chown -R www-data:www-data /var/www/pytech

systemctl daemon-reload
systemctl start daphne celery celery-beat
systemctl enable daphne celery celery-beat

# Statusini tekshirish
systemctl status daphne
```

---

## 8-BOSQICH: Frontend (Next.js) sozlash

### 8.1 Dependencies o'rnatish va build
```bash
cd /var/www/pytech

# Environment file
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.pytech.uz
NEXT_PUBLIC_WS_URL=wss://api.pytech.uz
```

```bash
# O'rnatish va build
pnpm install
pnpm build
```

### 8.2 PM2 bilan ishga tushirish
```bash
pm2 start npm --name "pytech-frontend" -- start
pm2 save
pm2 startup
```

---

## 9-BOSQICH: Nginx sozlash

### 9.1 Backend config (api.pytech.uz)
```bash
nano /etc/nginx/sites-available/api.pytech.uz
```

```nginx
server {
    listen 80;
    server_name api.pytech.uz;

    location = /favicon.ico { access_log off; log_not_found off; }

    location /static/ {
        alias /var/www/pytech/backend/staticfiles/;
    }

    location /media/ {
        alias /var/www/pytech/backend/media/;
    }

    # WebSocket uchun
    location /ws/ {
        proxy_pass http://unix:/var/www/pytech/backend/daphne.sock;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://unix:/var/www/pytech/backend/daphne.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 9.2 Frontend config (pytech.uz)
```bash
nano /etc/nginx/sites-available/pytech.uz
```

```nginx
server {
    listen 80;
    server_name pytech.uz www.pytech.uz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 9.3 Configlarni faollashtirish
```bash
ln -s /etc/nginx/sites-available/api.pytech.uz /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/pytech.uz /etc/nginx/sites-enabled/

# Default configni o'chirish
rm /etc/nginx/sites-enabled/default

# Tekshirish va qayta yuklash
nginx -t
systemctl reload nginx
```

---

## 10-BOSQICH: SSL Sertifikat olish (Let's Encrypt)

```bash
# SSL sertifikatlarini olish
certbot --nginx -d pytech.uz -d www.pytech.uz
certbot --nginx -d api.pytech.uz

# Auto-renew tekshirish
certbot renew --dry-run
```

---

## 11-BOSQICH: Yakuniy tekshiruvlar

```bash
# Serviclar statusi
systemctl status nginx
systemctl status daphne
systemctl status celery
systemctl status celery-beat
pm2 status

# Frontend log
pm2 logs pytech-frontend

# Backend log
journalctl -u daphne -f
```

### Brauzerda tekshirish:
- https://pytech.uz - Frontend
- https://api.pytech.uz/admin/ - Django Admin
- https://api.pytech.uz/api/ - API

---

## Yangilash (Update) qilish

Kelajakda kod yangilash kerak bo'lganda:

```bash
cd /var/www/pytech

# Yangi kodni tortib olish
git pull origin main

# Backend
cd backend
source env/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
systemctl restart daphne celery celery-beat

# Frontend
cd ..
pnpm install
pnpm build
pm2 restart pytech-frontend
```

---

## Muammolarni hal qilish

### Log fayllarni ko'rish
```bash
# Nginx error log
tail -f /var/log/nginx/error.log

# Daphne log
journalctl -u daphne -f

# Celery log
journalctl -u celery -f

# Frontend log
pm2 logs pytech-frontend
```

### Port tekshirish
```bash
ss -tlnp | grep -E '80|443|3000|8000'
```
