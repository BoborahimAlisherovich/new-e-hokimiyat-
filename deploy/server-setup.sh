#!/bin/bash

# ============================================
# pytech.uz - Initial Server Setup Script
# ============================================
# Run this script on a fresh Ubuntu 22.04 server
# Usage: sudo bash server-setup.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo_error "Please run as root or with sudo"
    exit 1
fi

echo ""
echo "========================================"
echo "   pytech.uz Server Setup Script"
echo "========================================"
echo ""

# Step 1: Update system
echo_info "Step 1: Updating system..."
apt update && apt upgrade -y

# Step 2: Install basic packages
echo_info "Step 2: Installing basic packages..."
apt install -y \
    git \
    curl \
    wget \
    vim \
    htop \
    nginx \
    certbot \
    python3-certbot-nginx \
    python3-pip \
    python3-venv \
    postgresql \
    postgresql-contrib \
    redis-server \
    ufw \
    fail2ban

# Step 3: Install Node.js 20
echo_info "Step 3: Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Step 4: Install pnpm and PM2
echo_info "Step 4: Installing pnpm and PM2..."
npm install -g pnpm pm2

# Step 5: Configure firewall
echo_info "Step 5: Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Step 6: Enable services
echo_info "Step 6: Enabling services..."
systemctl enable nginx
systemctl enable postgresql
systemctl enable redis-server
systemctl start nginx
systemctl start postgresql
systemctl start redis-server

# Step 7: Create project directory
echo_info "Step 7: Creating project directory..."
mkdir -p /var/www/pytech
chown -R www-data:www-data /var/www

# Step 8: Setup PostgreSQL database
echo_info "Step 8: Setting up PostgreSQL..."
echo ""
echo_warn "Please enter a password for the database user 'ehokimiyat_user':"
read -s DB_PASSWORD

sudo -u postgres psql << EOF
CREATE DATABASE ehokimiyat;
CREATE USER ehokimiyat_user WITH PASSWORD '$DB_PASSWORD';
ALTER ROLE ehokimiyat_user SET client_encoding TO 'utf8';
ALTER ROLE ehokimiyat_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE ehokimiyat_user SET timezone TO 'Asia/Tashkent';
GRANT ALL PRIVILEGES ON DATABASE ehokimiyat TO ehokimiyat_user;
ALTER DATABASE ehokimiyat OWNER TO ehokimiyat_user;
EOF

# Step 9: Generate SSH key for GitHub
echo_info "Step 9: Generating SSH key for GitHub..."
if [ ! -f ~/.ssh/id_ed25519 ]; then
    ssh-keygen -t ed25519 -C "pytech@server" -f ~/.ssh/id_ed25519 -N ""
fi

echo ""
echo "========================================"
echo "   Setup Complete!"
echo "========================================"
echo ""
echo_info "📋 Next Steps:"
echo ""
echo "1. Add this SSH key to your GitHub account:"
echo "   https://github.com/settings/ssh/new"
echo ""
cat ~/.ssh/id_ed25519.pub
echo ""
echo "2. Clone your repository:"
echo "   cd /var/www/pytech"
echo "   git clone git@github.com:YOUR_USERNAME/e-hokimiyat-hatirchi.git ."
echo ""
echo "3. Database password: $DB_PASSWORD"
echo "   (Save this for your .env file)"
echo ""
echo "4. Run the deploy guide:"
echo "   cat /var/www/pytech/deploy/DEPLOY_GUIDE_PYTECH.md"
echo ""
