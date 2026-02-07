#!/bin/bash

# ============================================
# pytech.uz - Quick Deploy Script
# ============================================
# Usage: ./quick-deploy.sh [backend|frontend|all]

set -e

PROJECT_DIR="/var/www/pytech"
BACKEND_DIR="$PROJECT_DIR/backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

deploy_backend() {
    echo_info "🐍 Deploying Backend..."
    
    cd $BACKEND_DIR
    source env/bin/activate
    
    echo_info "Installing dependencies..."
    pip install -r requirements.txt --quiet
    
    echo_info "Running migrations..."
    python manage.py migrate --noinput
    
    echo_info "Collecting static files..."
    python manage.py collectstatic --noinput
    
    echo_info "Restarting services..."
    sudo systemctl restart daphne
    sudo systemctl restart celery
    sudo systemctl restart celery-beat
    
    echo_info "✅ Backend deployed successfully!"
}

deploy_frontend() {
    echo_info "⚛️ Deploying Frontend..."
    
    cd $PROJECT_DIR
    
    echo_info "Installing dependencies..."
    pnpm install
    
    echo_info "Building..."
    pnpm build
    
    echo_info "Restarting PM2..."
    pm2 restart pytech-frontend
    
    echo_info "✅ Frontend deployed successfully!"
}

pull_code() {
    echo_info "📥 Pulling latest code..."
    cd $PROJECT_DIR
    git fetch origin
    git reset --hard origin/main
}

show_status() {
    echo ""
    echo_info "📊 Services Status:"
    echo "-------------------"
    systemctl is-active --quiet daphne && echo -e "Daphne:      ${GREEN}Running${NC}" || echo -e "Daphne:      ${RED}Stopped${NC}"
    systemctl is-active --quiet celery && echo -e "Celery:      ${GREEN}Running${NC}" || echo -e "Celery:      ${RED}Stopped${NC}"
    systemctl is-active --quiet celery-beat && echo -e "Celery Beat: ${GREEN}Running${NC}" || echo -e "Celery Beat: ${RED}Stopped${NC}"
    systemctl is-active --quiet nginx && echo -e "Nginx:       ${GREEN}Running${NC}" || echo -e "Nginx:       ${RED}Stopped${NC}"
    pm2 list | grep pytech-frontend > /dev/null && echo -e "Frontend:    ${GREEN}Running${NC}" || echo -e "Frontend:    ${RED}Stopped${NC}"
    echo ""
}

case "$1" in
    backend)
        pull_code
        deploy_backend
        show_status
        ;;
    frontend)
        pull_code
        deploy_frontend
        show_status
        ;;
    all|"")
        pull_code
        deploy_backend
        deploy_frontend
        show_status
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {backend|frontend|all|status}"
        exit 1
        ;;
esac
