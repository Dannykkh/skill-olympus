// 아프로디테가 k-style-ui-ux에서 옮긴 한국 모바일 앱 규칙(skills/design-plan/references/korean-mobile-app.md)의
// 출처 고지·소비 지점·업스트림 잔재를 지키는 정적 테스트. 검증기 동작은 Python 테스트가 맡는다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const skillDir = path.join(repoRoot, "skills", "design-plan");
const read = (...parts) => fs.readFileSync(path.join(skillDir, ...parts), "utf8");

test("korean mobile app rules keep the upstream MIT notice and source pin", () => {
  const license = read("references", "LICENSE-k-style-ui-ux.txt");
  assert.match(license, /^MIT License/);
  assert.match(license, /Copyright \(c\) 2026 VIBE MAFIA CLUB/);

  const guide = read("references", "korean-mobile-app.md");
  assert.match(guide, /vmc-inner-circle\/k-style-ui-ux/);
  assert.match(guide, /v0\.18\.1/);
  assert.match(guide, /e8a9616/);
  assert.match(guide, /LICENSE-k-style-ui-ux\.txt/);
});

test("design-plan reads the korean mobile app rules at fixed phases", () => {
  // 문서가 있는 것과 읽히는 것은 다르다(arch 023). 단계마다 연결이 남아 있는지 본다.
  const skill = read("SKILL.md");
  const links = skill.match(/references\/korean-mobile-app\.md/g) || [];
  assert.ok(links.length >= 8, `expected links at each phase, found ${links.length}`);
  for (const phase of ["### 1-1.", "### 2-1.", "### 2-5.", "### 5-1.", "### 6-2.", "### 6-3."]) {
    const start = skill.indexOf(phase);
    assert.notEqual(start, -1, `missing ${phase}`);
    const end = skill.indexOf("\n### ", start + phase.length);
    const body = skill.slice(start, end === -1 ? undefined : end);
    assert.match(body, /korean-mobile-app\.md/, `${phase} does not link the rules`);
  }
  const evidence = skill.slice(skill.indexOf("## Completion Evidence"), skill.indexOf("## Options"));
  assert.match(evidence, /Object Flows/);

  const contract = read("references", "experience-contract-guide.md");
  assert.match(contract, /^## Object Flows$/m);
  assert.match(contract, /^## Scenario Facts$/m);
  assert.match(contract, /korean-mobile-app\.md/);
});

test("korean mobile app rules carry no upstream plugin paths or tool runs", () => {
  // 업스트림 플러그인의 경로·매니페스트·클래스가 남으면 없는 파일을 찾게 된다(gotcha 117).
  const guide = read("references", "korean-mobile-app.md");
  for (const leftover of [/\$SK\b/, /screens\.json/, /conventions\.json/, /decisions\.json/, /journey\.md/, /\bis-brand\b/, /data-anchor/, /COMPONENTS\.md/]) {
    assert.doesNotMatch(guide, leftover);
  }
  // 가져오지 않은 스크립트는 이름만 적고 실행 명령으로 쓰지 않는다.
  assert.doesNotMatch(guide, /python3?\s+\S*(imgsearch|fetch_refs|market|save_prd|audit|selfcheck)\.py/);
});
