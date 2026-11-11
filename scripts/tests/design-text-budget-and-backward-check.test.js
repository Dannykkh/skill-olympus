// 젭마인 역산 점검(arch 098), 아프로디테 텍스트 예산·덜어내기(arch 099), 모호점 정리(arch 100) 회귀 테스트.
// 2026-11-11 블라인드 실행에서 확인한 행동(설명 문장 0개, 채워질 구역 유지, 결정 대기 보고)은
// 문구가 남아 있어야 다음 실행도 따른다. 문서가 있는 것과 읽히는 것은 다르다(arch 023).
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

test("zephermine carries the deadline from the interview into the spec and the strategy rubric", () => {
  const interview = read("zephermine", "references", "interview-protocol.md");
  // 마감을 묻기만 하고 어디에도 남기지 않던 것이 원래 빈 곳이었다.
  assert.match(interview, /📌 제약: 기한 \{날짜·기간 \| 없음 \| 미확인\}/);
  assert.match(interview, /`미확인`은 차단 이슈가 아닙니다/);

  const skill = read("zephermine", "SKILL.md");
  // Step 8의 Context Map 견본은 코드 블록 안에 `###` 줄이 있어 절 단위로 자르지 않고 전체에서 찾는다.
  assert.match(skill, /^- 기한·제약: \{Soft Gate 2 `제약`/m);
  assert.match(section(skill, "### 12."), /확인된 기한이 있으면 그 안에 끝나는지/);
});

test("zephermine Step 15 trims the plan backward from the success criteria without stopping", () => {
  const skill = read("zephermine", "SKILL.md");
  const checkpoint = section(skill, "### 15.");
  assert.match(checkpoint, /역산 점검 \(정지 없이 수행\)/);
  for (const verdict of ["`생략`", "`대체`", "`후순위`", "`채택`", "`조건부 채택`", "`반려`"]) {
    assert.ok(checkpoint.includes(verdict), `Step 15 is missing ${verdict}`);
  }
  // 덜어내기가 필요한 대응까지 빼지 않게 하는 예외와, 개수 채우기 금지.
  assert.match(checkpoint, /덜어내지 않는 것: team-review Critical Findings 대응/);
  assert.match(checkpoint, /개수를 채우려고 항목을 지어내지 않는다/);
  assert.match(checkpoint, /실제 승인을 대신하지 않는다/);
  // 덜어낸 항목이 섹션 작성 중 되살아나는지는 최종 검사가 본다.
  assert.match(section(skill, "### 23."), /\*\*역산 점검\*\* — `integration-notes\.md`에 `## 역산 점검`/);
});

test("block anatomy budgets text and keeps only functional elements mandatory", () => {
  const anatomy = read("frontend-design", "references", "layout-block-anatomy.md");
  assert.match(anatomy, /\| 8 \| \*\*텍스트 예산\*\* \|/);
  assert.match(anatomy, /블록 안의 설명 문장은 기본 0/);
  assert.match(anatomy, /기능 요소\(CTA·가격·값·상태·내비\)를\s*>?\s*빼먹는 방식으로 변주하지 마세요/);
  // Hero는 머리 하나에 다섯 층을 쌓던 처방이었다.
  assert.match(section(anatomy, "### Hero"), /eyebrow와 서브텍스트는 둘 중 하나만/);
  // Feature 블록이 금지 목록 #2의 구조를 그대로 처방하던 충돌.
  assert.match(section(anatomy, "### Feature"), /ai-slop-blacklist\.md` #2/);
});

test("the wireframe gate subtracts before the five criteria and keeps the screen skeleton", () => {
  const gate = section(read("design-plan", "SKILL.md"), "### 2-5.");
  assert.match(gate, /\*\*덜어내기 \(다섯 기준 판정 전에\):\*\*/);
  assert.match(gate, /`공통 문법` #8 텍스트 예산/);
  // 1차 규칙은 Dashboard 첫 실행 변형의 채워질 구역까지 빼서 화면 아래 절반이 비었다(S2).
  assert.match(gate, /화면 유형의 골격이 아닙니다/);
  assert.match(gate, /절반 가까이가 빈 채로 남으면\s*과하게 뺀 것입니다/);
  assert.match(gate, /설명 문장을 지워도 라벨, 상태, 다음 행동을 이해하는가\?/);
  // 양식 절이 읽을 목록에 없어 작업자가 자체 구성으로 썼다(S1).
  assert.match(gate, /`청사진\(blueprint\) 산출 절차`/);
});

test("design-plan validates the stated success conditions and names the decision-pending end", () => {
  const skill = read("design-plan", "SKILL.md");
  assert.match(section(skill, "### 6-3."), /`관찰 가능한 성공 조건`을 항목별로\s*`PASS`\/`FAIL`\/`NOT RUN`/);
  const validation = section(skill, "### 4-4.");
  assert.match(validation, /`결정 대기`로 보고합니다/);
  assert.match(validation, /권장안을\s*사용자 결정처럼 적어 검증을 통과시키지 않습니다/);
  assert.match(section(skill, "### 2-4."), /`Mode: 없음 — <화면 성격>`/);

  const contract = read("design-plan", "references", "experience-contract-guide.md");
  assert.match(contract, /계약의 칸은 화면 문구가 아닙니다/);
  assert.match(contract, /`scope`와 `structure`의 경계:/);
  assert.match(contract, /`<화면>-<결과>` 이름/);
});
