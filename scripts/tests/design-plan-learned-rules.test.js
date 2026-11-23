// 아프로디테 프로젝트 취향 학습(arch 110) 회귀 테스트.
// 사용자가 같은 디자인 지적을 두 번 하지 않도록, 지적을 승인받아 DESIGN.md `## Learned Rules`에 쌓고
// 구현 전에 읽고(5-1) 검증 때 대조하는(6-4) 고리다. 문구가 빠지면 다음 실행이 그 고리를 따르지 않는다(arch 023).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, "skills", ...parts), "utf8");

function section(source, heading) {
  const start = source.indexOf(heading);
  assert.notEqual(start, -1, `missing ${heading}`);
  const end = source.indexOf("\n### ", start + heading.length);
  return source.slice(start, end === -1 ? undefined : end);
}

test("Phase 7-1 proposes learned rules and writes only what the user approved", () => {
  const learn = section(read("design-plan", "SKILL.md"), "### 7-1.");
  assert.match(learn, /화면과 코드를 고치지 않습니다/);
  // 모을 근거: 말로 한 지적, 직접 고친 것, 되돌린 것, 확인한 선택
  assert.match(learn, /두 번 이상 한 지적이 가장 중요합니다/);
  assert.match(learn, /`git diff`/);
  assert.match(learn, /되돌린 변경/);
  // 새 세션에서는 대화 기록과 git 이력으로 찾는다 — 지적은 전체 실행 뒤 다른 세션에서 온다
  assert.match(learn, /`conversations\/\*\.md`/);
  // 규칙이 아닌 것
  assert.match(learn, /기능 버그와 그 화면에서만 의미 있는 문구·내용 수정은 후보가 아닙니다/);
  assert.match(learn, /새 작업자도 같은 실수를 할 지적만/);
  // 기록 위치를 나눈다
  assert.match(learn, /\| 코드·도구 사용 실수 \| 프로젝트 `memory\/gotchas\/` \|/);
  assert.match(learn, /7-2 전역 진화 후보/);
  // 승인 게이트
  assert.match(learn, /저장할 번호를 묻고 멈춥니다/);
  assert.match(learn, /고르지 않은 후보는 쓰지 않습니다/);
  assert.match(learn, /두 문구를 나란히\s*보여 줍니다/);
  assert.match(learn, /토큰을 지어내지 않습니다/);
});

test("learned rules are read before build, checked in validation, and reachable alone", () => {
  const skill = read("design-plan", "SKILL.md");
  assert.match(section(skill, "### 6-4."), /`## Learned Rules`가 있으면 규칙마다 실제 렌더·코드와 대조해/);
  assert.match(section(skill, "### 5-1."), /루트 `DESIGN\.md` 전체/);
  assert.match(section(skill, "### 1-1."), /`## Learned Rules`에 이미\s*있으면 묻지 않습니다/);
  assert.match(skill, /\| `--learn-only` \| Phase 7-1만 실행/);
  assert.match(section(skill, "### 0-1."), /`--learn-only`나 "오늘 디자인 지적 정리해줘"/);
  // 전역 진화는 그대로 승인·대조 실험을 거친다
  assert.match(section(skill, "### 7-2."), /MODULE_SKILL\[skill-evolve\]/);
});

test("DESIGN.md guide defines the Learned Rules format and keeps it on regeneration", () => {
  const guide = read("design-plan", "references", "design-md-guide.md");
  assert.match(guide, /### `## Learned Rules` — 사용자가 승인한 지적/);
  assert.match(guide, /승인 없이 쓰지 않습니다/);
  assert.match(guide, /`\(추정\)`을 붙입니다/);
  assert.match(guide, /같은 규칙을 다시 지적받으면 새 줄을 만들지 않고 그 규칙을 고칩니다/);
  assert.match(guide, /규칙이 토큰 값을 바꾸면 YAML 토큰도 같이 고칩니다/);
  // Phase 3이 DESIGN.md를 다시 쓸 때 학습 규칙을 잃지 않는다
  assert.match(guide, /기존 `## Learned Rules` → 그대로 옮깁니다/);
  assert.match(guide, /고르기 전에는 기존 규칙을 유지합니다/);
});
