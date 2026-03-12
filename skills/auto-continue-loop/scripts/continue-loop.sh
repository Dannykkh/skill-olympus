#!/bin/bash
# continue-loop.sh - Codex notify 기반 Chronos 자동 재개

set -euo pipefail

DEBUG_FILE="$HOME/.codex/hooks/chronos-continue.log"

debug_log() {
    mkdir -p "$(dirname "$DEBUG_FILE")" 2>/dev/null || true
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$DEBUG_FILE" 2>/dev/null || true
}

read_payload() {
    local payload=""
    if [ ! -t 0 ]; then
        payload="$(cat 2>/dev/null || true)"
    fi

    if [ -z "$payload" ] && [ "${1:-}" != "" ]; then
        if [ -f "$1" ]; then
            payload="$(cat "$1" 2>/dev/null || true)"
        else
            payload="$1"
        fi
    fi

    printf '%s' "$payload"
}

json_eval() {
    local expression="$1"
    local node_cmd=""
    if command -v jq >/dev/null 2>&1; then
        printf '%s' "$PAYLOAD" | jq -r --arg key "$expression" '
            .[$key] // empty
            | if type == "string" then .
              elif type == "array" then map(
                    if type == "object" then (.text // .content // empty)
                    elif . == null then empty
                    else tostring
                    end
                ) | join("\n")
              elif type == "object" then (.text // .content // empty)
              else tostring
              end
        ' 2>/dev/null
        return 0
    fi

    if command -v python3 >/dev/null 2>&1; then
        PAYLOAD_JSON="$PAYLOAD" python3 - "$expression" <<'PY'
import json
import os
import sys

payload = os.environ.get("PAYLOAD_JSON", "")
expr = sys.argv[1]
try:
    data = json.loads(payload)
except Exception:
    sys.exit(0)

path_map = {
    "cwd": "cwd",
    "working-directory": "working-directory",
    "working_directory": "working_directory",
    "project-root": "project-root",
    "project_root": "project_root",
    "workspace-root": "workspace-root",
    "workspace_root": "workspace_root",
    "turn-id": "turn-id",
    "turn_id": "turn_id",
    "session-id": "session-id",
    "session_id": "session_id",
    "last-assistant-message": "last-assistant-message",
    "last_assistant_message": "last_assistant_message",
}

path = path_map.get(expr)
if not path:
    sys.exit(0)

value = data
for key in path.split("."):
    if isinstance(value, dict):
        value = value.get(key)
    else:
        value = ""
        break

if value is None:
    value = ""
elif isinstance(value, dict):
    value = value.get("text") or value.get("content") or ""
elif isinstance(value, list):
    parts = []
    for item in value:
        if isinstance(item, dict):
            text = item.get("text") or item.get("content") or ""
            if text:
                parts.append(str(text))
        elif item is not None:
            parts.append(str(item))
    value = "\n".join(parts)

print(value)
PY
        return 0
    fi

    if command -v node >/dev/null 2>&1; then
        node_cmd="node"
    elif command -v node.exe >/dev/null 2>&1; then
        node_cmd="node.exe"
    fi

    if [ -n "$node_cmd" ]; then
        PAYLOAD_JSON="$PAYLOAD" "$node_cmd" - "$expression" <<'JS'
const payload = process.env.PAYLOAD_JSON || "";
const expr = process.argv[2];

const pathMap = {
  "cwd": "cwd",
  "working-directory": "working-directory",
  "working_directory": "working_directory",
  "project-root": "project-root",
  "project_root": "project_root",
  "workspace-root": "workspace-root",
  "workspace_root": "workspace_root",
  "turn-id": "turn-id",
  "turn_id": "turn_id",
  "session-id": "session-id",
  "session_id": "session_id",
  "last-assistant-message": "last-assistant-message",
  "last_assistant_message": "last_assistant_message",
};

function extract(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return item.text || item.content || "";
        }
        return item == null ? "" : String(item);
      })
      .filter(Boolean)
      .join("\\n");
  }
  if (typeof value === "object") {
    return value.text || value.content || "";
  }
  return String(value);
}

try {
  const data = JSON.parse(payload);
  const key = pathMap[expr];
  if (!key) process.exit(0);
  process.stdout.write(extract(data[key]));
} catch {}
JS
    fi
}

first_non_empty_json() {
    local value=""
    for key in "$@"; do
        value="$(json_eval "$key")"
        if [ -n "$value" ]; then
            printf '%s' "$value"
            return 0
        fi
    done
    return 1
}

resolve_state_file() {
    local base_dir="$1"
    local candidates=(
        "$base_dir/.claude/loop-state.md"
        "$base_dir/.codex/loop-state.md"
        "$base_dir/.chronos/loop-state.md"
    )

    for candidate in "${candidates[@]}"; do
        if [ -f "$candidate" ]; then
            printf '%s' "$candidate"
            return 0
        fi
    done

    return 1
}

normalize_dir_path() {
    local candidate="$1"
    local normalized="$candidate"

    if [ -d "$normalized" ]; then
        printf '%s' "$normalized"
        return 0
    fi

    if command -v cygpath >/dev/null 2>&1; then
        normalized="$(cygpath -u "$candidate" 2>/dev/null || printf '%s' "$candidate")"
        if [ -d "$normalized" ]; then
            printf '%s' "$normalized"
            return 0
        fi
    fi

    if [[ "$candidate" =~ ^([A-Za-z]):/(.*)$ ]]; then
        local drive
        local suffix
        drive="$(printf '%s' "${BASH_REMATCH[1]}" | tr '[:upper:]' '[:lower:]')"
        suffix="${BASH_REMATCH[2]}"
        normalized="/$drive/$suffix"
        normalized="${normalized//\\//}"
        if [ -d "$normalized" ]; then
            printf '%s' "$normalized"
            return 0
        fi

        normalized="/mnt/$drive/$suffix"
        normalized="${normalized//\\//}"
        if [ -d "$normalized" ]; then
            printf '%s' "$normalized"
            return 0
        fi
    fi

    printf '%s' "$candidate"
}

fm_value() {
    local key="$1"
    local value
    value="$(printf '%s\n' "$FRONTMATTER" | sed -n "s/^${key}:[[:space:]]*//p" | head -n 1)"
    value="${value%\"}"
    value="${value#\"}"
    printf '%s' "$value"
}

yaml_quote() {
    local value="$1"
    value="${value//\\/\\\\}"
    value="${value//\"/\\\"}"
    printf '"%s"' "$value"
}

upsert_frontmatter_value() {
    local file="$1"
    local key="$2"
    local raw_value="$3"
    local tmp_file
    tmp_file="${file}.tmp.$$"

    awk -v key="$key" -v value="$raw_value" '
        BEGIN { seen = 0; boundary = 0 }
        {
            if ($0 ~ ("^" key ":")) {
                print key ": " value
                seen = 1
                next
            }

            if ($0 == "---") {
                boundary++
                if (boundary == 2 && !seen) {
                    print key ": " value
                    seen = 1
                }
            }

            print
        }
    ' "$file" > "$tmp_file"

    mv "$tmp_file" "$file"
}

remove_state_file() {
    local reason="$1"
    rm -f "$STATE_FILE"
    debug_log "$reason"
}

should_stop_loop() {
    local output="$1"
    local promise="$2"

    if [ -z "$output" ]; then
        return 1
    fi

    if printf '%s' "$output" | grep -qiE '(Chronos Complete|더 이상.*(할|수정할|고칠).*(없|작업이 없)|all issues.*fixed|no more.*issues|남은.*이슈.*없|모든.*이슈.*수정.*완료|모든.*작업.*완료)'; then
        return 0
    fi

    if [ -n "$promise" ] && [ "$promise" != "null" ]; then
        local promise_text=""
        promise_text="$(printf '%s' "$output" | perl -0777 -ne 'if (/<promise>(.*?)<\/promise>/s) { my $x=$1; $x =~ s/^\s+|\s+$//g; print $x; }' 2>/dev/null || true)"
        if [ -n "$promise_text" ] && [ "$promise_text" = "$promise" ]; then
            return 0
        fi
    fi

    return 1
}

PAYLOAD="$(read_payload "${1:-}")"
if [ -z "$PAYLOAD" ]; then
    exit 0
fi

BASE_DIR="$(first_non_empty_json "cwd" "working-directory" "working_directory" "project-root" "project_root" "workspace-root" "workspace_root" || true)"
if [ -z "$BASE_DIR" ]; then
    BASE_DIR="$PWD"
fi
BASE_DIR="$(normalize_dir_path "$BASE_DIR")"
if [ ! -d "$BASE_DIR" ]; then
    debug_log "skip: baseDir not found $BASE_DIR"
    exit 0
fi

STATE_FILE="$(resolve_state_file "$BASE_DIR" || true)"
if [ -z "$STATE_FILE" ]; then
    exit 0
fi

FRONTMATTER="$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$STATE_FILE")"
if [ -z "$FRONTMATTER" ]; then
    remove_state_file "invalid-state-frontmatter"
    exit 0
fi

ITERATION="$(fm_value "iteration")"
MAX_ITERATIONS="$(fm_value "max_iterations")"
COMPLETION_PROMISE="$(fm_value "completion_promise")"
STATE_SESSION="$(fm_value "session_id")"
LAST_TURN_ID="$(fm_value "last_turn_id")"

TURN_ID="$(first_non_empty_json "turn-id" "turn_id" || true)"
HOOK_SESSION="$(first_non_empty_json "session-id" "session_id" || true)"
LAST_OUTPUT="$(first_non_empty_json "last-assistant-message" "last_assistant_message" || true)"

if [ -n "$STATE_SESSION" ] && [ -n "$HOOK_SESSION" ] && [ "$STATE_SESSION" != "$HOOK_SESSION" ]; then
    exit 0
fi

if [ -n "$TURN_ID" ] && [ -n "$LAST_TURN_ID" ] && [ "$TURN_ID" = "$LAST_TURN_ID" ]; then
    debug_log "skip: duplicate turn $TURN_ID"
    exit 0
fi

if ! [[ "$ITERATION" =~ ^[0-9]+$ ]] || ! [[ "$MAX_ITERATIONS" =~ ^[0-9]+$ ]]; then
    remove_state_file "invalid-state-counters"
    exit 0
fi

if [ "$MAX_ITERATIONS" -gt 0 ] && [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
    remove_state_file "loop-complete: max-iterations=$MAX_ITERATIONS"
    exit 0
fi

if should_stop_loop "$LAST_OUTPUT" "$COMPLETION_PROMISE"; then
    remove_state_file "loop-complete: assistant signalled completion"
    exit 0
fi

PROMPT_TEXT="$(awk '/^---$/{i++; next} i>=2' "$STATE_FILE")"
PROMPT_TEXT="${PROMPT_TEXT#"${PROMPT_TEXT%%[![:space:]]*}"}"
PROMPT_TEXT="${PROMPT_TEXT%"${PROMPT_TEXT##*[![:space:]]}"}"
if [ -z "$PROMPT_TEXT" ]; then
    remove_state_file "invalid-state-empty-prompt"
    exit 0
fi

NEXT_ITERATION=$((ITERATION + 1))
upsert_frontmatter_value "$STATE_FILE" "iteration" "$NEXT_ITERATION"
if [ -n "$TURN_ID" ]; then
    upsert_frontmatter_value "$STATE_FILE" "last_turn_id" "$(yaml_quote "$TURN_ID")"
fi

DOCS_DIR="$BASE_DIR/docs/chronos"
mkdir -p "$DOCS_DIR"

if [ "$MAX_ITERATIONS" -gt 0 ]; then
    MAX_LABEL="${MAX_ITERATIONS}회"
else
    MAX_LABEL="무제한"
fi

PROMPT_FILE="$DOCS_DIR/codex-resume-$(date +%Y%m%d-%H%M%S)-$$.prompt.txt"
LOG_FILE="$DOCS_DIR/codex-resume.log"

{
    printf 'Chronos auto-continue %s/%s\n\n' "$NEXT_ITERATION" "$MAX_LABEL"
    printf 'Original task:\n%s\n\n' "$PROMPT_TEXT"
    printf 'Continue from the current repository state.\n'
    printf -- '- Inspect the latest files, tests, logs, and diff before acting.\n'
    printf -- '- Promote the top actionable next step immediately instead of stopping.\n'
    printf -- '- Do not ask the user to continue.\n'
    printf -- '- Keep changes inside the saved scope and avoid unrelated refactors.\n'
    printf -- "- If no actionable in-scope work remains, output 'Chronos Complete'.\n"
    if [ -n "$COMPLETION_PROMISE" ] && [ "$COMPLETION_PROMISE" != "null" ]; then
        printf -- '- If the completion condition is satisfied, output <promise>%s</promise>.\n' "$COMPLETION_PROMISE"
    fi
} > "$PROMPT_FILE"

if [ "${CHRONOS_DRY_RUN:-0}" = "1" ]; then
    cp "$PROMPT_FILE" "$DOCS_DIR/codex-resume-preview.txt"
    debug_log "dry-run: prepared resume prompt at $PROMPT_FILE"
    exit 0
fi

CODEX_BIN=""
if command -v codex >/dev/null 2>&1; then
    CODEX_BIN="codex"
elif command -v codex.cmd >/dev/null 2>&1; then
    CODEX_BIN="codex.cmd"
fi

if [ -z "$CODEX_BIN" ]; then
    debug_log "skip: codex command not found"
    exit 0
fi

printf -v base_q '%q' "$BASE_DIR"
printf -v prompt_q '%q' "$PROMPT_FILE"
printf -v log_q '%q' "$LOG_FILE"
printf -v codex_q '%q' "$CODEX_BIN"
resume_cmd="cd $base_q && $codex_q exec --skip-git-repo-check resume --last < $prompt_q >> $log_q 2>&1; status=\$?; rm -f $prompt_q; exit \$status"
nohup bash -lc "$resume_cmd" >/dev/null 2>&1 &

debug_log "spawned: turn=${TURN_ID:-none} next=$NEXT_ITERATION state=$STATE_FILE"
