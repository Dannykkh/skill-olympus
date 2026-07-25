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

# ── mnemo 에러 로깅 ──────────────────────────────────────────────
log_mnemo_error() {
    local ctx="$1"
    local msg="$2"
    local root="$PWD"
    local git_root
    git_root=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$git_root" ]; then
        root="$git_root"
    fi
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

# ── 프로젝트 루트 결정 ────────────────────────────────────────
# 문제: 마지막 cwd/PWD가 하위 폴더(bin/Debug, reference/1week 등)면
#       비-git 프로젝트에서 conversations/가 프로젝트 루트가 아닌 하위 폴더에 생긴다.
#       (전역 `cd`로 작업 디렉터리가 옮겨진 뒤 그대로 유지되는 경우)
# 해결: 후보(세션 시작 cwd -> 마지막 cwd -> transcript 디코딩 -> PWD)를 2-pass로 평가.
#       Pass 1 = git 루트가 잡히는 첫 후보, Pass 2 = 비-git이면 세션 시작(launch) cwd.
# ── 비-git 프로젝트 루트 보정 (gotcha 047) ──────────────────────
# git이 없어도 프로젝트 루트를 지킨다. 빌드 출력 폴더(bin/Debug 등)에서 실행된
# 세션이 그 폴더를 루트로 삼아 conversations/가 흩어지는 것을 방지.
# Pass A: 상위로 걸어 올라가며 기존 mnemo 루트 마커(MEMORY.md 또는 conversations/) 탐색 (HOME 제외)
# Pass B: 빌드 출력 세그먼트(bin|obj|dist|build|out|target|node_modules) 첫 등장 앞에서 절단
get_nongit_project_root() {
    local start="$1"
    if [ -z "$start" ]; then printf '%s\n' "$start"; return; fi
    local home_dir="${HOME:-$USERPROFILE}"
    home_dir="${home_dir%/}"
    local cur="$start"
    while [ -n "$cur" ] && [ "$cur" != "/" ] && [ "$cur" != "." ]; do
        if [ -n "$home_dir" ] && [ "${cur%/}" = "$home_dir" ]; then break; fi
        if [ -f "$cur/MEMORY.md" ] || [ -d "$cur/conversations" ]; then
            printf '%s\n' "$cur"; return
        fi
        local parent
        parent=$(dirname "$cur")
        [ "$parent" = "$cur" ] && break
        cur="$parent"
    done
    local stripped="$start"
    while printf '%s' "$stripped" | grep -qE '[/\\](bin|obj|dist|build|out|target|node_modules)([/\\]|$)'; do
        stripped=$(printf '%s' "$stripped" | sed -E 's#[/\\](bin|obj|dist|build|out|target|node_modules)([/\\].*)?$##')
    done
    if [ -n "$stripped" ] && [ "$stripped" != "$start" ] && [ -d "$stripped" ] && { [ -z "$home_dir" ] || [ "${stripped%/}" != "$home_dir" ]; }; then
        printf '%s\n' "$stripped"
    else
        printf '%s\n' "$start"
    fi
}

get_claude_project_root() {
    local transcript_path="$1"
    local home_dir="${HOME:-$USERPROFILE}"

    _w2u() {
        local p="$1"
        if [[ "$p" =~ ^([A-Za-z]): ]]; then
            local d="${BASH_REMATCH[1],,}"; p="/${d}/${p:3}"; p="${p//\\//}"
        fi
        printf '%s' "$p"
    }

    local first_cwd="" last_cwd="" decoded=""
    if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
        first_cwd=$(grep -m 1 -oE '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' "$transcript_path" 2>/dev/null \
            | sed -E 's/"cwd"[[:space:]]*:[[:space:]]*"(.*)"/\1/' | sed 's|\\\\|\\|g')
        last_cwd=$(tail -n 200 "$transcript_path" 2>/dev/null \
            | grep -oE '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' \
            | tail -n 1 | sed -E 's/"cwd"[[:space:]]*:[[:space:]]*"(.*)"/\1/' | sed 's|\\\\|\\|g')
    fi
    if [ -n "$transcript_path" ]; then
        local parent; parent=$(basename "$(dirname "$transcript_path")")
        if [[ "$parent" =~ ^([A-Za-z])--(.+)$ ]]; then
            decoded="/${BASH_REMATCH[1],,}/${BASH_REMATCH[2]//-//}"
        fi
    fi

    # 후보: launch cwd -> last cwd -> decoded -> PWD (HOME은 후보에서 제외)
    local home_u; home_u=$(_w2u "$home_dir")
    local -a candidates=()
    local c
    for c in "$first_cwd" "$last_cwd" "$decoded"; do
        [ -z "$c" ] && continue
        c=$(_w2u "$c")
        [ "${c%/}" = "${home_u%/}" ] && continue
        candidates+=("$c")
    done
    candidates+=("$PWD")

    # Pass 1: git 루트가 잡히는 첫 후보 (단, git 루트가 HOME이면 dotfiles repo로 간주해 제외)
    local git_root gr_u
    for c in "${candidates[@]}"; do
        if [ -d "$c" ]; then
            git_root=$(git -C "$c" rev-parse --show-toplevel 2>/dev/null)
            if [ -n "$git_root" ]; then
                gr_u=$(_w2u "$git_root")
                [ "${gr_u%/}" = "${home_u%/}" ] || { echo "$git_root"; return 0; }
            fi
        fi
    done
    # Pass 2: git 없음(비-git) -> 첫 유효 후보(= launch cwd)를 비-git 루트 보정 후 반환
    for c in "${candidates[@]}"; do
        [ -d "$c" ] && { get_nongit_project_root "$c"; return 0; }
    done
    get_nongit_project_root "$PWD"
}

# ── 사이드카 인덱스 I/O (reconcile과 공유) ─────────────────────
# conversations/.mnemo-index.json 포맷:
#   { "version": 1, "claude": { "YYYY-MM-DD": ["uuid", "uuid", ...] } }
is_uuid_in_index() {
    local index_path="$1"
    local today="$2"
    local uuid="$3"
    [ -z "$uuid" ] && return 1
    [ ! -f "$index_path" ] && return 1
    jq -e --arg d "$today" --arg u "$uuid" \
        '.claude[$d] // [] | index($u) != null' \
        "$index_path" >/dev/null 2>&1
}

add_uuid_to_index() {
    local index_path="$1"
    local today="$2"
    local uuid="$3"
    [ -z "$uuid" ] && return 0
    local tmp
    tmp=$(mktemp 2>/dev/null || echo "${index_path}.tmp.$$")
    if [ -f "$index_path" ]; then
        jq --arg d "$today" --arg u "$uuid" \
            '.version //= 1 | .claude //= {} | .claude[$d] //= [] | .claude[$d] |= (. + [$u] | unique)' \
            "$index_path" > "$tmp" 2>/dev/null
    else
        jq -n --arg d "$today" --arg u "$uuid" \
            '{version: 1, claude: {($d): [$u]}}' > "$tmp" 2>/dev/null
    fi
    if [ -s "$tmp" ]; then
        mv "$tmp" "$index_path" 2>/dev/null || rm -f "$tmp"
    else
        rm -f "$tmp"
        log_mnemo_error 'index-write' 'jq 인덱스 생성 실패'
    fi
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
# transcript_path 자체가 없거나 파일이 없는 건 정상 skip (로그 X)
if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
    exit 0
fi

# 프로젝트 루트 결정: JSONL cwd → transcript path 디코딩 → PWD fallback
PROJECT_ROOT=$(get_claude_project_root "$TRANSCRIPT_PATH")

# 대화 파일 경로 결정
CONV_DIR="$PROJECT_ROOT/conversations"
TODAY=$(date +%Y-%m-%d)
CONV_FILE="$CONV_DIR/$TODAY-claude.md"

ensure_memory_scaffold "$PROJECT_ROOT"

# conversations 폴더 자동 생성
if [ ! -d "$CONV_DIR" ]; then
    mkdir -p "$CONV_DIR"
fi

# 파일 없으면 헤더 자동 생성 (save-conversation이 아직 안 돌았을 수 있음)
if [ ! -f "$CONV_FILE" ]; then
    PROJECT_NAME=$(basename "$PROJECT_ROOT")
    cat > "$CONV_FILE" << HEADER
---
date: $TODAY
project: $PROJECT_NAME
keywords: []
summary: ""
---

# $TODAY

HEADER
fi

# JSONL 전체 스캔 — 마지막 assistant text 메시지 찾기
# P3: 이전에는 tail -n 500으로 마지막 500줄만 봤는데, tool_use가 많은 긴 turn에서는
#     assistant text가 500줄 경계 밖으로 밀려 누락됐다. 오늘자 JSONL은 보통 수 MB라
#     grep 전체 스캔이 수십 ms 안에 끝난다.
# Claude Code는 thinking/text/tool_use를 별도 JSONL 줄로 분리함
# → "type":"assistant" AND "type":"text" 둘 다 포함된 줄을 찾아야 함
LAST_TEXT_LINE=$(grep '"type":"assistant"' "$TRANSCRIPT_PATH" 2>/dev/null | grep '"type":"text"' | tail -n 1)
if [ -z "$LAST_TEXT_LINE" ]; then
    # type 앞에 공백이 있을 수 있음 (JSON formatter 차이)
    LAST_TEXT_LINE=$(grep -E '"type"[[:space:]]*:[[:space:]]*"assistant"' "$TRANSCRIPT_PATH" 2>/dev/null | grep -E '"type"[[:space:]]*:[[:space:]]*"text"' | tail -n 1)
fi
if [ -z "$LAST_TEXT_LINE" ]; then
    # 이상 상황: 전체 스캔 후에도 assistant text가 없음.
    # reconcile-conversations가 다음 세션 시작 시 JSONL 전체에서 복구한다.
    log_mnemo_error 'no-assistant-text' "transcript=$TRANSCRIPT_PATH 에서 assistant text 줄을 찾지 못함 (전체 스캔)"
    exit 0
fi

# 텍스트 + uuid 추출
# JSONL 전체 라인 파싱 → text 블록과 라인 uuid를 함께 추출
# uuid는 JSONL 줄마다 고유 (dedup 키), message.id는 여러 줄 공유 가능
if ! echo "$LAST_TEXT_LINE" | jq -e . >/dev/null 2>&1; then
    exit_mnemo_error 'message-json' 'assistant 라인 JSON 파싱 실패'
fi
RESPONSE=$(echo "$LAST_TEXT_LINE" | jq -r '[.message.content[] | select(.type=="text") | .text] | join("\n")' 2>/dev/null)
LINE_UUID=$(echo "$LAST_TEXT_LINE" | jq -r '.uuid // empty' 2>/dev/null)
RESPONSE=$(echo "$RESPONSE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# <private> 블록 제거 (민감 정보 보호)
RESPONSE=$(echo "$RESPONSE" | perl -0pe 's/<private>.*?<\/private>/[PRIVATE]/gs' 2>/dev/null || echo "$RESPONSE" | sed 's/<private>[^<]*<\/private>/[PRIVATE]/g')

# 빈 응답이면 스킵
if [ -z "$RESPONSE" ] || [ ${#RESPONSE} -lt 5 ]; then
    exit 0
fi

# P2: 4000자 truncation 제거. JSONL 원본에 온전히 있으니 미러도 온전히 저장.

# 중복 방지 (P2): uuid 기반 사이드카 인덱스가 1순위, 레거시 fingerprint는 fallback
INDEX_PATH="$CONV_DIR/.mnemo-index.json"
if [ -n "$LINE_UUID" ] && is_uuid_in_index "$INDEX_PATH" "$TODAY" "$LINE_UUID"; then
    exit 0
fi

# 레거시 호환: 인덱스 도입 전에 저장된 파일은 fingerprint로 매칭
FINGERPRINT="${RESPONSE:0:80}"
if [ -n "$FINGERPRINT" ] && grep -qF "$FINGERPRINT" "$CONV_FILE" 2>/dev/null; then
    # 이미 저장되어 있음 → 인덱스에만 등록하고 종료
    if [ -n "$LINE_UUID" ]; then
        add_uuid_to_index "$INDEX_PATH" "$TODAY" "$LINE_UUID"
    fi
    exit 0
fi

# append
TIMESTAMP=$(date +%H:%M:%S)
printf '\n## [%s] Assistant\n\n%s\n' "$TIMESTAMP" "$RESPONSE" >> "$CONV_FILE"

# 인덱스에 uuid 등록 (다음 Stop 훅과 reconcile이 이걸 보고 skip)
if [ -n "$LINE_UUID" ]; then
    add_uuid_to_index "$INDEX_PATH" "$TODAY" "$LINE_UUID"
fi

# ── mnemo status notify (LLM 호출 X, 비용 0) ──────────────────
# raw 관찰 누적량 + 마지막 핸드오프 일수가 임계값을 넘으면
# memory/.mnemo-status.md에 기록 + stderr로 안내.
# 사용자/LLM이 다음 세션 시작 시 status 파일을 보고 정제 권유.
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
