#!/bin/bash
# save-turn.sh - Gemini CLI AfterAgent 훅: User+Assistant 턴을 대화 파일에 저장
# Gemini는 stdin으로 JSON 페이로드를 전달함 (prompt + prompt_response)
# AI 호출 없음 = 빠름
#
# 에러 처리 (P1 parity):
# - 실패는 .claude/mnemo-errors.log에 기록
# - $MNEMO_STRICT='1' 이면 실패 시 exit 1
# Note: Gemini는 JSONL transcript가 없어 reconcile이 불가능. 훅이 실패하면 영구 유실.

log_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    local root="$PWD"
    local git_root
    git_root=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$git_root" ]; then root="$git_root"; fi
    local err_dir="$root/.claude"
    mkdir -p "$err_dir" 2>/dev/null || true
    local log_path="$err_dir/mnemo-errors.log"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$ts] [gemini-mnemo/save-turn.sh] [$ctx] $msg" >> "$log_path" 2>/dev/null || true
}

exit_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    log_mnemo_error "$ctx" "$msg"
    if [ "${MNEMO_STRICT:-}" = "1" ]; then exit 1; fi
    exit 0
}

ensure_memory_scaffold() {
    local base_dir="$1"
    local memory_dir="$base_dir/memory"
    local project_name
    local today

    project_name="$(basename "$base_dir")"
    today="$(date +%Y-%m-%d)"

    mkdir -p "$memory_dir"

    if [ ! -f "$base_dir/MEMORY.md" ]; then
        cat > "$base_dir/MEMORY.md" << EOF
# MEMORY.md - 프로젝트 장기기억

## 프로젝트 목표

| 목표 | 상태 |
|------|------|
| $project_name 핵심 작업 추적 | 진행 중 |

---

## 키워드 인덱스

| 키워드 | 상세 파일 |
|--------|-----------|
| 프로젝트, 생성일 | #meta |

---

## architecture/
- [memory/architecture.md](memory/architecture.md)

## patterns/
- [memory/patterns.md](memory/patterns.md)

## tools/
- [memory/tools.md](memory/tools.md)

## gotchas/
- [memory/gotchas.md](memory/gotchas.md)

---

## meta/
- **프로젝트**: $project_name
- **생성일**: $today
- **마지막 업데이트**: $today
EOF
    fi

    if [ ! -f "$memory_dir/architecture.md" ]; then
        cat > "$memory_dir/architecture.md" << 'EOF'
# Architecture - 설계 결정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/patterns.md" ]; then
        cat > "$memory_dir/patterns.md" << 'EOF'
# Patterns - 작업 패턴, 워크플로우

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/tools.md" ]; then
        cat > "$memory_dir/tools.md" << 'EOF'
# Tools - MCP 서버, 외부 도구, 라이브러리

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/gotchas.md" ]; then
        cat > "$memory_dir/gotchas.md" << 'EOF'
# Gotchas - 주의사항, 함정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi
}

# stdin에서 JSON 페이로드 읽기
# stdin 워치독: stdin이 전달되지 않으면 무한 대기 → 15초 내 미도착 시 fail-open (gotcha 046)
if command -v timeout >/dev/null 2>&1; then
    INPUT=$(timeout 15 cat) || exit 0
else
    INPUT=$(cat)
fi
if [ -z "$INPUT" ]; then
    exit 0
fi

# User 입력 추출: prompt 필드
if command -v jq &>/dev/null; then
    if ! echo "$INPUT" | jq -e . >/dev/null 2>&1; then
        exit_mnemo_error 'stdin-json' 'stdin JSON 파싱 실패 (jq)'
    fi
    USER_TEXT=$(echo "$INPUT" | jq -r '.prompt // empty' 2>/dev/null)
    RESPONSE=$(echo "$INPUT" | jq -r '.prompt_response // empty' 2>/dev/null)
elif command -v python3 &>/dev/null; then
    USER_TEXT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('prompt', ''))
except: pass
" 2>/dev/null)
    RESPONSE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('prompt_response', ''))
except: pass
" 2>/dev/null)
else
    exit_mnemo_error 'missing-parser' 'jq 또는 python3이 필요합니다'
fi

USER_TEXT=$(echo "$USER_TEXT" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
RESPONSE=$(echo "$RESPONSE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# <private> 블록 제거 (민감 정보 보호)
if [ -n "$USER_TEXT" ]; then
    USER_TEXT=$(echo "$USER_TEXT" | perl -0pe 's/<private>.*?<\/private>/[PRIVATE]/gs' 2>/dev/null || echo "$USER_TEXT" | sed 's/<private>[^<]*<\/private>/[PRIVATE]/g')
fi
if [ -n "$RESPONSE" ]; then
    RESPONSE=$(echo "$RESPONSE" | perl -0pe 's/<private>.*?<\/private>/[PRIVATE]/gs' 2>/dev/null || echo "$RESPONSE" | sed 's/<private>[^<]*<\/private>/[PRIVATE]/g')
fi

# 둘 다 비어있으면 스킵
if [ -z "$USER_TEXT" ] && { [ -z "$RESPONSE" ] || [ ${#RESPONSE} -lt 5 ]; }; then
    exit 0
fi

# 프로젝트 루트 결정
# Gemini hook payload는 transcript_path가 없으므로 PWD 기반 결정.
# Sub-directory(예: bin/Debug)를 부모 git root로 정규화한다.
# - 1순위: payload의 cwd / working_directory / project_root 필드
# - 2순위: PWD에서 git -C rev-parse --show-toplevel
# - 3순위: PWD 그대로
PROJECT_ROOT=""
for k in cwd working_directory project_root workspace_root; do
    v=$(echo "$INPUT" | jq -r ".$k // empty" 2>/dev/null)
    if [ -n "$v" ] && [ -d "$v" ]; then
        PROJECT_ROOT="$v"
        break
    fi
done
if [ -z "$PROJECT_ROOT" ]; then
    PROJECT_ROOT="$PWD"
fi
GIT_ROOT_NORMALIZED=$(git -C "$PROJECT_ROOT" rev-parse --show-toplevel 2>/dev/null)
if [ -n "$GIT_ROOT_NORMALIZED" ]; then
    PROJECT_ROOT="$GIT_ROOT_NORMALIZED"
fi

# 대화 디렉토리 및 파일
CONV_DIR="$PROJECT_ROOT/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY-gemini.md"
PROJECT_NAME=$(basename "$PROJECT_ROOT")

ensure_memory_scaffold "$PROJECT_ROOT"

# 폴더 생성
mkdir -p "$CONV_DIR"

# 파일 없으면 frontmatter 헤더 생성
if [ ! -f "$CONV_FILE" ]; then
    cat > "$CONV_FILE" << EOF
---
date: $TODAY
project: $PROJECT_NAME
keywords: []
summary: ""
---

# $TODAY

EOF
fi

TIMESTAMP=$(date +%H:%M:%S)

# 중복 방지: 같은 초에 동일 User 저장되어 있으면 스킵
if [ -n "$USER_TEXT" ] && [ -f "$CONV_FILE" ] && grep -qF "## [$TIMESTAMP] User" "$CONV_FILE" 2>/dev/null; then
    exit 0
fi

# User 입력 기록
if [ -n "$USER_TEXT" ]; then
    echo -e "\n## [$TIMESTAMP] User\n\n$USER_TEXT\n" >> "$CONV_FILE"
fi

# Assistant 응답 처리
# P2 parity: 4000자 truncation 제거. Gemini는 JSONL 원본이 없어 유실된 부분을
# 복구할 경로가 없으므로 온전한 원문을 저장해야 한다.
if [ -n "$RESPONSE" ] && [ ${#RESPONSE} -ge 5 ]; then
    printf '\n## [%s] Assistant\n\n%s\n' "$TIMESTAMP" "$RESPONSE" >> "$CONV_FILE"
fi

# ─────────────────────────────────────────────
# Gotchas/Learned 관찰 기록 (memory/gotchas/ + memory/learned/)
# ─────────────────────────────────────────────
if [ -n "$RESPONSE" ] && [ ${#RESPONSE} -ge 5 ]; then
    OBS_TARGET_DIR=""
    OBS_EVENT_TYPE=""

    if echo "$RESPONSE" | grep -qiE '(error|fail|exception|denied|not found|cannot|unable|ENOENT|ERR_)' 2>/dev/null; then
        OBS_TARGET_DIR="$PROJECT_ROOT/memory/gotchas"
        OBS_EVENT_TYPE="turn_error"
    else
        OBS_TARGET_DIR="$PROJECT_ROOT/memory/learned"
        OBS_EVENT_TYPE="turn_success"
    fi

    mkdir -p "$OBS_TARGET_DIR"
    OBS_FILE="$OBS_TARGET_DIR/observations.jsonl"

    SAFE_RESPONSE="$(echo "$RESPONSE" | head -c 3000 | sed -E 's/(api[_-]?key|token|secret|password|authorization)([\"'"'"' :=]+)[A-Za-z0-9_\\/\\.+=]{8,}/\1\2[REDACTED]/gi' 2>/dev/null || echo "$RESPONSE" | head -c 3000)"
    SAFE_USER="$(echo "$USER_TEXT" | head -c 1000)"
    OBS_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    if command -v jq &>/dev/null; then
        jq -n -c \
            --arg ts "$OBS_TS" \
            --arg ev "$OBS_EVENT_TYPE" \
            --arg cli "gemini" \
            --arg inp "$SAFE_USER" \
            --arg out "$SAFE_RESPONSE" \
            --arg sess "unknown" \
            '{timestamp:$ts, event:$ev, cli:$cli, input:$inp, output:$out, session:$sess}' \
            >> "$OBS_FILE" 2>/dev/null
    fi

    # 파일 크기 제한 (10MB)
    if [ -f "$OBS_FILE" ]; then
        OBS_SIZE_MB=$(du -m "$OBS_FILE" 2>/dev/null | cut -f1)
        if [ "${OBS_SIZE_MB:-0}" -ge 10 ]; then
            OBS_ARCHIVE_DIR="$OBS_TARGET_DIR/archive"
            mkdir -p "$OBS_ARCHIVE_DIR"
            mv "$OBS_FILE" "$OBS_ARCHIVE_DIR/observations-$(date +%Y%m%d-%H%M%S).jsonl" 2>/dev/null || true
        fi
    fi
fi

# ── mnemo status notify (LLM 호출 X, 비용 0) ──────────────────
# raw 누적 500건 또는 마지막 핸드오프 14일 초과 시 status 파일 + stderr 안내.
notify_mnemo_status() {
    local root="$1"
    local g_jsonl="$root/memory/gotchas/observations.jsonl"
    local l_jsonl="$root/memory/learned/observations.jsonl"
    local handoff_dir="$root/docs/handoffs"
    local g_count=0 l_count=0
    [ -f "$g_jsonl" ] && g_count=$(wc -l < "$g_jsonl" 2>/dev/null | tr -d ' ' || echo 0)
    [ -f "$l_jsonl" ] && l_count=$(wc -l < "$l_jsonl" 2>/dev/null | tr -d ' ' || echo 0)
    local total=$((g_count + l_count))
    local days=999
    if [ -d "$handoff_dir" ]; then
        local latest mtime now
        latest=$(ls -t "$handoff_dir"/*.md 2>/dev/null | head -n 1)
        if [ -n "$latest" ]; then
            mtime=$(stat -c %Y "$latest" 2>/dev/null || stat -f %m "$latest" 2>/dev/null || echo 0)
            now=$(date +%s)
            [ "$mtime" -gt 0 ] && days=$(( (now - mtime) / 86400 ))
        fi
    fi
    # --- delta 기반 판정 (cumulative total -> 마지막 정제 이후 delta) ---
    # observations.jsonl은 비워지지 않아 누적 total로 판정하면 한 번 임계를 넘긴 뒤
    # 영구히 경고가 뜬다. gotchas/learned 정제 .md의 최신 mtime이 마커보다 새로우면
    # 정제가 일어난 것으로 보고 baseline을 현재 누적값으로 리셋한다.
    local marker="$root/memory/.mnemo-distill-offset"
    local ref_epoch=0 e sub f
    for sub in gotchas learned; do
        [ -d "$root/memory/$sub" ] || continue
        for f in "$root/memory/$sub"/*.md; do
            [ -f "$f" ] || continue
            e=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null || echo 0)
            [ "$e" -gt "$ref_epoch" ] && ref_epoch=$e
        done
    done
    local base_g=-1 base_l=-1 marker_ref=-1
    if [ -f "$marker" ]; then
        read -r base_g base_l marker_ref < "$marker" 2>/dev/null
        [ -z "$base_g" ] && base_g=-1
        [ -z "$base_l" ] && base_l=-1
        [ -z "$marker_ref" ] && marker_ref=-1
    fi
    if [ "$base_g" -lt 0 ] || [ "$ref_epoch" -gt "$marker_ref" ]; then
        base_g=$g_count; base_l=$l_count
        echo "$g_count $l_count $ref_epoch" > "$marker" 2>/dev/null || true
    fi
    local delta=$(( (g_count - base_g) + (l_count - base_l) ))
    [ "$delta" -lt 0 ] && delta=0
    # 임계: 마지막 정제 이후 새 관찰 200건 또는 마지막 핸드오프 14일 초과
    if [ "$delta" -lt 200 ] && [ "$days" -lt 14 ]; then
        rm -f "$root/memory/.mnemo-status.md" 2>/dev/null || true
        return 0
    fi
    local status_file="$root/memory/.mnemo-status.md"
    mkdir -p "$root/memory" 2>/dev/null || true
    {
        echo "# mnemo status"
        echo ""
        echo "- 새 관찰(정제 이후): **${delta}** / 누적 **${total}** (gotchas ${g_count} + learned ${l_count})"
        echo "- last handoff: **${days}일 전**"
        echo "- 권장: \`/memory-distill --rebuild\` 또는 핸드오프"
        echo "- updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    } > "$status_file" 2>/dev/null || true
    echo "[mnemo] 새 관찰 ${delta}건(누적 ${total}) / 마지막 핸드오프 ${days}일 전 → /memory-distill --rebuild 권장" >&2
}
notify_mnemo_status "$PROJECT_ROOT"
