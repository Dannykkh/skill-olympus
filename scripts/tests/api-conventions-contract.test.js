const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("the API conventions live in one place: zephermine api-spec-guide", () => {
  const guide = read("skills/zephermine/references/api-spec-guide.md");
  assert.match(guide, /## Conventions/);
  assert.match(guide, /모든 목록 API는 페이지네이션 필수/);
  assert.match(guide, /"error": "EMAIL_DUPLICATE"/);
});

test("zephermine section files carry the conventions into the Quality Gate", () => {
  const sections = read("skills/zephermine/references/section-splitting.md");
  assert.match(sections, /목록 API는 페이지네이션·크기 상한·정렬 허용 컬럼을 지킴/);
  assert.match(sections, /반복문 안에서 쿼리·API 호출 없음 \(N\+1\)/);
});

// 설계 없이 구현하는 다이달로스 경로는 젭마인 섹션 파일을 거치지 않으므로
// 규약 정본을 직접 가리키지 않으면 페이지네이션이 다시 빠진다.
for (const file of [
  "skills/orchestrator/commands/workpm.md",
  "skills/orchestrator/commands/workpm-mcp.md",
]) {
  test(`${file} fixes and reviews the API conventions`, () => {
    const text = read(file);
    assert.match(text, /\*\*API 규약 고정\*\*/);
    assert.match(text, /references\/api-spec-guide\.md`의 `## Conventions`/);
    assert.match(text, /\| API 규약 \(API 작업만\) \|/);
  });
}
