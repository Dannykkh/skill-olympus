const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { begin, finish, restore, load } = require("../install-state");
const { verifyRule } = require("../verify-install");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "olympus-install-state-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const roots = Object.fromEntries(["claude", "codex", "antigravity", "grok"].map((runtime) => [runtime, path.join(root, runtime)]));
  fs.mkdirSync(roots.codex);
  const config = path.join(roots.codex, "config.toml");
  const rules = path.join(roots.codex, "AGENTS.md");
  fs.writeFileSync(config, 'notify = ["my-notifier"]\r\nmodel = "personal-model"\r\n');
  fs.writeFileSync(rules, "personal rule\r\n");
  return { root, roots, config, rules, options: { roots, backupRoot: path.join(root, "backups") } };
}

test("install snapshot previews without writes and restores exact bytes, including absent files", (t) => {
  const f = fixture(t);
  const original = fs.readFileSync(f.config);
  const snapshot = begin(["codex"], f.options);
  const wrapper = path.join(f.roots.codex, "hooks/codex-mnemo-notify-wrapper.ps1");
  fs.mkdirSync(path.dirname(wrapper));
  fs.writeFileSync(wrapper, "installed wrapper");
  fs.writeFileSync(f.config, "installed notify and MCP configuration");
  finish(snapshot);
  assert.equal(restore(snapshot).find((item) => item.id === "codex-config").action, "restore");
  assert.equal(fs.readFileSync(f.config, "utf8"), "installed notify and MCP configuration");
  restore(snapshot, true);
  assert.deepEqual(fs.readFileSync(f.config), original);
  assert.equal(fs.existsSync(wrapper), false);
  assert.ok(restore(snapshot, true).every((entry) => entry.action === "unchanged"));
});

test("one later personal edit blocks the entire restore before any mutation", (t) => {
  const f = fixture(t);
  const snapshot = begin(["codex"], f.options);
  fs.writeFileSync(f.config, "new notify");
  fs.writeFileSync(f.rules, "new managed rules");
  finish(snapshot);
  fs.appendFileSync(f.rules, "\nlater personal preference");
  assert.throws(() => restore(snapshot, true), /later changes preserved.*codex-rules/);
  assert.equal(fs.readFileSync(f.config, "utf8"), "new notify");
  assert.match(fs.readFileSync(f.rules, "utf8"), /later personal preference/);
});

test("snapshots reject unfinished installs, damaged backups, and unexpected target paths", (t) => {
  const f = fixture(t);
  const snapshot = begin(["codex"], f.options);
  assert.throws(() => restore(snapshot, true), /did not finish/);
  finish(snapshot);
  const state = load(snapshot);
  state.files[0].path = path.join(f.root, "unrelated-file");
  fs.writeFileSync(snapshot, JSON.stringify(state));
  assert.throws(() => restore(snapshot, true), /invalid snapshot target/);
  state.files[0].path = f.rules;
  fs.writeFileSync(snapshot, JSON.stringify(state));
  fs.appendFileSync(path.join(path.dirname(snapshot), "codex-config.before"), "damaged");
  assert.throws(() => restore(snapshot, true), /damaged backup/);
});

test("each reinstall creates an independent snapshot of its immediate predecessor", (t) => {
  const f = fixture(t);
  const first = begin(["codex"], f.options);
  fs.writeFileSync(f.config, "first install");
  finish(first);
  const second = begin(["codex"], f.options);
  fs.writeFileSync(f.config, "second install");
  finish(second);
  assert.notEqual(first, second);
  restore(second, true);
  assert.equal(fs.readFileSync(f.config, "utf8"), "first install");
  restore(first, true);
  assert.match(fs.readFileSync(f.config, "utf8"), /my-notifier/);
});

test("rule verification detects stale content, duplicate markers, and lost personal rules", () => {
  const record = { id: "codex-rules", marker: "CODEX-MNEMO" };
  const block = (text) => `<!-- CODEX-MNEMO:START -->\n${text}\n<!-- CODEX-MNEMO:END -->`;
  const before = `personal first\n${block("old")}\npersonal last`;
  const after = `personal first\n${block("current")}\npersonal last`;
  assert.doesNotThrow(() => verifyRule(record, before, after, "current"));
  assert.throws(() => verifyRule(record, before, before, "current"), /differs/);
  assert.throws(() => verifyRule(record, before, after + block("current"), "current"), /exactly one/);
  assert.throws(() => verifyRule(record, before, block("current"), "current"), /personal content/);
});

test("rule verification accepts intentional legacy migration and full-file Grok rules", () => {
  const before = "personal\n<!-- GEMINI-MNEMO:START -->old<!-- GEMINI-MNEMO:END -->";
  const after = "personal\n<!-- ANTIGRAVITY-MNEMO:START -->current<!-- ANTIGRAVITY-MNEMO:END -->";
  assert.doesNotThrow(() => verifyRule({ id: "antigravity-rules", marker: "ANTIGRAVITY-MNEMO" }, before, after, "current"));
  assert.doesNotThrow(() => verifyRule({ id: "grok-rules", marker: null }, "old", "current\r\n", "current"));
  assert.throws(() => verifyRule({ id: "grok-rules", marker: null }, "old", "stale", "current"), /differs/);
});
