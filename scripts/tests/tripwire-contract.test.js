const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const GUIDE = "skills/zephermine/references/tripwire-guide.md";

// 트립와이어는 결정하는 시점에 재검토 조건을 미리 정하는 장치다. 다섯 요소와 수치 근거 표시가
// 빠지면 "품질이 떨어지면 다시 본다" 같은 판정 불가능한 문장으로 되돌아간다.
test("tripwire guide defines the five elements and the evidence labels", () => {
  const guide = read(GUIDE);
  for (const element of ["초기 신호", "계속 조건", "수정 임계점", "중단 검토 조건", "객관 지표"]) {
    assert.match(guide, new RegExp(`\\| \\d \\| ${element} \\|`));
  }
  assert.match(guide, /`검증됨: <출처>`/);
  assert.match(guide, /`가정: <근거> → 검증: <방법·시점>`/);
  assert.match(guide, /\*\*같은 지표의 칸은 빈틈·겹침 없이 나눈다\.\*\*/);
  assert.match(guide, /\*\*모든 지표에 계측 위치가 있어야 한다\.\*\*/);
  assert.match(guide, /\*\*품질·비용·안전 영역에서 각 1개 이상\*\*/);
  assert.match(guide, /자동 중단이 아니다/);
});

// 블라인드 실행에서 갈렸던 판정들: 실측 기준선에서 고른 임계값을 검증됨으로 적는 것,
// 안전 지표도 재판정까지 켜 두는 것, 계측 작업을 둘 자리가 없는 것.
test("tripwire guide settles the cases blind runs disagreed on", () => {
  const guide = read(GUIDE);
  assert.match(guide, /\*\*실측이 뒷받침하는 것은 기준선이다\.\*\*/);
  assert.match(guide, /\*\*안전·법적 지표는 "자동 중단이 아니다"의 예외다\.\*\*/);
  assert.match(guide, /#### 계측 작업/);
  assert.match(guide, /\*\*수정 임계점 행에는 기각 후보 외에 범위 조정안을 1개 이상 적어 둔다\*\*/);
});

test("zephermine requires tripwires under the strategy decision and checks them", () => {
  const skill = read("skills/zephermine/SKILL.md");
  assert.match(skill, /`## 전략 선택` 필수 하위 섹션 — `### 트립와이어 \(Tripwires\)`/);
  assert.match(skill, /- \*\*트립와이어\*\* — `plan\.md`의 `## 전략 선택` 아래/);
  assert.match(skill, /\[tripwire-guide\.md\]\(references\/tripwire-guide\.md\)/);
  assert.match(read("skills/zephermine/references/external-review.md"), /Tripwires under "전략 선택"/);
});

// 계획에서 정하기만 하고 구현 중에 아무도 보지 않으면 트립와이어는 발동하지 않는다.
// 판정 구간과 위험 가정 우선 규칙이 가이드에 있고, 섹션 순서가 그 가정을 Wave 1에 놓아야 한다.
test("tripwire guide splits judgment into build-time and post-launch and front-loads the risky assumption", () => {
  const guide = read(GUIDE);
  assert.match(guide, /\| ID \| 지표 \| 구간 \|/);
  assert.match(guide, /## 구현 중 판정/);
  assert.match(guide, /## 구현 중 지표 카탈로그/);
  assert.match(guide, /\*\*가장 위험한 가정은 첫 Wave에서 확인한다\.\*\*/);
  assert.match(guide, /`구현 중` 지표 1개 이상/);
  // 결과를 본 뒤 선을 옮겨 이미 닿은 단계를 지우는 것이 블라인드 점검에서 나온 대표 실패였다.
  assert.match(guide, /\*\*이미 닿은 단계는 재보정으로 없애지 않는다\*\*/);
  assert.match(read("skills/zephermine/references/section-index.md"), /\| 위험 가정 확인 /);
  assert.match(read("skills/zephermine/references/section-splitting.md"), /Dependencies를 비워 Wave 1에 들어가게/);
});

// 구현 하네스가 가이드를 가리키지 않으면 그 경로에서 구현 중 판정이 다시 빠진다.
const BUILD_HARNESSES = [
  "skills/agent-team/SKILL.md",
  "skills/agent-team-codex/SKILL.md",
  "skills/auto-continue-loop/SKILL.md",
  "skills/orchestrator/commands/workpm.md",
  "skills/orchestrator/commands/workpm-mcp.md",
  "skills/zeus/SKILL.md",
];

test("every build harness judges build-time tripwires through the shared guide", () => {
  for (const file of BUILD_HARNESSES) {
    const text = read(file);
    assert.match(text, /references\/tripwire-guide\.md/, `${file} does not reference the guide`);
    assert.match(text, /## 구현 중 판정/, `${file} does not point at the judgment procedure`);
  }
  assert.match(read("skills/agent-team/SKILL.md"), /### Step 5A: Tripwire Check \(Wave 경계 판정\)/);
  assert.match(read("skills/agent-team-codex/SKILL.md"), /\*\*Wave 경계 트립와이어 판정\*\*/);
  for (const file of ["skills/orchestrator/commands/workpm.md", "skills/orchestrator/commands/workpm-mcp.md"]) {
    const text = read(file);
    assert.match(text, /\*\*트립와이어 고정\*\*/, `${file} does not fix tripwires in Phase 1`);
    assert.match(text, /\*\*위험 가정 먼저\*\*/, `${file} does not run the risky assumption first`);
  }
});

// 크로노스는 종료 방법이 둘뿐이다. 트립와이어는 새 종료 방법이 아니라 기존 주차로 루프를 끝낸다.
// 제우스는 멈추지 않는 계약이 우선이라 결정 장부로 사후 결재에 넘긴다.
test("chronos reuses parking and zeus records instead of stopping", () => {
  const chronos = read("skills/auto-continue-loop/SKILL.md");
  assert.match(chronos, /### 트립와이어 판정 — 계획이 정한 재검토 조건/);
  assert.match(chronos, /남은 in-scope 이슈를 모두 `제품 결정` 사유로 주차한다/);
  assert.match(chronos, /루프의 종료 방법을 새로 만들지 않는다/);
  assert.match(chronos, /\*\*AI가 루프를 끝내는 방법은 딱 2가지:\*\*/);
  const zeus = read("skills/zeus/SKILL.md");
  assert.match(zeus, /트립와이어[^\n]*멈추지 않고 `\[ZEUS-AUTO:taste\]`/);
});

// 아테나는 형식을 복제하지 않고 젭마인 가이드를 가리킨다 — 정본이 둘이면 따로 어긋난다.
test("athena GO verdict carries tripwires by pointing at the zephermine guide", () => {
  const skill = read("skills/ceo/SKILL.md");
  assert.match(skill, /\*\*GO·CONDITIONAL GO에는 재검토 조건\(트립와이어\)을 붙인다\.\*\*/);
  assert.match(skill, /`skills\/zephermine\/references\/tripwire-guide\.md`/);
  const template = read("skills/ceo/references/output-template.md");
  assert.match(template, /## 재검토 조건 \(트립와이어\)/);
  assert.doesNotMatch(template, /## AI 기능 지표 카탈로그/);
});
