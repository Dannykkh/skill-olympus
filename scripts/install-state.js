#!/usr/bin/env node
"use strict";

// The integrated installer owns these file snapshots. Runtime adapters remain
// independently installable; restoring is an explicit, conflict-checked action.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const digest = (data) => data === null ? null : crypto.createHash("sha256").update(data).digest("hex");
function read(file) {
  try {
    if (!fs.lstatSync(file).isFile()) throw new Error(`not a regular file: ${file}`);
    return fs.readFileSync(file);
  } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
function atomicWrite(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, data, { flag: "wx", mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function homes() {
  return {
    claude: path.join(os.homedir(), ".claude"),
    codex: path.resolve(process.env.CODEX_HOME || path.join(os.homedir(), ".codex")),
    antigravity: path.resolve(process.env.ANTIGRAVITY_HOME || path.join(os.homedir(), ".gemini")),
    grok: path.resolve(process.env.GROK_HOME || path.join(os.homedir(), ".grok")),
  };
}
function surfaces(selected, roots = homes()) {
  const targets = new Set(selected);
  // The existing integrated installer also updates Grok compatibility when its
  // default home already exists, even when another target was selected.
  if (fs.existsSync(path.join(os.homedir(), ".grok"))) targets.add("grok");
  const grokInstalled = targets.has("grok") && fs.existsSync(roots.grok);
  const records = [];
  const rule = (runtime, relative, marker, skill, template) => records.push({
    id: `${runtime}-rules`, runtime, path: path.join(roots[runtime], relative), marker,
    template: `skills/${skill}/templates/${template}`,
  });
  if (targets.has("claude") || grokInstalled) rule("claude", "CLAUDE.md", "MNEMO", "mnemo", "claude-md-rules.md");
  if (targets.has("codex")) {
    rule("codex", "AGENTS.md", "CODEX-MNEMO", "codex-mnemo", "agents-md-rules.md");
    records.push({ id: "codex-config", runtime: "codex", path: path.join(roots.codex, "config.toml") });
    for (const suffix of ["ps1", "sh"]) records.push({ id: `codex-wrapper-${suffix}`, runtime: "codex", path: path.join(roots.codex, "hooks", `codex-mnemo-notify-wrapper.${suffix}`) });
  }
  if (targets.has("antigravity")) rule("antigravity", "GEMINI.md", "ANTIGRAVITY-MNEMO", "antigravity-mnemo", "gemini-md-rules.md");
  if (grokInstalled) rule("grok", "rules/grok-mnemo.md", null, "grok-mnemo", "grok-rules.md");
  return records;
}
function save(manifestPath, state) { atomicWrite(manifestPath, JSON.stringify(state, null, 2) + "\n"); }
function load(manifestPath) {
  const state = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (state.version !== 1 || !Array.isArray(state.files) || !state.roots) throw new Error("invalid install snapshot");
  const allowed = new Map(surfaces(["claude", "codex", "antigravity", "grok"], state.roots).map((record) => [record.id, record.path]));
  // Grok's home may have been removed after backup; its one rules path is still valid.
  allowed.set("grok-rules", path.join(state.roots.grok, "rules/grok-mnemo.md"));
  for (const record of state.files) {
    if (allowed.get(record.id) !== record.path) throw new Error(`invalid snapshot target: ${record.id}`);
    if (record.before !== null && digest(read(path.join(path.dirname(manifestPath), `${record.id}.before`))) !== record.before) throw new Error(`damaged backup: ${record.id}`);
  }
  return state;
}
function begin(selected, options = {}) {
  const roots = options.roots || homes();
  const files = surfaces(selected, roots);
  if (!files.length) return "-";
  const backupRoot = options.backupRoot || path.join(os.homedir(), ".olympus", "install-backups");
  fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
  const dir = fs.mkdtempSync(path.join(backupRoot, `${new Date().toISOString().replace(/[:.]/g, "-")}-`));
  for (const record of files) {
    const data = read(record.path);
    record.before = digest(data);
    if (data !== null) fs.writeFileSync(path.join(dir, `${record.id}.before`), data, { flag: "wx", mode: 0o600 });
  }
  const manifestPath = path.join(dir, "manifest.json");
  save(manifestPath, { version: 1, created: new Date().toISOString(), selected, roots, files, status: "prepared" });
  return manifestPath;
}
function finish(manifestPath) {
  if (manifestPath === "-") return;
  const state = load(manifestPath);
  if (state.status !== "prepared") throw new Error("snapshot was already finalized");
  for (const record of state.files) record.after = digest(read(record.path));
  state.status = "installed";
  save(manifestPath, state);
}
function restore(manifestPath, apply = false) {
  const state = load(manifestPath);
  if (state.status !== "installed" && state.status !== "restored") throw new Error("installation did not finish; inspect the saved .before files for manual recovery");
  const plan = state.files.map((record) => {
    const current = digest(read(record.path));
    return { ...record, action: current === record.before ? "unchanged" : current === record.after ? "restore" : "conflict" };
  });
  // Check every target before the first write. Never force over later user edits.
  if (plan.some((record) => record.action === "conflict")) throw new Error(`later changes preserved; restore conflicts: ${plan.filter((record) => record.action === "conflict").map((record) => record.id).join(", ")}`);
  if (apply) {
    const changed = plan.filter((record) => record.action === "restore");
    const rollback = new Map(changed.map((record) => [record.path, read(record.path)]));
    try {
      for (const record of changed) {
        // Re-check immediately before mutation, including concurrent edits.
        if (digest(read(record.path)) !== record.after) throw new Error(`concurrent change: ${record.id}`);
        if (record.before === null) fs.unlinkSync(record.path);
        else atomicWrite(record.path, read(path.join(path.dirname(manifestPath), `${record.id}.before`)));
      }
    } catch (error) {
      for (const record of changed) {
        if (digest(read(record.path)) !== record.before) continue;
        const original = rollback.get(record.path);
        if (original === null) { if (fs.existsSync(record.path)) fs.unlinkSync(record.path); }
        else atomicWrite(record.path, original);
      }
      throw error;
    }
    state.status = "restored";
    save(manifestPath, state);
  }
  return plan.map(({ id, action }) => ({ id, action }));
}
if (require.main === module) {
  try {
    const [command, argument, ...flags] = process.argv.slice(2);
    if (command === "begin") console.log(begin((argument || "").split(",").filter(Boolean)));
    else if (command === "finish") finish(argument);
    else if (command === "restore") console.log(JSON.stringify({ applied: flags.includes("--apply"), files: restore(argument, flags.includes("--apply")) }, null, 2));
    else throw new Error("usage: install-state.js begin <cli,cli> | finish <manifest> | restore <manifest> [--apply]");
  } catch (error) { console.error(`[install-state] ${error.message}`); process.exitCode = 1; }
}
module.exports = { homes, surfaces, begin, finish, restore, load, read, digest };
