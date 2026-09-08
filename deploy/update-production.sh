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
BOT_FORCE_START="${BOT_FORCE_START:-0}"
DAPHNE_SERVICE="${DAPHNE_SERVICE:-daphne.service}"
CELERY_SERVICE="${CELERY_SERVICE:-celery.service}"
CELERY_BEAT_SERVICE="${CELERY_BEAT_SERVICE:-celery-beat.service}"
NGINX_SERVICE="${NGINX_SERVICE:-nginx.service}"
TELEGRAM_BOT_SERVICE="${TELEGRAM_BOT_SERVICE:-telegram-bot.service}"
FORCE_BACKEND_INSTALL="${FORCE_BACKEND_INSTALL:-0}"
FORCE_FRONTEND_INSTALL="${FORCE_FRONTEND_INSTALL:-0}"
FORCE_FRONTEND_BUILD="${FORCE_FRONTEND_BUILD:-0}"

BEFORE_SHA=""
AFTER_SHA=""
CHANGED_FILES=""

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
      local lock_pid=""

      if [[ -f "$LOCK_FILE" ]]; then
        lock_pid="$(tr -dc '0-9' < "$LOCK_FILE" 2>/dev/null || true)"
      fi

      if [[ -n "$lock_pid" ]] && ps -p "$lock_pid" >/dev/null 2>&1; then
        err "Boshqa deploy jarayoni allaqachon ishlayapti. PID: $lock_pid"
        exit 1
      fi

      warn "Stale lock aniqlandi. Tozalanib qayta urinilmoqda..."
      rm -f "$LOCK_FILE"
      exec 9>"$LOCK_FILE"
      if ! flock -n 9; then
        err "Lock faylni egallab bo'lmadi."
        exit 1
      fi
    fi
    echo "$$" 1>&9
    : > "$LOCK_FILE"
    echo "$$" > "$LOCK_FILE"
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
  local service="$1"
  run_root systemctl cat "$service" >/dev/null 2>&1
}

restart_service_if_exists() {
  local service="$1"
  if service_exists "$service"; then
    info "$service restart..."
    run_root systemctl restart "$service"
  else
    warn "$service topilmadi, o'tkazib yuborildi."
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
  BEFORE_SHA="$(git rev-parse HEAD)"
  git fetch --prune origin
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
  AFTER_SHA="$(git rev-parse HEAD)"
  if [[ "$BEFORE_SHA" != "$AFTER_SHA" ]]; then
    CHANGED_FILES="$(git diff --name-only "$BEFORE_SHA" "$AFTER_SHA" || true)"
  else
    CHANGED_FILES=""
  fi
}

has_changed_file() {
  local pattern="$1"
  grep -Eq "$pattern" <<<"$CHANGED_FILES"
}

should_install_backend_requirements() {
  [[ "$FORCE_BACKEND_INSTALL" == "1" ]] && return 0
  [[ -z "$CHANGED_FILES" ]] && return 1
  has_changed_file '(^|/)requirements(\.txt|/)|pyproject\.toml|poetry\.lock'
}

should_install_frontend_dependencies() {
  [[ "$FORCE_FRONTEND_INSTALL" == "1" ]] && return 0
  [[ "$RUN_NPM_INSTALL" != "1" ]] && return 1
  [[ -z "$CHANGED_FILES" ]] && return 0
  has_changed_file '(^|/)(package\.json|package-lock\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$'
}

should_build_frontend() {
  [[ "$FORCE_FRONTEND_BUILD" == "1" ]] && return 0
  [[ "$RUN_FRONTEND_BUILD" != "1" ]] && return 1
  [[ -z "$CHANGED_FILES" ]] && return 1
  has_changed_file '^(app|components|lib|public|styles|hooks|middleware|next\.config|package\.json|pnpm-lock\.yaml|package-lock\.json)'
}

install_backend_requirements() {
  local py="$1"
  if ! should_install_backend_requirements; then
    warn "Backend dependency install kerak emas, o'tkazib yuborildi."
    return 0
  fi
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

  if ! should_install_frontend_dependencies; then
    warn "Frontend dependency install kerak emas, o'tkazib yuborildi."
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

  if ! should_build_frontend; then
    warn "Frontend build kerak emas, o'tkazib yuborildi."
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
    pm2 restart "$PM2_TARGET" --update-env
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
  local had_running_bot="0"

  mkdir -p "$(dirname "$BOT_LOG_FILE")"

  if pgrep -f "[r]un_bot.py" >/dev/null 2>&1; then
    had_running_bot="1"
  fi

  if service_exists "$TELEGRAM_BOT_SERVICE"; then
    info "Telegram bot service restart..."
    restart_service_if_exists "$TELEGRAM_BOT_SERVICE"
    return 0
  fi

  if [[ "$had_running_bot" != "1" && "$BOT_FORCE_START" != "1" ]]; then
    warn "Telegram bot process avval ishlamayotgan edi. Majburan start berilmadi."
    warn "Agar kerak bo'lsa BOT_FORCE_START=1 bilan ishga tushiring."
    return 0
  fi

  info "Telegram bot process yangilanmoqda..."
  pkill -f "[r]un_bot.py" || true
  sleep 1
  (
    cd "$BACKEND_DIR"
    setsid "$py" "$BACKEND_DIR/run_bot.py" >>"$BOT_LOG_FILE" 2>&1 < /dev/null &
  )
  sleep 3

  if pgrep -f "[r]un_bot.py" >/dev/null 2>&1; then
    info "Telegram bot qayta ishga tushdi."
  else
    warn "Telegram bot process topilmadi. Logni tekshiring: $BOT_LOG_FILE"
  fi
}

restart_services() {
  restart_service_if_exists "$DAPHNE_SERVICE"
  restart_service_if_exists "$CELERY_SERVICE"
  restart_service_if_exists "$CELERY_BEAT_SERVICE"
  restart_frontend_pm2
  restart_service_if_exists "$NGINX_SERVICE"
}

show_status() {
  echo
  info "Service holatlari:"

  for service in "$DAPHNE_SERVICE" "$CELERY_SERVICE" "$CELERY_BEAT_SERVICE" "$NGINX_SERVICE"; do
    if service_exists "$service"; then
      run_root systemctl status "$service" --no-pager -l | sed -n '1,10p' || true
      echo
    fi
  done

  if command -v pm2 >/dev/null 2>&1; then
    pm2 list || true
  fi

  if pgrep -f "[r]un_bot.py" >/dev/null 2>&1; then
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
