const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");

test("VERSION matches the newest CHANGELOG release", () => {
  const version = fs.readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
  const changelog = fs.readFileSync(path.join(repoRoot, "CHANGELOG.md"), "utf8");
  // 릴리즈는 VERSION과 CHANGELOG 맨 위 섹션을 함께 올린다 (scripts/bump_version.py)
  const newest = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);

  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.ok(newest, "CHANGELOG.md has no '## [x.y.z]' release heading");
  assert.equal(newest[1], version);
});

test("the repository ships no Claude plugin manifest", () => {
  // install.bat / install.sh가 유일한 설치 경로다. 플러그인으로 설치하면
  // skills/ 전체가 활성화되고 Mnemo 훅·MCP·규칙은 빠진다 (memory/architecture/093)
  for (const file of ["marketplace.json", "plugin.json"]) {
    assert.equal(
      fs.existsSync(path.join(repoRoot, ".claude-plugin", file)),
      false,
      `.claude-plugin/${file} should not exist`,
    );
  }
});
