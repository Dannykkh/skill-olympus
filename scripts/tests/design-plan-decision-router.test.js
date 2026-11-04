// 아프로디테 결정 계층 라우터(arch 097) 회귀 테스트.
// 2026-11-04 블라인드 재평가에서 확인한 행동(계층 판정 첫 줄, 제외 충돌 시 Phase 2 전 정지, 선택 로드)은
// 문구가 남아 있어야 다음 실행도 따른다. 문서가 있는 것과 읽히는 것은 다르다(arch 023).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const skillDir = path.join(repoRoot, "skills", "design-plan");
const read = (...parts) => fs.readFileSync(path.join(skillDir, ...parts), "utf8");

function section(source, heading) {
  const start = source.indexOf(heading);
  assert.notEqual(start, -1, `missing ${heading}`);
  const end = source.indexOf("\n### ", start + heading.length);
  return source.slice(start, end === -1 ? undefined : end);
}

test("Phase 0-1 judges the decision layer before reading anything else", () => {
  const router = section(read("SKILL.md"), "### 0-1.");
  for (const layer of ["strategy —", "scope —", "structure —", "skeleton —", "surface —"]) {
    assert.ok(router.includes(`| ${layer}`), `router table is missing ${layer}`);
  }
  assert.match(router, /계층: <strategy\|scope\|structure\|skeleton\|surface>/);
  assert.match(router, /PRODUCT\.md/);
  // 상류 결정의 위치를 규칙으로 적어야 작은 예제가 아닌 곳에서도 찾는다.
  for (const upstream of ["docs/athena/", "interview.md", "docs/hermes/", "공유 전제"]) {
    assert.ok(router.includes(upstream), `router does not name ${upstream}`);
  }
  // 기준선 S3는 충돌을 알아채고도 제외 기능을 끝까지 설계했다.
  assert.match(router, /Phase 2로 가지 않습니다/);
  assert.match(router, /`--plan-only`여도/);
  assert.match(router, /Open Decisions/);
});

test("Phase 5-1 keeps the consumption gate and reads the rest by layer", () => {
  const gate = section(read("SKILL.md"), "### 5-1.");
  assert.match(gate, /DESIGN\.md` 전체, `PRODUCT\.md`, 최신 experience·layout·direction/);
  assert.match(gate, /판정한 계층이/);
});

test("reference-only steps read named sections without the module body", () => {
  const skill = read("SKILL.md");
  assert.match(skill, /참조 하나만 쓰는\s*단계\(2-4, 2-5\)는 본문에 적힌 절만 읽고/);
  assert.match(section(skill, "### 2-4."), /`1\. 페이지 유형 게이트`/);
  assert.match(section(skill, "### 2-5."), /`공통 문법`/);
});

test("PRODUCT.md is linked, validated, and uses exactly three source labels", () => {
  const skill = read("SKILL.md");
  assert.match(skill, /references\/product-md-guide\.md/);
  assert.match(section(skill, "### 4-4."), /--product PRODUCT\.md/);
  const guide = read("references", "product-md-guide.md");
  for (const label of ["`사용자`", "`AI 권장`", "`미결`"]) {
    assert.ok(guide.includes(label), `product-md-guide is missing ${label}`);
  }
  assert.match(guide, /60줄을 넘기지 않습니다/);
});
