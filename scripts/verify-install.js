#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { load, read } = require("./install-state");
const repoRoot = path.resolve(__dirname, "..");
const normalize = (value) => String(value || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();

function outsideBlock(text, marker) {
  let result = normalize(text);
  for (const name of marker === "ANTIGRAVITY-MNEMO" ? [marker, "GEMINI-MNEMO"] : [marker]) {
    result = result.replace(new RegExp(`<!-- ${name}:START -->[\\s\\S]*?<!-- ${name}:END -->`, "g"), "");
  }
  return result.trim().replace(/\n{3,}/g, "\n\n");
}

function verifyRule(record, before, current, template) {
  const actual = normalize(current);
  if (!record.marker) {
    if (actual !== normalize(template)) throw new Error(`${record.id}: template differs`);
    return;
  }
  const start = `<!-- ${record.marker}:START -->`;
  const end = `<!-- ${record.marker}:END -->`;
  if (actual.split(start).length !== 2 || actual.split(end).length !== 2 || actual.indexOf(start) > actual.indexOf(end)) {
    throw new Error(`${record.id}: expected exactly one ordered marker pair`);
  }
  if (normalize(actual.slice(actual.indexOf(start) + start.length, actual.indexOf(end))) !== normalize(template)) {
    throw new Error(`${record.id}: managed block differs from template`);
  }
  if (record.marker === "ANTIGRAVITY-MNEMO" && /<!-- GEMINI-MNEMO:(START|END) -->/.test(actual)) {
    throw new Error(`${record.id}: legacy managed block remains`);
  }
  // New files can include an adapter-owned heading. Existing personal content
  // must survive, including edits on either side of a replaced block.
  if (before !== null && outsideBlock(before, record.marker) !== outsideBlock(actual, record.marker)) {
    throw new Error(`${record.id}: personal content outside the block changed`);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 30000, windowsHide: true, ...options });
  if (result.error || result.status !== 0) throw new Error(`${path.basename(command)} ${path.basename(args[0] || "")}: ${result.error?.message || `exit ${result.status}: ${result.stderr || result.stdout}`}`);
  return result;
}

function hookFiles(runtime, roots) {
  const suffix = process.platform === "win32" ? "ps1" : "sh";
  if (runtime === "claude") return ["save-conversation", "save-response"].map((name) => ({
    source: `hooks/${name}.${suffix}`, installed: path.join(roots.claude, "hooks", `${name}.${suffix}`),
  }));
  if (runtime === "antigravity") return [{ source: "skills/antigravity-mnemo/hooks/save-turn.js", installed: path.join(roots.antigravity, "config/hooks/olympus-save-turn.js") }];
  if (runtime === "codex") return [{ source: `skills/codex-mnemo/hooks/save-turn.${suffix}`, installed: path.join(roots.codex, "hooks", `save-turn.${suffix}`) }];
  return [
    { source: `skills/grok-mnemo/hooks/save-turn.${suffix}`, installed: path.join(roots.grok, "hooks", `grok-mnemo-save-turn.${suffix}`) },
    { source: "skills/grok-mnemo/hooks/append-event.js", installed: path.join(roots.grok, "hooks/grok-mnemo-append-event.js") },
  ];
}

function smoke(runtime, roots, parent) {
  // Save hooks deliberately ignore OS temporary trees. Report this boundary
  // when the installer itself is running with an isolated temporary home.
  const relative = path.relative(os.tmpdir(), parent);
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    return { status: "NOT RUN", reason: "temporary home is excluded by save hooks" };
  }
  if (/^(1|true|yes)$/i.test(process.env.MNEMO_DISABLE || "")) return { status: "NOT RUN", reason: "MNEMO_DISABLE is enabled" };
  const root = fs.mkdtempSync(path.join(parent, `hook-probe-${runtime}-`));
  try {
    run("git", ["init", "--quiet", root]);
    const session = `olympus-install-check-${crypto.randomUUID()}`;
    const prompt = `installation probe ${session} 한국어 검증 <private>probe-secret</private>`;
    const response = `installation reply ${session} 한국어 응답 <private>probe-secret</private>`;
    const env = { ...process.env, MNEMO_STRICT: "1", CODEX_HOME: roots.codex, ANTIGRAVITY_HOME: roots.antigravity, GROK_HOME: roots.grok };
    delete env.GROK_HOOK_EVENT;
    const files = hookFiles(runtime, roots);
    function invoke(file, payload, disabled = false) {
      const args = file.endsWith(".ps1") ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", file] : [file];
      const command = file.endsWith(".ps1") ? "powershell.exe" : file.endsWith(".sh") ? "bash" : process.execPath;
      return run(command, args, { cwd: root, env: { ...env, ...(disabled ? { MNEMO_DISABLE: "1" } : {}) }, input: JSON.stringify(payload) });
    }
    let payload, replayFile = files[0].installed;
    if (runtime === "claude") {
      const transcript = path.join(root, "probe-transcript.jsonl");
      fs.writeFileSync(transcript, JSON.stringify({ type: "assistant", cwd: root, uuid: session, message: { content: [{ type: "text", text: response }] } }) + "\n");
      payload = { cwd: root, session_id: session, transcript_path: transcript, prompt };
      invoke(files[0].installed, payload);
      replayFile = files[1].installed;
      invoke(replayFile, payload);
    } else if (runtime === "grok") {
      invoke(replayFile, { hookEventName: "user_prompt_submit", workspaceRoot: root, cwd: root, sessionId: session, prompt });
      payload = { hookEventName: "stop", reason: "end_turn", workspaceRoot: root, cwd: root, sessionId: session, lastAssistantMessage: response };
      invoke(replayFile, payload);
    } else {
      payload = runtime === "codex"
        ? { type: "agent-turn-complete", cwd: root, "thread-id": session, "turn-id": session, "input-messages": [prompt], "last-assistant-message": response }
        : { cwd: root, workspacePath: root, conversationId: session, prompt, promptResponse: response };
      invoke(replayFile, payload);
    }
    const conversation = () => {
      const dir = path.join(root, "conversations");
      return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith(`-${runtime}.md`)).sort().map((name) => fs.readFileSync(path.join(dir, name), "utf8")).join("\n") : "";
    };
    const saved = conversation();
    if (!saved.includes(`installation probe ${session} 한국어 검증`) || !saved.includes(`installation reply ${session} 한국어 응답`) || saved.includes("probe-secret") || !saved.includes("[PRIVATE]")) throw new Error(`${runtime}: save/Unicode/redaction probe failed`);
    if (!fs.existsSync(path.join(root, "MEMORY.md"))) throw new Error(`${runtime}: memory scaffold missing`);
    invoke(replayFile, payload);
    if (conversation() !== saved) throw new Error(`${runtime}: replay appended a duplicate`);
    const disabledPayload = JSON.parse(JSON.stringify(payload).replaceAll(session, `${session}-disabled`));
    invoke(replayFile, disabledPayload, true);
    if (conversation() !== saved) throw new Error(`${runtime}: MNEMO_DISABLE probe saved content`);
    return { status: "PASS", checks: ["user and assistant saved", "private redaction", "memory scaffold", "replay deduplication", "MNEMO_DISABLE"] };
  } finally {
    // Only this invocation's newly created fixture is removed.
    if (path.dirname(path.resolve(root)) !== path.resolve(parent) || !path.basename(root).startsWith(`hook-probe-${runtime}-`)) throw new Error("invalid probe cleanup path");
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function verify(manifestPath) {
  if (manifestPath === "-") return { status: "NOT RUN", reason: "selection has no Mnemo surface", checks: [] };
  const state = load(manifestPath);
  if (state.status !== "installed") throw new Error("snapshot must be finalized before verification");
  const parent = path.dirname(manifestPath);
  const results = [];
  function check(name, action) {
    try { results.push({ name, ...action() }); }
    catch (error) { results.push({ name, status: "FAIL", reason: error.message }); }
    console.log(`[verify-install] ${results.at(-1).status} ${name}${results.at(-1).reason ? `: ${results.at(-1).reason}` : ""}`);
  }
  for (const record of state.files.filter((file) => file.template)) check(record.id, () => {
    verifyRule(record, record.before === null ? null : read(path.join(parent, `${record.id}.before`)), read(record.path), fs.readFileSync(path.join(repoRoot, record.template), "utf8"));
    return { status: "PASS" };
  });
  const runtimes = new Set(state.selected.filter((runtime) => ["claude", "codex", "antigravity"].includes(runtime)));
  if (state.files.some((file) => file.id === "grok-rules")) runtimes.add("grok");
  const env = { ...process.env, CODEX_HOME: state.roots.codex, ANTIGRAVITY_HOME: state.roots.antigravity, GROK_HOME: state.roots.grok };
  for (const runtime of runtimes) {
    check(`${runtime} registration and hook files`, () => {
      const skill = runtime === "claude" ? "mnemo" : `${runtime}-mnemo`;
      run(process.execPath, [path.join(repoRoot, "skills", skill, "install.js"), "--check"], { cwd: repoRoot, env });
      for (const file of hookFiles(runtime, state.roots)) {
        if (!read(file.installed)?.equals(fs.readFileSync(path.join(repoRoot, file.source)))) throw new Error(`installed hook differs: ${file.installed}`);
      }
      return { status: "PASS" };
    });
    check(`${runtime} installed hook execution`, () => smoke(runtime, state.roots, parent));
  }
  if (state.selected.includes("grok") && !runtimes.has("grok")) check("grok", () => ({ status: "NOT RUN", reason: "Grok home is absent; adapter was skipped" }));
  const report = { status: results.some((entry) => entry.status === "FAIL") ? "FAIL" : "PASS", created: new Date().toISOString(), checks: results };
  fs.writeFileSync(path.join(parent, "verification.json"), JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  return report;
}

if (require.main === module) {
  try {
    const report = verify(process.argv[2]);
    console.log(`[verify-install] ${report.status}; ${report.checks.length} checks`);
    if (report.status === "FAIL") process.exitCode = 1;
  } catch (error) { console.error(`[verify-install] FAIL: ${error.message}`); process.exitCode = 1; }
}
module.exports = { verifyRule, outsideBlock, hookFiles, smoke, verify };
