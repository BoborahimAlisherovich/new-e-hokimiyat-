# Serverga Deploy qilish bo'yicha qo'llanma

Bu qo'llanma **Ubuntu 20.04/22.04** serverlari uchun mo'ljallangan.

## 1. Serverga SSH kalit orqali ulanish

Agar serveringizga hali kirmagan bo'lsangiz:
```bash
ssh root@server_ip_manzili
```

## 2. GitHub bilan bog'lash (SSH Key)

Serverda GitHub-ga kirish uchun yangi SSH kalit yaratamiz:

```bash
# SSH kalit yaratish (email o'rniga o'zingiznikini yozing)
ssh-keygen -t ed25519 -C "your_email@example.com"
# Barcha savollarga Enter bosib o'tib keting

# Kalitni ko'rish va nusxalash
cat ~/.ssh/id_ed25519.pub
```

Chiqgan natijani (masalan: `ssh-ed25519 AAA...`) nusxalab oling va:
1. GitHub.com saytiga kiring.
2. **Settings** -> **SSH and GPG keys** -> **New SSH key**.
3. Nomiga "My Server" deb yozing va Key qismiga nusxalagan kalitni tashlang.

## 3. Loyihani yuklab olish (Clone)

```bash
# Web papkaga o'tish
cd /var/www

# Repozitoriyni klonlash
git clone git@github.com:muslimbek77/e-hokimiyat-hatirchi.git e-hokimiyat-hatirchi

# Papkaga kirish
cd e-hokimiyat-hatirchi
```

## 4. Backend (Django) sozlash

```bash
cd backend

# Python va kerakli kutubxonalarni o'rnatish
apt update
apt install python3-pip python3-venv libpq-dev nginx -y

# Virtual muhit yaratish
python3 -m venv env
source env/bin/activate

# Kutubxonalarni o'rnatish
pip install -r requirements.txt
pip install gunicorn uvicorn

# .env fayl yaratish
nano .env
```
`.env` fayl ichiga quyidagilarni yozing:
```env
DEBUG=False
SECRET_KEY=juda-uzun-va-maxfiy-kalit-yozing
ALLOWED_HOSTS=api.gameroom.uz,localhost
CSRF_TRUSTED_ORIGINS=http://api.gameroom.uz
```
(Saqlash uchun: Ctrl+O, Enter, Ctrl+X)

```bash
# Migratsiya va statik fayllar
python manage.py migrate
python manage.py collectstatic --noinput

# Gunicorn serviceni sozlash
cp ../deploy/gunicorn.service /etc/systemd/system/
systemctl start gunicorn
systemctl enable gunicorn
```

## 5. Frontend (Next.js) sozlash

```bash
# Node.js o'rnatish (agar bo'lmasa)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Loyiha papkasiga qaytish
cd ../frontend

# Kutubxonalarni o'rnatish
npm install

# Build qilish
npm run build

# PM2 o'rnatish (serverda uxlab qolmasligi uchun)
npm install -g pm2

# Ilovani ishga tushirish
pm2 start npm --name "frontend" -- start
pm2 save
pm2 startup
```

## 6. Nginx (Domenlarni ulash)

```bash
# Konfiguratsiya faylini nusxalash
cp ../deploy/nginx.conf /etc/nginx/sites-available/gameroom

# Simvolik havola yaratish
ln -s /etc/nginx/sites-available/gameroom /etc/nginx/sites-enabled/

# Nginx ni tekshirish va qayta yuklash
nginx -t
systemctl restart nginx
```

## 7. Yakuniy tekshiruv

- Frontend: http://gameroom.uz
- Backend API: http://api.gameroom.uz

**Muhim:** DNS sozlamalaringizda (masalan GoDaddy yoki boshqa provayderda) `gameroom.uz` va `api.gameroom.uz` serveringiz IP manziliga to'g'irlangan bo'lishi shart (A record).
