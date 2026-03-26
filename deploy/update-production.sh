#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/pytech}"
BRANCH="${BRANCH:-main}"
BACKEND_DIR="${BACKEND_DIR:-$PROJECT_DIR/backend}"
FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-pytech-frontend}"
PM2_TARGET="${PM2_TARGET:-$FRONTEND_PM2_NAME}"
LOCK_FILE="${LOCK_FILE:-/tmp/ehokimiyat_update_production.lock}"
RUN_FRONTEND_BUILD="${RUN_FRONTEND_BUILD:-1}"
RUN_NPM_INSTALL="${RUN_NPM_INSTALL:-1}"
RUN_BOT_RESTART="${RUN_BOT_RESTART:-1}"
AUTO_STASH="${AUTO_STASH:-0}"
BOT_LOG_FILE="${BOT_LOG_FILE:-$BACKEND_DIR/logs/telegram_bot.log}"

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
  echo "Backend: $BACKEND_DIR"
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

  [[ -d "$BACKEND_DIR" ]] || {
    err "Backend papkasi topilmadi: $BACKEND_DIR"
    exit 1
  }
}

acquire_lock() {
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$LOCK_FILE"
    if ! flock -n 9; then
      err "Boshqa deploy jarayoni allaqachon ishlayapti."
      exit 1
    fi
  fi
}

resolve_venv_python() {
  local candidates=(
    "$BACKEND_DIR/env/bin/python"
    "$BACKEND_DIR/venv/bin/python"
    "$BACKEND_DIR/.venv/bin/python"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  err "Virtualenv python topilmadi. Kutilgan yo'llar: env/, venv/, .venv/"
  exit 1
}

service_exists() {
  systemctl list-unit-files --type=service 2>/dev/null | awk '{print $1}' | grep -qx "${1}.service"
}

restart_service_if_exists() {
  local service="$1"
  if service_exists "$service"; then
    info "$service restart..."
    run_root systemctl restart "${service}.service"
  else
    warn "$service.service topilmadi, o'tkazib yuborildi."
  fi
}

show_git_state() {
  cd "$PROJECT_DIR"
  info "Joriy commit: $(git rev-parse --short HEAD)"
  if [[ -n "$(git status --porcelain)" ]]; then
    if [[ "$AUTO_STASH" == "1" ]]; then
      warn "Working tree dirty. O'zgarishlar stash qilinadi."
    else
      warn "Working tree dirty. Git pull merge conflict berishi mumkin."
    fi
  fi
}

prepare_git_tree() {
  cd "$PROJECT_DIR"
  if [[ -n "$(git status --porcelain)" ]]; then
    if [[ "$AUTO_STASH" == "1" ]]; then
      git stash push -u -m "update-production-$(date +%Y%m%d-%H%M%S)" >/dev/null || true
      info "Local o'zgarishlar stash qilindi."
    else
      warn "Local o'zgarishlar bor, stash qilinmadi."
    fi
  fi
}

pull_latest_code() {
  cd "$PROJECT_DIR"
  prepare_git_tree
  info "Git branch yangilanmoqda..."
  git fetch --prune origin
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
}

install_backend_requirements() {
  local py="$1"
  info "Backend requirementlar o'rnatilmoqda..."
  "$py" -m pip install -r "$BACKEND_DIR/requirements.txt"
}

run_backend_checks() {
  local py="$1"
  cd "$BACKEND_DIR"
  info "Migration ishga tushirilmoqda..."
  "$py" manage.py migrate --noinput

  info "Static fayllar yig'ilmoqda..."
  "$py" manage.py collectstatic --noinput

  info "Django check..."
  "$py" manage.py check
}

install_frontend_dependencies() {
  cd "$PROJECT_DIR"

  if [[ "$RUN_NPM_INSTALL" != "1" ]]; then
    warn "Frontend dependency install o'tkazib yuborildi (RUN_NPM_INSTALL=$RUN_NPM_INSTALL)."
    return 0
  fi

  if [[ -f "pnpm-lock.yaml" ]] && command -v pnpm >/dev/null 2>&1; then
    info "Frontend dependency install (pnpm)..."
    pnpm install --frozen-lockfile || pnpm install
    return 0
  fi

  info "Frontend dependency install (npm)..."
  if [[ -f "package-lock.json" ]]; then
    npm ci
  else
    npm install
  fi
}

build_frontend() {
  if [[ "$RUN_FRONTEND_BUILD" != "1" ]]; then
    warn "Frontend build o'tkazib yuborildi (RUN_FRONTEND_BUILD=$RUN_FRONTEND_BUILD)."
    return 0
  fi

  cd "$PROJECT_DIR"
  info "Frontend build boshlanmoqda..."

  if [[ -f "pnpm-lock.yaml" ]] && command -v pnpm >/dev/null 2>&1; then
    pnpm build
  else
    npm run build
  fi
}

restart_frontend_pm2() {
  if ! command -v pm2 >/dev/null 2>&1; then
    warn "pm2 topilmadi. Frontend process restart o'tkazib yuborildi."
    return 0
  fi

  if pm2 jlist 2>/dev/null | grep -q "\"name\":\"${FRONTEND_PM2_NAME}\""; then
    info "PM2 restart ($PM2_TARGET)..."
    pm2 restart "$PM2_TARGET"
  else
    warn "PM2 app topilmadi: $FRONTEND_PM2_NAME"
  fi
}

restart_telegram_bot() {
  if [[ "$RUN_BOT_RESTART" != "1" ]]; then
    warn "Telegram bot restart o'tkazib yuborildi (RUN_BOT_RESTART=$RUN_BOT_RESTART)."
    return 0
  fi

  local py="$1"
  cd "$BACKEND_DIR"

  mkdir -p "$(dirname "$BOT_LOG_FILE")"

  info "Telegram bot process yangilanmoqda..."
  pkill -f run_bot.py || true
  nohup "$py" "$BACKEND_DIR/run_bot.py" >>"$BOT_LOG_FILE" 2>&1 &
  sleep 2

  if pgrep -f run_bot.py >/dev/null 2>&1; then
    info "Telegram bot qayta ishga tushdi."
  else
    warn "Telegram bot process topilmadi. Logni tekshiring: $BOT_LOG_FILE"
  fi
}

restart_services() {
  restart_service_if_exists daphne
  restart_service_if_exists celery
  restart_service_if_exists celery-beat
  restart_frontend_pm2
  restart_service_if_exists nginx
}

show_status() {
  echo
  info "Service holatlari:"

  for service in daphne celery celery-beat nginx; do
    if service_exists "$service"; then
      run_root systemctl status "${service}.service" --no-pager -l | sed -n '1,10p' || true
      echo
    fi
  done

  if command -v pm2 >/dev/null 2>&1; then
    pm2 list || true
  fi

  if pgrep -f run_bot.py >/dev/null 2>&1; then
    info "Telegram bot process ishlayapti."
  else
    warn "Telegram bot process topilmadi."
  fi
}

main() {
  require_cmd git
  require_cmd npm
  require_cmd systemctl
  require_cmd pgrep
  require_cmd pkill
  require_cmd nohup

  print_header
  check_paths
  acquire_lock
  show_git_state
  pull_latest_code

  local backend_python
  backend_python="$(resolve_venv_python)"

  install_backend_requirements "$backend_python"
  run_backend_checks "$backend_python"
  install_frontend_dependencies
  build_frontend
  restart_services
  restart_telegram_bot "$backend_python"
  show_status

  echo
  info "Update muvaffaqiyatli yakunlandi."
}

main "$@"
