#!/usr/bin/env node
// 설치기가 이 저장소의 위치를 Olympus 상태 폴더(~/.skill-olympus/repo-root)에 남긴다.
// 설치된 세션 시작 훅은 CLI 설정 폴더(~/.claude/hooks 등)에서 돌아 저장소를 모른다.
// 훅은 이 기록으로 저장소의 scripts/update-check.*를 찾아 업데이트를 확인한다.
// 기록에 실패해도 설치는 계속한다. 업데이트 안내만 빠질 뿐이다.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
// update-check.ps1·.sh와 같은 규칙: OLYMPUS_STATE_DIR가 있으면 그것, 없으면 홈의 .skill-olympus
const stateDir = process.env.OLYMPUS_STATE_DIR || path.join(os.homedir(), ".skill-olympus");

try {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, "repo-root"), `${repoRoot}\n`, "utf8");
} catch (error) {
  console.error(`[record-repo-root] skipped: ${error.message}`);
}
