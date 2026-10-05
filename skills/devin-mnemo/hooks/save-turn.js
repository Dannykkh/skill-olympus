#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const rootHelper = path.join(__dirname, "mnemo-project-root.js");
const { resolveDevin } = require(fs.existsSync(rootHelper) ? rootHelper : path.join(__dirname, "../../../hooks/mnemo-project-root.js"));

const hash = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const redact = (value) => String(value || "").replace(/<private>[\s\S]*?<\/private>/gi, "[PRIVATE]").trim();
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function pythonCall(mode, sessionId, options = {}) {
  const script = path.join(__dirname, "read-assistant.py");
  for (const command of process.platform === "win32" ? ["python", "py", "python3"] : ["python3", "python"]) {
    const args = command === "py" ? ["-3", "-X", "utf8", script, mode, sessionId]
      : ["-X", "utf8", script, mode, sessionId];
    if (options.afterRow !== undefined) args.push("--after-row", String(options.afterRow));
    if (options.since !== undefined) args.push("--since", String(options.since));
    if (options.db) args.push("--db", options.db);
    const result = spawnSync(command, args, { encoding: "utf8", timeout: 2500, windowsHide: true });
    if (!result.error && result.status === 0) {
      try { return JSON.parse(result.stdout); } catch { /* A broken Python alias is not a usable reader. */ }
    }
  }
  return null;
}

async function withLock(lockPath, action) {
  const deadline = Date.now() + 5000;
  let handle;
  while (handle === undefined) {
    try {
      handle = fs.openSync(lockPath, "wx", 0o600);
      fs.writeFileSync(handle, String(process.pid));
    } catch (error) {
      if (error.code !== "EEXIST" || Date.now() >= deadline) throw error;
      try {
        const owner = Number(fs.readFileSync(lockPath, "utf8"));
        let stale = Date.now() - fs.statSync(lockPath).mtimeMs > 30000;
        if (Number.isSafeInteger(owner) && owner > 0) {
          try { process.kill(owner, 0); stale = false; }
          catch (probe) { stale = probe.code === "ESRCH"; }
        }
        if (stale) fs.unlinkSync(lockPath);
      } catch (probe) { if (probe.code !== "ENOENT") throw probe; }
      await pause(25);
    }
  }
  try { return await action(); }
  finally { fs.closeSync(handle); fs.unlinkSync(lockPath); }
}

function ensureScaffold(root) {
  const memory = path.join(root, "memory");
  fs.mkdirSync(memory, { recursive: true });
  for (const category of ["architecture", "learned", "gotchas"]) {
    const dir = path.join(memory, category);
    fs.mkdirSync(dir, { recursive: true });
    const categoryIndex = path.join(dir, "index.md");
    if (!fs.existsSync(categoryIndex)) fs.writeFileSync(categoryIndex, `# ${category}\n`, { flag: "wx", mode: 0o600 });
  }
  const index = path.join(root, "MEMORY.md");
  if (!fs.existsSync(index)) {
    fs.writeFileSync(index, "# MEMORY.md - 프로젝트 장기기억\n\n## 키워드 인덱스\n\n| 키워드 | 상세 파일 |\n|---|---|\n\n- [설계 결정](memory/architecture/index.md)\n- [학습](memory/learned/index.md)\n- [주의사항](memory/gotchas/index.md)\n", { flag: "wx", mode: 0o600 });
  }
}

function append(root, role, value, key, now = new Date()) {
  const text = redact(value);
  if (!text) return false;
  const dir = path.join(root, "conversations");
  fs.mkdirSync(dir, { recursive: true });
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = now.toTimeString().slice(0, 8);
  const file = path.join(dir, `${date}-devin.md`);
  const marker = `<!-- devin-event:${hash(key)} -->`;
  const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (old.includes(marker)) return false;
  if (!old) fs.writeFileSync(file, `---\ndate: ${date}\nproject: ${path.basename(root)}\nkeywords: []\nsummary: ""\n---\n\n# ${date}\n`, { flag: "wx", mode: 0o600 });
  fs.appendFileSync(file, `\n${marker}\n## [${time}] ${role}\n\n${text}\n`);
  return true;
}

async function saveEvent(payload, options = {}) {
  if (/^(1|true|yes)$/i.test(process.env.MNEMO_DISABLE || "")) return false;
  const event = payload.hook_event_name;
  if (!["UserPromptSubmit", "Stop", "SessionEnd"].includes(event)) return false;
  const sessionId = String(payload.session_id || "");
  if (!sessionId) return false;
  const root = options.root || resolveDevin(payload);
  if (!root) return false;
  const dir = path.join(root, "conversations");
  fs.mkdirSync(dir, { recursive: true });
  return withLock(path.join(dir, ".devin-events.lock"), async () => {
    const stateFile = path.join(dir, ".devin-events.json");
    const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : { version: 1, sessions: {} };
    if (state.version !== 1 || !state.sessions) throw new Error("unsupported Devin event index");
    const previous = state.sessions[sessionId] || {};
    let saved = false;
    if (event === "UserPromptSubmit") {
      const promptId = String(payload.prompt_id || "");
      if (!promptId || promptId === previous.promptId) return false;
      const baseline = pythonCall("baseline", sessionId, { db: options.db });
      saved = append(root, "User", payload.prompt, `${sessionId}:user:${promptId}`);
      state.sessions[sessionId] = { promptId, baseline: Number.isInteger(baseline) ? baseline : 0, submittedAt: Math.floor(Date.now() / 1000), assistantSaved: false };
    } else if (previous.promptId && !previous.assistantSaved) {
      let message = null;
      for (let attempt = 0; attempt < 3 && !message; attempt += 1) {
        message = pythonCall("assistant", sessionId, { afterRow: previous.baseline, since: previous.submittedAt, db: options.db });
        if (!message && attempt < 2) await pause(150);
      }
      if (message?.content) {
        saved = append(root, "Assistant", message.content, `${sessionId}:assistant:${previous.promptId}:${message.message_id || message.row_id}`);
        previous.assistantSaved = true;
      }
    }
    if (event === "UserPromptSubmit") ensureScaffold(root);
    const temp = `${stateFile}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temp, JSON.stringify(state), { flag: "wx", mode: 0o600 });
      fs.renameSync(temp, stateFile);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    return saved;
  });
}

if (require.main === module) {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { input += chunk; });
  process.stdin.on("end", () => {
    try { saveEvent(JSON.parse(input.replace(/^\uFEFF+/, ""))).catch((error) => { console.error(`[devin-mnemo] ${error.message}`); process.exitCode = 1; }); }
    catch (error) { console.error(`[devin-mnemo] ${error.message}`); process.exitCode = 1; }
  });
}

module.exports = { saveEvent };
