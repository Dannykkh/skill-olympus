#!/usr/bin/env bash
# update-check.sh — 주기적 버전 체크
#
# 출력 (한 줄 또는 없음):
#   UPGRADE_AVAILABLE <old> <new>   — 원격 VERSION이 로컬과 다름
#   (없음)                          — 최신 상태, 스누즈 중, 또는 체크 건너뜀
#
# 사용법:
#   bash update-check.sh [--force]
#
# 환경 변수 오버라이드 (테스트용):
#   OLYMPUS_DIR          — 레포 루트 오버라이드
#   OLYMPUS_REMOTE_URL   — 원격 VERSION URL 오버라이드
#   OLYMPUS_STATE_DIR    — 상태 디렉토리 오버라이드
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${OLYMPUS_DIR:-$(dirname "$SCRIPT_DIR")}"
STATE_DIR="${OLYMPUS_STATE_DIR:-$HOME/.skill-olympus}"
CACHE_FILE="$STATE_DIR/last-update-check"
SNOOZE_FILE="$STATE_DIR/update-snoozed"
VERSION_FILE="$REPO_ROOT/VERSION"
REMOTE_URL="${OLYMPUS_REMOTE_URL:-https://raw.githubusercontent.com/Dannykkh/skill-olympus/master/VERSION}"

# ── Force 플래그 ──
if [ "${1:-}" = "--force" ]; then
    rm -f "$CACHE_FILE" "$SNOOZE_FILE"
fi

# ── 스누즈 체크 함수 ──
check_snooze() {
    local remote_ver="$1"
    [ ! -f "$SNOOZE_FILE" ] && return 1
    local snoozed_ver snoozed_level snoozed_epoch
    snoozed_ver="$(awk '{print $1}' "$SNOOZE_FILE" 2>/dev/null || true)"
    snoozed_level="$(awk '{print $2}' "$SNOOZE_FILE" 2>/dev/null || true)"
    snoozed_epoch="$(awk '{print $3}' "$SNOOZE_FILE" 2>/dev/null || true)"
    [ -z "$snoozed_ver" ] || [ -z "$snoozed_level" ] || [ -z "$snoozed_epoch" ] && return 1
    case "$snoozed_level" in *[!0-9]*) return 1 ;; esac
    case "$snoozed_epoch" in *[!0-9]*) return 1 ;; esac
    # 새 버전이면 스누즈 무시
    [ "$snoozed_ver" != "$remote_ver" ] && return 1
    local duration
    case "$snoozed_level" in
        1) duration=86400 ;;
        2) duration=172800 ;;
        *) duration=604800 ;;
    esac
    local now
    now="$(date +%s)"
    local expires=$(( snoozed_epoch + duration ))
    [ "$now" -lt "$expires" ] && return 0
    return 1
}

# ── Step 1: 로컬 버전 읽기 ──
[ ! -f "$VERSION_FILE" ] && exit 0
LOCAL="$(cat "$VERSION_FILE" 2>/dev/null | tr -d '[:space:]')"
[ -z "$LOCAL" ] && exit 0

# ── Step 2: 캐시 확인 ──
if [ "${1:-}" != "--force" ] && [ -f "$CACHE_FILE" ]; then
    CACHED="$(cat "$CACHE_FILE" 2>/dev/null || true)"
    case "$CACHED" in
        UP_TO_DATE*)
            STALE=$(find "$CACHE_FILE" -mmin +60 2>/dev/null || true)
            if [ -z "$STALE" ]; then
                CACHED_VER="$(echo "$CACHED" | awk '{print $2}')"
                [ "$CACHED_VER" = "$LOCAL" ] && exit 0
            fi
            ;;
        UPGRADE_AVAILABLE*)
            STALE=$(find "$CACHE_FILE" -mmin +720 2>/dev/null || true)
            if [ -z "$STALE" ]; then
                CACHED_OLD="$(echo "$CACHED" | awk '{print $2}')"
                CACHED_NEW="$(echo "$CACHED" | awk '{print $3}')"
                if [ "$CACHED_OLD" = "$LOCAL" ]; then
                    check_snooze "$CACHED_NEW" && exit 0
                    echo "$CACHED"
                    exit 0
                fi
            fi
            ;;
    esac
fi

# ── Step 3: 원격 VERSION fetch ──
mkdir -p "$STATE_DIR"

REMOTE=""
REMOTE="$(curl -sf --max-time 5 "$REMOTE_URL" 2>/dev/null || true)"
REMOTE="$(echo "$REMOTE" | tr -d '[:space:]')"

# 유효성 검증
if ! echo "$REMOTE" | grep -qE '^[0-9]+\.[0-9.]+$'; then
    echo "UP_TO_DATE $LOCAL" > "$CACHE_FILE"
    exit 0
fi

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "UP_TO_DATE $LOCAL" > "$CACHE_FILE"
    exit 0
fi

# 버전 다름 → 업그레이드 가능
RESULT="UPGRADE_AVAILABLE $LOCAL $REMOTE"
echo "$RESULT" > "$CACHE_FILE"
check_snooze "$REMOTE" && exit 0
echo "$RESULT"
