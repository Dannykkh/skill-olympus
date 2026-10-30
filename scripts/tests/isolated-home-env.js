"use strict";

const path = require("node:path");

// 가짜 홈으로 설치기·훅을 실행하는 테스트의 환경 변수를 만든다.
// HOME·USERPROFILE만 바꾸면 홈보다 우선하는 설정 경로 변수를 그대로 물려받는다.
// TermSnap은 CLAUDE_CONFIG_DIR을 계정 폴더로 지정하고, Devin 설치기는 Windows에서
// APPDATA를 쓰므로, 테스트가 사용자의 실제 설정에 설치하게 된다(gotcha 120).
// 두 값은 node 설치기만 읽으므로 Git Bash 테스트에서도 shellPath가 아닌 원래 경로로 둔다.
// CODEX_HOME·ANTIGRAVITY_HOME·GROK_HOME은 테스트마다 의도가 달라(대체 경로 검사 등) 호출부가 정한다.
function isolatedHomeEnv(home, overrides = {}) {
  return {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    // install.bat·install.sh는 USERPROFILE\.claude에 쓰고 mnemo 설치기는 CLAUDE_CONFIG_DIR을 확인한다.
    // 다른 폴더를 주면 확인이 실패해 복구 설치가 엉뚱한 곳으로 가므로 같은 홈의 .claude로 맞춘다.
    CLAUDE_CONFIG_DIR: path.join(home, ".claude"),
    DEVIN_CONFIG_DIR: path.join(home, ".config", "devin"),
    ...overrides,
  };
}

module.exports = { isolatedHomeEnv };
