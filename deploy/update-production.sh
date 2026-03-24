#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/pytech}"
BRANCH="${BRANCH:-main}"
BACKEND_DIR="$PROJECT_DIR/backend"
VENV_DIR="${VENV_DIR:-$BACKEND_DIR/venv}"
PM2_TARGET="${PM2_TARGET:-all}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

run_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    err "Command topilmadi: $1"
    exit 1
  }
}

print_header() {
  echo
  echo "========================================"
  echo " E-Hokimiyat Production Update"
  echo "========================================"
  echo "Project: $PROJECT_DIR"
  echo "Branch:  $BRANCH"
  echo "Time:    $(date '+%Y-%m-%d %H:%M:%S')"
  echo
}

check_paths() {
  [[ -d "$PROJECT_DIR" ]] || {
    err "Project papkasi topilmadi: $PROJECT_DIR"
    exit 1
  }

  [[ -d "$PROJECT_DIR/.git" ]] || {
    err "Git repository topilmadi: $PROJECT_DIR"
    exit 1
  }
}

show_git_state() {
  cd "$PROJECT_DIR"
  info "Joriy commit: $(git rev-parse --short HEAD)"
  if [[ -n "$(git status --porcelain)" ]]; then
    warn "Working tree dirty. Git pull merge conflict berishi mumkin."
  fi
}

pull_latest_code() {
  cd "$PROJECT_DIR"
  info "Git branch yangilanmoqda..."
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
}

install_backend_requirements_if_possible() {
  if [[ -x "$VENV_DIR/bin/python" ]]; then
    info "Backend requirementlar tekshirilmoqda..."
    "$VENV_DIR/bin/python" -m pip install -r "$BACKEND_DIR/requirements.txt"
  else
    warn "Virtualenv topilmadi: $VENV_DIR. Backend dependency install o'tkazib yuborildi."
  fi
}

run_backend_migrations_if_possible() {
  if [[ -x "$VENV_DIR/bin/python" ]]; then
    info "Migration ishga tushirilmoqda..."
    cd "$BACKEND_DIR"
    "$VENV_DIR/bin/python" manage.py migrate --noinput
  else
    warn "Virtualenv topilmadi. Migration o'tkazib yuborildi."
  fi
}

build_frontend() {
  cd "$PROJECT_DIR"
  info "Frontend build boshlanmoqda..."
  npm run build
}

restart_services() {
  info "Daphne restart..."
  run_root systemctl restart daphne.service

  info "Celery restart..."
  run_root systemctl restart celery.service

  info "Celery Beat restart..."
  run_root systemctl restart celery-beat.service

  info "PM2 restart ($PM2_TARGET)..."
  pm2 restart "$PM2_TARGET"

  info "Nginx restart..."
  run_root systemctl restart nginx
}

show_status() {
  echo
  info "Service holatlari:"
  run_root systemctl status daphne.service --no-pager -l | sed -n '1,12p' || true
  run_root systemctl status celery.service --no-pager -l | sed -n '1,12p' || true
  run_root systemctl status celery-beat.service --no-pager -l | sed -n '1,12p' || true
  run_root systemctl status nginx --no-pager -l | sed -n '1,12p' || true
  pm2 list || true
}

main() {
  require_cmd git
  require_cmd npm
  require_cmd pm2
  require_cmd systemctl

  print_header
  check_paths
  show_git_state
  pull_latest_code
  install_backend_requirements_if_possible
  run_backend_migrations_if_possible
  build_frontend
  restart_services
  show_status

  echo
  info "Update muvaffaqiyatli yakunlandi."
}

main "$@"
