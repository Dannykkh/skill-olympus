const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const recipesDir = path.join(repoRoot, "skills", "frontend-design", "references", "style-recipes");
const read = (name) => fs.readFileSync(path.join(recipesDir, name), "utf8");

// Pretendard 가변 CSS가 정의하는 family는 "Pretendard Variable" 하나뿐이다.
// 스택에 "Pretendard"만 쓰면 로컬 미설치 기기에서 한글이 시스템 고딕으로 대체된다
// (2026-10-18 실측: 같은 문장 446.8px = 맑은 고딕, 389.3px = Pretendard Variable — arch 082).
const VARIABLE_CSS = /pretendardvariable[\w.-]*\.css/i;
// 스택 항목으로 쓴 Pretendard: CSS 표기 "Pretendard" 또는 YAML 표기 Pretendard,
// 앞이 따옴표여도 잡아야 한다 — fontFamily: "Pretendard, sans-serif" 형태를 놓친 적이 있다.
const STACK_ITEM = /"Pretendard"|(?<![\w-])Pretendard,/g;

function staleStackItems(text) {
  const stale = [];
  text.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(STACK_ITEM)) {
      const end = match.index + match[0].length;
      // `"Pretendard"`처럼 이름 하나만 인용한 것은 함정을 설명하는 문장이지 스택이 아니다
      if (line[match.index - 1] === "`" && line[end] === "`") continue;
      // 바로 앞에 Pretendard Variable이 있으면 정적 Pretendard 로컬 설치용 대체로 본다
      if (!/Pretendard Variable"?, $/.test(line.slice(0, match.index))) {
        stale.push(`${index + 1}: ${line.trim()}`);
      }
    }
  });
  return stale;
}

test("the stack check flags a bare Pretendard and accepts Pretendard Variable before it", () => {
  for (const line of [
    '| Body | `"DM Sans", "Pretendard", sans-serif` |',
    '| Body | `"Pretendard", sans-serif` |',
    '  body-md: { fontFamily: "Pretendard, sans-serif", fontSize: 1rem }',
    '  h1: { fontFamily: "Space Grotesk, Pretendard, sans-serif" }',
  ]) {
    assert.equal(staleStackItems(line).length, 1, line);
  }
  for (const line of [
    '| Body | `"DM Sans", "Pretendard Variable", "Pretendard", sans-serif` |',
    '  body-md: { fontFamily: "Pretendard Variable, Pretendard, sans-serif", fontSize: 1rem }',
    '  h1: { fontFamily: "Space Grotesk, Pretendard Variable, Pretendard, sans-serif" }',
    '--ct-font: "Pretendard GOV", system-ui, sans-serif; family `"Pretendard GOV"`',
    "| Body | ... | 라틴은 DM Sans, 한글은 Pretendard |",
    '가변 CSS가 정의하는 이름은 `"Pretendard Variable"` 하나뿐이다. `"Pretendard"`만 적으면',
  ]) {
    assert.deepEqual(staleStackItems(line), [], line);
  }
});

const variableRecipes = fs.readdirSync(recipesDir)
  .filter((name) => name.endsWith(".md") && name !== "index.md")
  .filter((name) => VARIABLE_CSS.test(read(name)));

// 필터가 아무것도 못 찾으면 아래 반복이 통째로 사라져 가드가 공짜로 통과한다
test("recipes that load the Pretendard variable CSS are found", () => {
  assert.ok(variableRecipes.length > 0, `no recipe in ${recipesDir} loads pretendardvariable*.css`);
});

for (const name of variableRecipes) {
  test(`${name} names the "Pretendard Variable" family in its font stacks`, () => {
    const stale = staleStackItems(read(name));
    assert.deepEqual(stale, [], `가변 CSS의 family는 "Pretendard Variable"이다 — 앞에 붙일 것:\n${stale.join("\n")}`);
  });
}
