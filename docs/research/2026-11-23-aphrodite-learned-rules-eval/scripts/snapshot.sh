#!/usr/bin/env bash
# 작업자 프로젝트 상태 스냅샷: DESIGN.md 해시, 추적 파일 diff 해시, 미추적 파일 목록
# 사용: snapshot.sh <fixtures 루트> <라벨>
cd "$1"
for w in w1 w2 w3 w4 w5 w6; do
  p="$w/project"
  d=$(sha256sum "$p/DESIGN.md" | cut -c1-12)
  c=$(cd "$p" && git diff -- . ':!DESIGN.md' | sha256sum | cut -c1-12)
  u=$(cd "$p" && git ls-files --others --exclude-standard | tr '\n' ' ')
  echo "$2 $w design=$d code_diff=$c untracked=[$u]"
done
