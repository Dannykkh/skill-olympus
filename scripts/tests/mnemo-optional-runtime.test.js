const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const installer = path.join(repoRoot, "skills", "mnemo", "install.js");

// Mnemo의 저장 경로(대화·관찰 로그·MEMORY.md 규칙)는 전부 PowerShell/셸이라 Python 없이
// 돌아간다. Python은 쌓인 것을 읽는 도구(핸드오프/계보/앵커)에만 필요하다. 그래서 없다고
// 설치를 실패로 만들면 안 된다 — 멀쩡히 도는 기능까지 못 쓴다고 오해하게 된다.
// 반대로 조용히 넘어가도 안 된다. 컨텍스트가 차는 순간 핸드오프 스크립트가 없는 것이
// 진짜 사고다. 그래서 "경고하되 실패로 치지 않는다"가 계약이다.

// node만 있고 python/py/python3은 없는 PATH를 만든다.
function pathWithoutPython() {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "mnemo-nopy-"));
  return { value: empty, cleanup: () => fs.rmSync(empty, { recursive: true, force: true }) };
}

function runCheck(env) {
  return spawnSync(process.execPath, [installer, "--check"], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120000,
    env: { ...process.env, ...env },
  });
}

test("Python이 없으면 경고하되 무엇이 되고 안 되는지 알려준다", () => {
  const stub = pathWithoutPython();
  try {
    const result = runCheck({ PATH: stub.value, Path: stub.value });
    const out = `${result.stdout || ""}${result.stderr || ""}`;
    assert.match(out, /Python 3을 찾지 못했습니다/, "Python 부재를 알리지 않습니다");
    assert.match(out, /설치 실패 아님/, "부재를 설치 실패로 오해하게 둡니다");
    assert.match(out, /동작함/, "무엇이 여전히 동작하는지 알리지 않습니다");
    assert.match(out, /handoff-template\.md/, "Python 없이 핸드오프 쓰는 방법을 안내하지 않습니다");
  } finally {
    stub.cleanup();
  }
});

test("Python 부재 자체는 health check 실패로 세지 않는다", () => {
  const stub = pathWithoutPython();
  try {
    const out = `${runCheck({ PATH: stub.value, Path: stub.value }).stdout || ""}`;
    // 보고된 issue 수는 훅/설정/규칙에서만 나온다. Python 줄은 issue 목록에 끼면 안 된다.
    const issues = /(\d+) issue\(s\) found/.exec(out);
    const count = issues ? Number(issues[1]) : 0;
    const pythonFlaggedAsIssue = /❌[^\n]*Python/.test(out);
    assert.equal(pythonFlaggedAsIssue, false,
      `Python 부재가 ❌ 실패로 보고됐습니다 (issue ${count}건)`);
  } finally {
    stub.cleanup();
  }
});

test("Python이 있으면 버전과 함께 사용 가능하다고 보고한다", () => {
  const out = `${runCheck({}).stdout || ""}`;
  const hasPython = spawnSync("python", ["--version"], { encoding: "utf8" }).status === 0
    || spawnSync("py", ["--version"], { encoding: "utf8" }).status === 0
    || spawnSync("python3", ["--version"], { encoding: "utf8" }).status === 0;
  if (!hasPython) return;   // 이 머신에 Python이 없으면 확인할 것이 없다
  assert.match(out, /Python 3\.\d+/, "감지된 Python 버전을 보고하지 않습니다");
  assert.match(out, /핸드오프 도구 사용 가능/, "사용 가능 여부를 알리지 않습니다");
});

test("SKILL.md가 Python 없는 경로를 문서화한다", () => {
  const skill = fs.readFileSync(path.join(repoRoot, "skills", "mnemo", "SKILL.md"), "utf8");
  assert.match(skill, /Python이 없어도 기억은 계속 쌓입니다/);
  assert.match(skill, /handoff-template\.md/);
});
