#!/bin/bash
# cancel-loop.sh — Chronos 루프 중단
# 상태 파일을 삭제하여 Stop 훅이 루프 재투입을 멈추도록 함
# Claude가 Bash로 rm을 호출할 필요가 없도록, 사용자가 터미널에서 직접 실행합니다.

set -euo pipefail

base_dir="${1:-$(pwd)}"

state_files=(
    "$base_dir/.claude/loop-state.md"
    "$base_dir/.codex/loop-state.md"
    "$base_dir/.chronos/loop-state.md"
)

removed=0
for path in "${state_files[@]}"; do
    if [ -f "$path" ]; then
        rm -f "$path"
        echo "removed: $path"
        removed=$((removed + 1))
    fi
done

if [ "$removed" -eq 0 ]; then
    echo "Chronos 상태 파일이 없습니다. 이미 루프가 비활성 상태입니다."
else
    echo "Chronos 루프를 중단했습니다. ($removed개 상태 파일 삭제)"
fi
