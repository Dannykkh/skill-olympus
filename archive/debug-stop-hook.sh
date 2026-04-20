#!/usr/bin/env bash
# Stop 훅 데이터 덤프 (디버그용)
raw=$(cat)
timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
outFile="$PWD/.claude/debug-stop-$timestamp.json"
mkdir -p "$(dirname "$outFile")"
echo "$raw" > "$outFile"
