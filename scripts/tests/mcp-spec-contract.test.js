const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

// MCP는 웹·서버·로컬 프로그램 모두에 들어가므로 HTTP가 있을 때만 생기는 api-spec.md와
// 분리된 별도 산출물이다. 다만 REST가 있으면 스키마를 복사하지 않고 엔드포인트를 참조한다.
test("mcp-spec-guide is a separate contract that references REST instead of copying it", () => {
  const guide = read("skills/zephermine/references/mcp-spec-guide.md");
  assert.match(guide, /\*\*이름과 파라미터 이름으로 참조만\*\*/);
  assert.match(guide, /## Agent Task Requirements/);
  assert.match(guide, /\| 입력으로 아는 것 \|/);
  assert.match(guide, /`화면 액션 파생`/);
  assert.match(guide, /## Internal Commands/);
  assert.match(guide, /## Server/);
  assert.match(guide, /## Tools/);
});

test("mcp-spec-guide conventions cover exposure, risk, limits, audit and change review", () => {
  const guide = read("skills/zephermine/references/mcp-spec-guide.md");
  assert.match(guide, /\*\*노출은 기본으로 꺼짐\.\*\*/);
  assert.match(guide, /DB·파일을 직접 읽거나 쓰는 도구/);
  assert.match(guide, /`destructiveHint: true`/);
  assert.match(guide, /\*\*호출 한도\*\*/);
  assert.match(guide, /\*\*같은 대상 중복 방지\*\*/);
  assert.match(guide, /\*\*에이전트 경유 기록\*\*/);
  assert.match(guide, /\*\*모델용 문구\*\*/);
  assert.match(guide, /노출을 새로 켜거나, 위험 표시를 낮추거나/);
});

test("api-spec-guide links to the MCP spec without carrying MCP sections", () => {
  const guide = read("skills/zephermine/references/api-spec-guide.md");
  assert.match(guide, /mcp-spec-guide\.md/);
  assert.match(guide, /`mcp`\(MCP 도구만 호출/);
  assert.doesNotMatch(guide, /## Agent Task Requirements/);
  assert.doesNotMatch(guide, /## MCP Tools/);
});

test("zephermine runs Step 17A and carries mcp-spec into sections", () => {
  const skill = read("skills/zephermine/SKILL.md");
  assert.match(skill, /### 17A\. Generate MCP Specification/);
  assert.match(skill, /\[mcp-spec-guide\.md\]\(references\/mcp-spec-guide\.md\)/);
  const sections = read("skills/zephermine/references/section-splitting.md");
  assert.match(sections, /MCP 도구가 `mcp-spec\.md`와 일치함/);
});

// 설계 없이 구현하는 다이달로스 경로는 mcp-spec.md를 거치지 않으므로 규약 정본을 직접
// 가리키지 않으면 검토 없이 열린 도구·DB 직접 접근 도구가 다시 생긴다.
for (const file of [
  "skills/orchestrator/commands/workpm.md",
  "skills/orchestrator/commands/workpm-mcp.md",
]) {
  test(`${file} fixes and reviews the MCP conventions`, () => {
    const text = read(file);
    assert.match(text, /\*\*MCP 규약 고정\*\*/);
    assert.match(text, /references\/mcp-spec-guide\.md`의 `## Conventions`/);
    assert.match(text, /\| MCP 규약 \(MCP 작업만\) \|/);
  });
}

test("argos audits implemented MCP tools against mcp-spec.md", () => {
  const skill = read("skills/argos/SKILL.md");
  assert.match(skill, /### Phase 3A: MCP 일치 검증/);
  assert.match(skill, /mcp-spec\.md          → Phase 3A/);
  const protocol = read("skills/argos/references/verify-protocol.md");
  assert.match(protocol, /#### 3A-3\. 도구별 계약 검사/);
  assert.match(protocol, /❌ 미승인 노출/);
});
