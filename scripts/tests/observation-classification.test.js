const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");

// 관찰 훅은 도구 출력/응답 텍스트를 보고 gotchas(실패)와 learned(성공)로 가른다.
// 예전 판정은 "출력 어딘가에 error/fail 같은 단어가 있는가"였다. 그런데 Edit/Write의
// 응답은 편집한 소스를 그대로 되돌려주고, Bash 출력에는 cat/sed로 읽은 코드와 문서가
// 흘러든다. 그래서 `Failed(` 호출이나 `{Info, Warning, Error}` enum, 문서 표의
// fail-closed 링크 때문에 성공한 작업이 통째로 gotchas에 쌓였다.
// 실측(핸드오프 프로젝트 관찰 4,736건): 옛 규칙 1,049건 → 새 규칙 27건, 재분류 1,023건.
// 오염된 관찰은 memory-distill의 입력이므로 기억 품질을 직접 망가뜨린다.
const HOOKS = [
  "hooks/save-tool-use.ps1",
  "hooks/save-tool-use.sh",
  "skills/codex-mnemo/hooks/save-turn.ps1",
  "skills/codex-mnemo/hooks/save-turn.sh",
  "skills/grok-mnemo/hooks/save-turn.ps1",
  "skills/grok-mnemo/hooks/save-turn.sh",
];

// 되돌아오면 안 되는 옛 판정. 단어 하나만 보고 실패로 단정하는 형태다.
const NAIVE_PATTERN = /\(\?i\)\(error\|fail\|exception\|denied|grep -qiE '\(error\|fail\|exception/;

test("관찰 훅은 단어 하나로 실패를 단정하지 않는다", () => {
  const offenders = [];
  for (const rel of HOOKS) {
    const file = path.join(repoRoot, rel);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    if (NAIVE_PATTERN.test(text)) offenders.push(rel);
  }
  assert.deepEqual(offenders, [],
    `단어 매칭 판정이 되살아났습니다: ${offenders.join(", ")}\n` +
    "소스 본문의 Failed(/Error enum 때문에 성공이 gotchas로 오분류됩니다.");
});

test("내용을 되돌려주는 도구는 본문 매칭 대상에서 빠져 있다", () => {
  const ps = fs.readFileSync(path.join(repoRoot, "hooks/save-tool-use.ps1"), "utf8");
  const sh = fs.readFileSync(path.join(repoRoot, "hooks/save-tool-use.sh"), "utf8");
  for (const tool of ["Edit", "Write", "NotebookEdit"]) {
    assert.ok(ps.includes(`"${tool}"`), `save-tool-use.ps1에 ${tool} 예외가 없습니다`);
    assert.ok(sh.includes(tool), `save-tool-use.sh에 ${tool} 예외가 없습니다`);
  }
  assert.match(ps, /\[\^\\n\]/,
    "PowerShell 정규식에 실제 줄바꿈이 들어갔습니다. [^\\n] 이스케이프가 필요합니다.");
});

// 셸 훅이 실제로 쓰는 정규식을 파일에서 꺼내 돌린다. 테스트가 패턴을 따로 들고 있으면
// 훅이 바뀌어도 테스트가 통과해 버리므로, 반드시 shipped 패턴으로 판정한다.
function shippedShellPattern() {
  const sh = fs.readFileSync(path.join(repoRoot, "hooks/save-tool-use.sh"), "utf8");
  const match = sh.match(/grep -qE '(\^\[\[:space:\]\][^']+)'/);
  assert.ok(match, "save-tool-use.sh에서 에러 판정 정규식을 찾지 못했습니다");
  return match[1];
}

test("에러 형태만 실패로 보고, 코드·문서 본문은 성공으로 둔다", () => {
  const pattern = shippedShellPattern();
  const classify = (output) => {
    const run = spawnSync("grep", ["-qE", pattern], { input: output, encoding: "utf8" });
    return run.status === 0 ? "gotchas" : "learned";
  };

  const cases = [
    // 실패가 아닌 것 — 전부 실제 관찰 로그에서 오분류됐던 문자열이다.
    ["| 2026-07-27 | [explicit-project-scope-fail-closed](033.md) |", "learned"],
    ['public const string ObservationFailed = "observation-failed";', "learned"],
    ["steps.Add(hasBlockingSeverity ? Failed(DesignVerificationStage.X)", "learned"],
    ["  {Info, Warning, Error} 재사용", "learned"],
    ["모든 테스트를 통과했습니다. 3/3", "learned"],
    // 진짜 실패
    ["System.TimeoutException : Expected patch state None", "gotchas"],
    ["  System.IO.DirectoryNotFoundException : Could not find a part", "gotchas"],
    ["bash: foo: command not found", "gotchas"],
    ["Traceback (most recent call last):", "gotchas"],
    ["error CS1002: ; expected", "gotchas"],
    ["npm ERR! code ENOENT", "gotchas"],
    ["fatal: not a git repository", "gotchas"],
  ];

  for (const [output, expected] of cases) {
    assert.equal(classify(output), expected,
      `오분류: ${JSON.stringify(output.slice(0, 60))} → 기대 ${expected}`);
  }
});

// 기억 카테고리를 memory/architecture/ 로 나누면, 스캐폴드가 평평한 architecture.md 를
// 다시 만들어 분할본과 단일본이 함께 남는다. 실제로 분할 1분 뒤 훅이 109바이트 스텁을
// 되살렸고, 그때부터 어느 쪽이 정본인지 알 수 없게 된다.
test("스캐폴드는 분할 디렉터리가 있으면 평평한 파일을 만들지 않는다", () => {
  const cases = [
    ["hooks/save-conversation.ps1", /GetFileNameWithoutExtension\(\$fileName\)/],
    ["hooks/save-response.ps1", /GetFileNameWithoutExtension\(\$fileName\)/],
    ["hooks/save-conversation.sh", /architecture\/index\.md" \]; then/],
    ["hooks/save-response.sh", /architecture\/index\.md" \]; then/],
  ];
  for (const [rel, pattern] of cases) {
    const text = fs.readFileSync(path.join(repoRoot, rel), "utf8");
    assert.match(text, pattern,
      `${rel}에 분할 디렉터리 확인이 없습니다 — 스캐폴드가 단일본을 되살립니다.`);
  }
});
