const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pruneStaleAssets } = require("../prune-stale-assets");

const repoRoot = path.resolve(__dirname, "..", "..");
const installBat = path.join(repoRoot, "install.bat");

test("codex-only install.bat succeeds without a preexisting .claude directory", () => {
  if (process.platform !== "win32") {
    test.skip("Windows-only installer test");
    return;
  }

  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-install-test-"));
  const env = {
    ...process.env,
    HOME: tempHome,
    USERPROFILE: tempHome,
  };

  const command = "echo.| call install.bat --llm codex";
  const result = spawnSync("cmd.exe", ["/d", "/c", command], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    timeout: 120000,
  });

  assert.equal(
    result.status,
    0,
    `install.bat failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  assert.equal(
    fs.existsSync(path.join(tempHome, ".codex", "hooks", "save-turn.ps1")),
    true,
    "Codex save-turn hook was not installed",
  );

  const agentsMd = fs.readFileSync(
    path.join(tempHome, ".codex", "AGENTS.md"),
    "utf8",
  );
  assert.match(
    agentsMd,
    /\/agent-team`, `\/poseidon`, `포세이돈`, `poseidon` → `agent-team-codex`/,
    "Codex agent-team alias did not resolve to agent-team-codex",
  );
});

test("stale Olympus assets are moved to backup while local-only assets remain", () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-prune-test-"));
  fs.mkdirSync(path.join(tempHome, "agents"), { recursive: true });
  fs.mkdirSync(path.join(tempHome, "skills", "pmworker"), { recursive: true });
  fs.mkdirSync(path.join(tempHome, "skills", "deploy-server"), { recursive: true });

  fs.writeFileSync(path.join(tempHome, "agents", "code-review-checklist.md"), "stale");
  fs.writeFileSync(path.join(tempHome, "agents", "custom-agent.md"), "custom");
  fs.writeFileSync(path.join(tempHome, "skills", "pmworker", "SKILL.md"), "stale");
  fs.writeFileSync(path.join(tempHome, "skills", "deploy-server", "SKILL.md"), "keep");

  const result = pruneStaleAssets(tempHome, {
    now: new Date(2026, 3, 27, 10, 11, 12),
  });

  assert.equal(result.moved.length, 2);
  assert.equal(fs.existsSync(path.join(tempHome, "agents", "code-review-checklist.md")), false);
  assert.equal(fs.existsSync(path.join(tempHome, "skills", "pmworker")), false);
  assert.equal(fs.existsSync(path.join(tempHome, "agents", "custom-agent.md")), true);
  assert.equal(fs.existsSync(path.join(tempHome, "skills", "deploy-server", "SKILL.md")), true);
  assert.equal(
    fs.existsSync(path.join(tempHome, "_pruned-stale-olympus", "20260427-101112", "agents", "code-review-checklist.md")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(tempHome, "_pruned-stale-olympus", "20260427-101112", "skills", "pmworker", "SKILL.md")),
    true,
  );
});
