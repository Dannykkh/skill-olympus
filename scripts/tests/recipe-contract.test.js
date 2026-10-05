const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const lib = require(path.join(repoRoot, "skills", "recipe", "scripts", "recipe-lib.js"));

// 라이브러리는 os.tmpdir() 아래에만 만들고 끝나면 지운다 (gotcha 076·078).
function tempLibrary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "recipe-lib-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return lib.initLibrary(root);
}

function writeRecipe(root, kind, id, { header = {}, drop = [], sample = {} } = {}) {
  const dir = path.join(root, kind, id);
  fs.mkdirSync(dir, { recursive: true });
  const fields = {
    id,
    kind,
    title: "테스트 레시피",
    tags: "modal, popup, 팝업",
    version: "1",
    updated: "2026-10-05",
    source: "demo-app @ abc1234 — src/Modal.tsx",
    reuse: "personal",
    when: "확인이 필요한 작업 전에 사용자에게 묻는 팝업",
    ...header,
  };
  const body = lib.REQUIRED_SECTIONS.filter((section) => !drop.includes(section))
    .map((section) => `## ${section}\n\n${section === "견본" ? "검증: 브라우저 렌더 → 콘솔 에러 0 (2026-10-05)" : "내용"}\n`)
    .join("\n");
  const head = Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n");
  fs.writeFileSync(path.join(dir, "recipe.md"), `---\n${head}\n---\n\n# 테스트\n\n${body}`);
  for (const [name, content] of Object.entries(sample)) {
    fs.mkdirSync(path.dirname(path.join(dir, "sample", name)), { recursive: true });
    fs.writeFileSync(path.join(dir, "sample", name), content);
  }
  return dir;
}

test("library location comes from CODE_RECIPES_DIR, else ~/code-recipes", () => {
  assert.equal(lib.libraryRoot({ CODE_RECIPES_DIR: path.join(os.tmpdir(), "x") }), path.join(os.tmpdir(), "x"));
  assert.equal(lib.libraryRoot({}), path.join(os.homedir(), "code-recipes"));
});

test("a complete ui recipe passes check, lands in index.md and is searchable", (t) => {
  const root = tempLibrary(t);
  const dir = writeRecipe(root, "ui", "confirm-modal", { sample: { "preview.html": "<!doctype html><title>x</title>" } });
  assert.deepEqual(lib.checkRecipe(dir), { errors: [], warnings: [] });
  assert.equal(lib.buildIndex(root), 1);
  const index = fs.readFileSync(path.join(root, "index.md"), "utf8");
  assert.match(index, /\| `confirm-modal` \| ui \| 테스트 레시피 \|/);
  assert.equal(lib.searchIndex(root, ["팝업", "MODAL"]).length, 1);
  assert.equal(lib.searchIndex(root, ["backend"]).length, 0);
});

test("check rejects missing sections, missing samples, mismatched ids and secret-shaped values", (t) => {
  const root = tempLibrary(t);
  const fakeAwsKey = `AKIA${"Q".repeat(16)}`;
  const dir = writeRecipe(root, "backend", "upload-flow", {
    header: { id: "other-id", reuse: "everyone" },
    drop: ["함정"],
    sample: { "upload.js": `const key = "${fakeAwsKey}";\n` },
  });
  const { errors } = lib.checkRecipe(dir);
  const text = errors.join("\n");
  assert.match(text, /섹션 없음: ## 함정/);
  assert.match(text, /backend 견본에는 테스트 파일/);
  assert.match(text, /id\(other-id\)와 폴더 이름\(upload-flow\)이 다름/);
  assert.match(text, /reuse는/);
  assert.match(text, /AWS 액세스 키/);
});

test("check warns about leftovers from the source project", (t) => {
  const root = tempLibrary(t);
  const dir = writeRecipe(root, "infra", "backup-script", {
    sample: { "run.sh": "cp /home/alice/project/db.sqlite backup/\n# contact: alice@acme-corp.co.kr, demo@example.com\n" },
  });
  const { errors, warnings } = lib.checkRecipe(dir);
  assert.deepEqual(errors, []);
  assert.match(warnings.join("\n"), /사용자 경로/);
  assert.match(warnings.join("\n"), /alice@acme-corp\.co\.kr/);
  assert.doesNotMatch(warnings.join("\n"), /demo@example\.com/);
});

test("the recipe skill keeps the library outside the repository and projects", () => {
  const skill = read("skills/recipe/SKILL.md");
  assert.match(skill, /CODE_RECIPES_DIR/);
  assert.match(skill, /~\/code-recipes/);
  assert.match(skill, /이 레포\(공개 저장소\)와 작업 중인 프로젝트 안/);
  assert.match(skill, /\*\*사용 범위\(`reuse`\)는 사용자에게 확인한다\*\*/);
  // Grok·Devin은 Claude 설치본의 이 파일을 공유하지만 작업자 생성은 각자의 도구로 한다.
  for (const role of ["Claude `general-purpose`", "Codex `worker`", "Gemini `generalist`", "Grok `general-purpose`", "`subagent_general`"]) {
    assert.ok(skill.includes(role), `recipe SKILL.md is missing the writer role ${role}`);
  }
  assert.match(read("skills/recipe/references/recipe-format.md"), /## 떼어내기/);
});

// 소비 쪽은 라이브러리를 읽기만 하고, 복사하지 않고 recipe: id@version으로 출처를 남긴다.
for (const file of [
  "skills/design-plan/SKILL.md",
  "skills/frontend-design/SKILL.md",
  "skills/zephermine/references/section-splitting.md",
  "skills/orchestrator/commands/workpm.md",
  "skills/orchestrator/commands/workpm-mcp.md",
]) {
  test(`${file} reads the recipe library and records provenance`, () => {
    const text = read(file);
    assert.match(text, /`\/recipe`|\/recipe —/);
    assert.match(text, /recipe: <id>@<version>/);
  });
}
