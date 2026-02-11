#!/usr/bin/env bash

# Safe manual deploy script (no git reset --hard)
# Usage:
#   ./deploy/manual-deploy-safe.sh [backend|frontend|all|status|logs]
#
# Optional env vars:
#   PROJECT_DIR=/var/www/pytech
#   FRONTEND_PM2_NAME=pytech-frontend
#   BRANCH=main

set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/pytech}"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-pytech-frontend}"
BRANCH="${BRANCH:-main}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    err "Command not found: $1"
    exit 1
  }
}

check_dirs() {
  [[ -d "$PROJECT_DIR/.git" ]] || {
    err "Git project not found: $PROJECT_DIR"
    exit 1
  }
  [[ -d "$BACKEND_DIR" ]] || {
    err "Backend directory not found: $BACKEND_DIR"
    exit 1
  }
}

pull_code() {
  info "Pulling latest code (safe mode)..."
  cd "$PROJECT_DIR"

  local dirty
  dirty="$(git status --porcelain)"
  if [[ -n "$dirty" ]]; then
    err "Working tree has uncommitted changes. Commit/stash them first."
    git status --short
    exit 1
  fi

  git fetch --prune origin
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
}

activate_backend_venv() {
  if [[ -f "$BACKEND_DIR/env/bin/activate" ]]; then
    # shellcheck source=/dev/null
    source "$BACKEND_DIR/env/bin/activate"
  elif [[ -f "$BACKEND_DIR/.venv/bin/activate" ]]; then
    # shellcheck source=/dev/null
    source "$BACKEND_DIR/.venv/bin/activate"
  else
    err "Virtualenv not found in $BACKEND_DIR (expected env/ or .venv/)"
    exit 1
  fi
}

restart_if_exists() {
  local service="$1"
  if systemctl list-unit-files | grep -q "^${service}.service"; then
    info "Restarting service: $service"
    sudo systemctl restart "$service"
  else
    warn "Service not found, skipping: $service"
  fi
}

deploy_backend() {
  info "Deploying backend..."
  cd "$BACKEND_DIR"
  activate_backend_venv

  python -m pip install -r requirements.txt
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput
  python manage.py check

  # Some setups use daphne, some use gunicorn
  restart_if_exists daphne
  restart_if_exists gunicorn
  restart_if_exists celery
  restart_if_exists celery-beat
}

deploy_frontend() {
  info "Deploying frontend..."
  cd "$PROJECT_DIR"

  if [[ -f "pnpm-lock.yaml" ]] && command -v pnpm >/dev/null 2>&1; then
    pnpm install --frozen-lockfile || pnpm install
    pnpm build
  else
    npm ci || npm install
    npm run build
  fi

  if command -v pm2 >/dev/null 2>&1; then
    if pm2 jlist | grep -q "\"name\":\"${FRONTEND_PM2_NAME}\""; then
      info "Restarting PM2 app: $FRONTEND_PM2_NAME"
      pm2 restart "$FRONTEND_PM2_NAME"
    else
      warn "PM2 app not found: $FRONTEND_PM2_NAME"
      warn "Starting new PM2 app with npm start..."
      pm2 start npm --name "$FRONTEND_PM2_NAME" -- start
      pm2 save
    fi
  else
    warn "pm2 not installed. Skipping frontend process restart."
  fi
}

show_status() {
  info "Service status"
  for service in nginx daphne gunicorn celery celery-beat; do
    if systemctl list-unit-files | grep -q "^${service}.service"; then
      if systemctl is-active --quiet "$service"; then
        echo -e "$service: ${GREEN}running${NC}"
      else
        echo -e "$service: ${RED}stopped${NC}"
      fi
    fi
  done

  if command -v pm2 >/dev/null 2>&1; then
    pm2 list || true
  fi
}

show_logs() {
  warn "Press Ctrl+C to stop log streaming."
  if systemctl list-unit-files | grep -q "^daphne.service"; then
    sudo journalctl -u daphne -n 80 -f
  elif systemctl list-unit-files | grep -q "^gunicorn.service"; then
    sudo journalctl -u gunicorn -n 80 -f
  else
    err "No daphne/gunicorn service found."
  fi
}

usage() {
  cat <<EOF
Usage: $0 [backend|frontend|all|status|logs]

Examples:
  PROJECT_DIR=/var/www/pytech $0 all
  FRONTEND_PM2_NAME=frontend $0 frontend
EOF
}

main() {
  require_cmd git
  require_cmd python
  check_dirs

  case "${1:-all}" in
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
    all)
      pull_code
      deploy_backend
      deploy_frontend
      show_status
      ;;
    status)
      show_status
      ;;
    logs)
      show_logs
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
