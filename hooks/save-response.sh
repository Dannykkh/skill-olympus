#!/bin/bash
# save-response.sh - Stop 훅: Assistant 응답을 대화 파일에 저장
# transcript_path에서 마지막 assistant 메시지를 추출하여 append
# AI 호출 없음 = 빠름
#
# 에러 처리 철학 (P1):
# - 정상 skip 케이스(빈 응답, 중복, transcript 없음): 조용히 exit 0
# - 진짜 실패(파싱 에러, IO 에러): .claude/mnemo-errors.log에 기록 후 exit 0
# - $MNEMO_STRICT = '1' 이면 실패 시 exit 1 (디버깅용)

# Grok 세션 가드: Grok에서는 grok-mnemo 훅이 저장을 전담하므로 이중 저장 방지 위해 즉시 종료.
[ -n "${GROK_HOOK_EVENT:-}" ] && exit 0
[ -n "${DEVIN_PROJECT_DIR:-}" ] && exit 0

# 저장 opt-out: MNEMO_DISABLE=1|true|yes 면 mnemo 자동 저장 전체 비활성화 (개인정보처리방침 거부 방법)
case "${MNEMO_DISABLE:-}" in 1|[Tt][Rr][Uu][Ee]|[Yy][Ee][Ss]) exit 0 ;; esac

# ── mnemo 에러 로깅 ──────────────────────────────────────────────
log_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    [ -n "${PROJECT_ROOT:-}" ] || return 0
    local root="$PROJECT_ROOT"
    local err_dir="$root/.claude"
    mkdir -p "$err_dir" 2>/dev/null || true
    local log_path="$err_dir/mnemo-errors.log"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$ts] [save-response.sh] [$ctx] $msg" >> "$log_path" 2>/dev/null || true
}

exit_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    log_mnemo_error "$ctx" "$msg"
    if [ "${MNEMO_STRICT:-}" = "1" ]; then
        exit 1
    fi
    exit 0
}

# Shared resolver rejects runtime storage directories and untrusted fallback cwd.
get_claude_project_root() {
    local helper
    helper="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/mnemo-project-root.js"
    [ -f "$helper" ] || return 0
    printf '%s' "$INPUT" | node "$helper" --claude 2>/dev/null || true
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
        local category architecture_path patterns_path tools_path gotchas_path
        for category in architecture patterns tools gotchas; do
            if [ -f "$memory_dir/$category/index.md" ]; then
                printf -v "${category}_path" 'memory/%s/index.md' "$category"
            else
                printf -v "${category}_path" 'memory/%s.md' "$category"
            fi
        done
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
- [$architecture_path]($architecture_path)

## patterns/
- [$patterns_path]($patterns_path)

## tools/
- [$tools_path]($tools_path)

## gotchas/
- [$gotchas_path]($gotchas_path)

---

## meta/
- **프로젝트**: $project_name
- **생성일**: $today
- **마지막 업데이트**: $today
EOF
    fi

    if [ ! -f "$memory_dir/architecture.md" ] && [ ! -f "$memory_dir/architecture/index.md" ]; then
        cat > "$memory_dir/architecture.md" << 'EOF'
# Architecture - 설계 결정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/patterns.md" ] && [ ! -f "$memory_dir/patterns/index.md" ]; then
        cat > "$memory_dir/patterns.md" << 'EOF'
# Patterns - 작업 패턴, 워크플로우

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/tools.md" ] && [ ! -f "$memory_dir/tools/index.md" ]; then
        cat > "$memory_dir/tools.md" << 'EOF'
# Tools - MCP 서버, 외부 도구, 라이브러리

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi

    if [ ! -f "$memory_dir/gotchas.md" ] && [ ! -f "$memory_dir/gotchas/index.md" ]; then
        cat > "$memory_dir/gotchas.md" << 'EOF'
# Gotchas - 주의사항, 함정

> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.

---
EOF
    fi
}

INPUT=$(cat)

# transcript_path 추출 (jq 없거나 JSON 깨졌을 때를 구분)
if ! command -v jq >/dev/null 2>&1; then
    exit_mnemo_error 'missing-jq' 'jq가 설치되어 있지 않습니다'
fi
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
JQ_STATUS=$?
if [ $JQ_STATUS -ne 0 ]; then
    exit_mnemo_error 'stdin-json' "stdin JSON 파싱 실패 (jq exit=$JQ_STATUS)"
fi
HAS_TRANSCRIPT=0
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then HAS_TRANSCRIPT=1; fi

# Claude Code는 Stop 입력에 마지막 답(last_assistant_message)을 넣어 준다. 기록 파일(JSONL)은
# 몰아서 쓰여 훅이 읽는 순간 마지막 답이 아직 없을 수 있다(2026-10-11, Stop 310건 중 1건 누락).
# 이 값을 먼저 쓰고, 값이 없는 옛 CLI에서만 기록 파일의 마지막 텍스트 줄로 대신한다.
# 기존 추출과 같은 정리(줄 앞뒤 공백 제거)를 해야 아래 uuid 대조가 맞는다.
LAST_ASSISTANT=$(echo "$INPUT" | jq -r '.last_assistant_message // empty' 2>/dev/null | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# 답을 얻을 곳이 하나도 없으면 정상 skip (로그 X)
if [ -z "$LAST_ASSISTANT" ] && [ "$HAS_TRANSCRIPT" -eq 0 ]; then
    exit 0
fi

# 프로젝트 루트 결정: 명시 workspace → payload cwd → transcript metadata
PROJECT_ROOT=$(get_claude_project_root "$TRANSCRIPT_PATH")

# Temp/무효 루트면 저장 skip (fail-open) — gotcha 065
if [ -z "$PROJECT_ROOT" ]; then exit 0; fi

# 대화 파일 경로 결정
[ -f "$PROJECT_ROOT/.mnemo-root" ] || : > "$PROJECT_ROOT/.mnemo-root"
CONV_DIR="$PROJECT_ROOT/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY-claude.md"

ensure_memory_scaffold "$PROJECT_ROOT"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORE_RESULT="$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/claude-event-store.js" "$PROJECT_ROOT" assistant)"
if [ "$?" -ne 0 ]; then exit_mnemo_error 'file-io' '답변 저장 대기 또는 실패'; fi
RESPONSE="$(printf '%s' "$STORE_RESULT" | jq -r '.response // empty')"
STORE_STATUS="$(printf '%s' "$STORE_RESULT" | jq -r '.status // empty')"
case "$STORE_STATUS" in empty|duplicate) exit 0 ;; esac

notify_mnemo_status() {
    local root="$1"
    local gotchas_jsonl="$root/memory/gotchas/observations.jsonl"
    local learned_jsonl="$root/memory/learned/observations.jsonl"
    local handoff_dir="$root/docs/handoffs"
    local g_count=0 l_count=0
    [ -f "$gotchas_jsonl" ] && g_count=$(wc -l < "$gotchas_jsonl" 2>/dev/null | tr -d ' ' || echo 0)
    [ -f "$learned_jsonl" ] && l_count=$(wc -l < "$learned_jsonl" 2>/dev/null | tr -d ' ' || echo 0)
    local total=$((g_count + l_count))
    local days=999
    if [ -d "$handoff_dir" ]; then
        local latest
        latest=$(ls -t "$handoff_dir"/*.md 2>/dev/null | head -n 1)
        if [ -n "$latest" ]; then
            local mtime now
            mtime=$(stat -c %Y "$latest" 2>/dev/null || stat -f %m "$latest" 2>/dev/null || echo 0)
            now=$(date +%s)
            [ "$mtime" -gt 0 ] && days=$(( (now - mtime) / 86400 ))
        fi
    fi
    # 임계값: delta(정제 이후 새 raw) 200건 또는 마지막 핸드오프 14일 초과
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
    local base_g=0 base_l=0 marker_ref=-1 marker_valid=0 marker_text
    marker_text=$(cat "$marker" 2>/dev/null || true)
    if [[ "$marker_text" =~ ^(-?[0-9]+)[[:space:]]+(-?[0-9]+)[[:space:]]+([0-9]+)$ ]]; then
        base_g=${BASH_REMATCH[1]}; base_l=${BASH_REMATCH[2]}; marker_ref=${BASH_REMATCH[3]}
        marker_valid=1
    fi
    if [ "$marker_valid" -eq 0 ] || [ "$ref_epoch" -gt "$marker_ref" ]; then
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
        echo "- 권장: 카탈로그의 source-only \`memory-distill\` 모듈을 직접 읽어 rebuild 또는 핸드오프"
        echo "- updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    } > "$status_file" 2>/dev/null || true
    echo "[mnemo] 새 관찰 ${delta}건(누적 ${total}) / 마지막 핸드오프 ${days}일 전 → source-only memory-distill 모듈을 직접 읽어 rebuild 권장" >&2
}
notify_mnemo_status "$PROJECT_ROOT"
