#!/usr/bin/env bash

# Unified deploy script:
# - manual deploy (backend/frontend/all)
# - auto check mode for cron
# - daemon mode (polling like lightweight CI/CD)
#
# Usage:
#   ./deploy/manual-deploy-safe.sh all
#   ./deploy/manual-deploy-safe.sh check
#   ./deploy/manual-deploy-safe.sh daemon
#   ./deploy/manual-deploy-safe.sh install-cron
#
# Optional env vars:
#   PROJECT_DIR=/var/www/pytech
#   FRONTEND_PM2_NAME=pytech-frontend
#   BRANCH=main
#   CHECK_INTERVAL=60
#   AUTO_STASH=1
#   LOG_FILE=/var/log/ehokimiyat-auto-deploy.log

set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/pytech}"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-pytech-frontend}"
BRANCH="${BRANCH:-main}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"
AUTO_STASH="${AUTO_STASH:-1}"
LOCK_FILE="${LOCK_FILE:-/tmp/ehokimiyat_deploy.lock}"
LOG_FILE="${LOG_FILE:-/var/log/ehokimiyat-auto-deploy.log}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

run_as_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    err "Command not found: $1"
    exit 1
  }
}

resolve_python() {
  if command -v python3 >/dev/null 2>&1; then
    echo "python3"
    return
  fi
  if command -v python >/dev/null 2>&1; then
    echo "python"
    return
  fi
  err "Neither python3 nor python found."
  exit 1
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

acquire_lock() {
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$LOCK_FILE"
    if ! flock -n 9; then
      warn "Another deploy is already running. Skipping."
      exit 0
    fi
  fi
}

git_remote_changed() {
  cd "$PROJECT_DIR"
  git fetch --prune origin >/dev/null 2>&1
  local local_sha remote_sha
  local_sha="$(git rev-parse HEAD)"
  remote_sha="$(git rev-parse "origin/$BRANCH")"
  [[ "$local_sha" != "$remote_sha" ]]
}

prepare_git_tree() {
  cd "$PROJECT_DIR"

  local dirty
  dirty="$(git status --porcelain)"
  if [[ -n "$dirty" ]]; then
    if [[ "$AUTO_STASH" == "1" ]]; then
      warn "Working tree is dirty. Auto-stashing local changes."
      git stash push -u -m "autodeploy-$(date +%Y%m%d-%H%M%S)" >/dev/null || true
    else
      err "Working tree has uncommitted changes and AUTO_STASH=0."
      git status --short
      exit 1
    fi
  fi
}

pull_code() {
  info "Updating code from origin/$BRANCH ..."
  cd "$PROJECT_DIR"
  prepare_git_tree

  git fetch --prune origin
  git checkout "$BRANCH"
  git merge --ff-only "origin/$BRANCH"
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
    run_as_root systemctl restart "$service"
  else
    warn "Service not found, skipping: $service"
  fi
}

deploy_backend() {
  info "Deploying backend ..."
  cd "$BACKEND_DIR"
  activate_backend_venv

  local py
  py="$(resolve_python)"
  "$py" -m pip install -r requirements.txt
  "$py" manage.py migrate --noinput
  "$py" manage.py collectstatic --noinput
  "$py" manage.py check

  restart_if_exists daphne
  restart_if_exists gunicorn
  restart_if_exists celery
  restart_if_exists celery-beat
}

deploy_frontend() {
  info "Deploying frontend ..."
  cd "$PROJECT_DIR"

  if ! command -v npm >/dev/null 2>&1; then
    err "npm not found. Install Node.js/npm first."
    exit 1
  fi

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
      warn "Starting new PM2 app with npm start ..."
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

  cd "$PROJECT_DIR"
  echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "Local:  $(git rev-parse --short HEAD)"
  echo "Remote: $(git rev-parse --short origin/"$BRANCH" 2>/dev/null || echo N/A)"
}

show_logs() {
  warn "Press Ctrl+C to stop log streaming."
  if systemctl list-unit-files | grep -q "^daphne.service"; then
    run_as_root journalctl -u daphne -u celery -u celery-beat -n 120 -f
  elif systemctl list-unit-files | grep -q "^gunicorn.service"; then
    run_as_root journalctl -u gunicorn -n 120 -f
  else
    err "No daphne/gunicorn service found."
  fi
}

deploy_all() {
  pull_code
  deploy_backend
  deploy_frontend
  restart_if_exists nginx
  show_status
}

check_and_deploy() {
  info "Checking updates for origin/$BRANCH ..."
  if git_remote_changed; then
    info "New commit detected. Running deploy."
    deploy_all
  else
    info "No new commits. Nothing to deploy."
  fi
}

run_daemon() {
  info "Daemon mode started. Interval: ${CHECK_INTERVAL}s"
  info "Log file: $LOG_FILE"
  while true; do
    {
      echo "========== $(date '+%Y-%m-%d %H:%M:%S') =========="
      check_and_deploy
    } >>"$LOG_FILE" 2>&1 || true
    sleep "$CHECK_INTERVAL"
  done
}

install_cron() {
  local script_path
  script_path="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
  local cron_line
  cron_line="* * * * * PROJECT_DIR=$PROJECT_DIR FRONTEND_PM2_NAME=$FRONTEND_PM2_NAME BRANCH=$BRANCH AUTO_STASH=$AUTO_STASH $script_path check >> $LOG_FILE 2>&1"

  info "Installing cron job ..."
  (
    crontab -l 2>/dev/null | grep -Fv "$script_path check" || true
    echo "$cron_line"
  ) | crontab -
  info "Cron installed."
  info "Use: crontab -l"
}

uninstall_cron() {
  local script_path
  script_path="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
  info "Removing cron job ..."
  (crontab -l 2>/dev/null | grep -Fv "$script_path check" || true) | crontab -
  info "Cron removed."
}

usage() {
  cat <<EOF
Usage: $0 [backend|frontend|all|check|daemon|install-cron|uninstall-cron|status|logs]

Examples:
  PROJECT_DIR=/var/www/pytech FRONTEND_PM2_NAME=pytech-frontend $0 all
  PROJECT_DIR=/var/www/pytech $0 check
  PROJECT_DIR=/var/www/pytech CHECK_INTERVAL=60 $0 daemon
  PROJECT_DIR=/var/www/pytech $0 install-cron
EOF
}

main() {
  require_cmd git
  require_cmd systemctl
  resolve_python >/dev/null
  check_dirs
  acquire_lock

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
      deploy_all
      ;;
    check)
      check_and_deploy
      ;;
    daemon)
      run_daemon
      ;;
    install-cron)
      install_cron
      ;;
    uninstall-cron)
      uninstall_cron
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
