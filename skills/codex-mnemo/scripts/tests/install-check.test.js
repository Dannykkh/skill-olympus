"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const installScript = path.resolve(__dirname, "..", "..", "install.js");

function run(home, ...args) {
  return spawnSync(process.execPath, [installScript, ...args], {
    env: { ...process.env, CODEX_HOME: home },
    encoding: "utf8",
  });
}

test("--check detects active hook and reconcile parser drift", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "codex-mnemo-check-"));
  try {
    const installed = run(home);
    assert.equal(installed.status, 0, installed.stderr || installed.stdout);

    const healthy = run(home, "--check");
    assert.equal(healthy.status, 0, healthy.stderr || healthy.stdout);
    assert.match(healthy.stdout, /source parity/);

    const hook = path.join(home, "hooks", process.platform === "win32" ? "save-turn.ps1" : "save-turn.sh");
    fs.appendFileSync(hook, "\n# drift fixture\n", "utf8");
    const hookDrift = run(home, "--check");
    assert.equal(hookDrift.status, 1);
    assert.match(hookDrift.stdout, /DRIFT save-turn\.(?:ps1|sh)/);

    assert.equal(run(home).status, 0);
    const parser = path.join(home, "scripts", "reconcile_codex_conversations.py");
    fs.appendFileSync(parser, "\n# drift fixture\n", "utf8");
    const parserDrift = run(home, "--check");
    assert.equal(parserDrift.status, 1);
    assert.match(parserDrift.stdout, /DRIFT scripts\/reconcile_codex_conversations\.py/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
