#!/usr/bin/env node
"use strict";

// Shared persistence contract for the PowerShell and Bash hook adapters.
// stdout is consumed by the adapter, never forwarded to Grok's Stop parser.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const redact = (value) => String(value || "").replace(/<private>[\s\S]*?<\/private>/gi, "[PRIVATE]").trim();

async function appendEvent(root, payload, now = new Date()) {
  const event = payload.hookEventName;
  if (event !== "user_prompt_submit" && (event !== "stop" || payload.reason !== "end_turn")) return false;
  const role = event === "user_prompt_submit" ? "User" : "Assistant";
  const raw = role === "User" ? String(payload.prompt || "").replace(/^\s*<user_query>\s*([\s\S]*?)\s*<\/user_query>\s*$/, "$1") : payload.lastAssistantMessage;
  const text = redact(raw);
  if (text.length < (role === "User" ? 1 : 5)) return false;
  const dir = path.join(root, "conversations");
  fs.mkdirSync(dir, { recursive: true });
  const lockPath = path.join(dir, ".grok-events.lock");
  const deadline = Date.now() + 10000;
  let lock;
  while (lock === undefined) {
    try {
      lock = fs.openSync(lockPath, "wx", 0o600);
      fs.writeFileSync(lock, String(process.pid));
    }
    catch (error) {
      if (error.code !== "EEXIST" || Date.now() >= deadline) throw error;
      // A terminated hook must not leave every later turn locked out.
      try {
        const owner = fs.readFileSync(lockPath, "utf8");
        const pid = Number(owner);
        let abandoned = !owner && Date.now() - fs.statSync(lockPath).mtimeMs > 30000;
        if (Number.isSafeInteger(pid) && pid > 0) {
          try { process.kill(pid, 0); } catch (probe) { abandoned = probe.code === "ESRCH"; }
        }
        if (abandoned && fs.readFileSync(lockPath, "utf8") === owner) fs.unlinkSync(lockPath);
      } catch (probe) { if (probe.code !== "ENOENT") throw probe; }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  try {
    const statePath = path.join(dir, ".grok-events.json");
    const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : { version: 1, seen: {}, sessions: {} };
    if (state.version !== 1 || !state.seen || !state.sessions) throw new Error("unsupported Grok event index");
    const sessionId = String(payload.sessionId || payload.transcriptPath || "");
    const session = hash(sessionId || crypto.randomUUID());
    const previous = state.sessions[session] || { sequence: 0 };
    const textHash = hash(text);
    // These fields are optional. Do not assume every Grok version supplies IDs.
    const identityField = ["eventId", "messageId", "promptId", "turnId"].find((key) =>
      ["string", "number"].includes(typeof payload[key]) && String(payload[key]).length > 0);
    const repeatedPhase = previous.role === role && previous.textHash === textHash;
    const sequence = previous.sequence + (role === "User" && (identityField || !repeatedPhase) ? 1 : 0);
    const identity = identityField ? `${identityField}:${payload[identityField]}` : `phase:${sequence}:${textHash}`;
    const key = hash(`${session}\0${role}\0${identity}`);
    if (state.seen[key]) return false;
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const time = now.toTimeString().slice(0, 8);
    const file = path.join(dir, `${date}-grok.md`);
    const marker = `<!-- grok-event:${key} -->`;
    let existing = "";
    try { existing = fs.readFileSync(file, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (!existing) fs.writeFileSync(file, `---\ndate: ${date}\nproject: ${path.basename(root)}\nkeywords: []\nsummary: ""\n---\n\n# ${date}\n`, { mode: 0o600 });
    const saved = !existing.includes(marker);
    if (saved) fs.appendFileSync(file, `\n${marker}\n## [${time}] ${role}\n\n${text}\n`);
    state.seen[key] = true;
    state.sessions[session] = { sequence, role, textHash };
    const temp = `${statePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temp, JSON.stringify(state), { mode: 0o600, flag: "wx" });
      fs.renameSync(temp, statePath);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
    return saved;
  } finally {
    fs.closeSync(lock);
    fs.unlinkSync(lockPath);
  }
}

if (require.main === module) {
  (async () => {
    if (/^(1|true|yes)$/i.test(process.env.MNEMO_DISABLE || "")) return;
    const payload = JSON.parse(fs.readFileSync(0, "utf8").replace(/^\uFEFF+/, ""));
    if (!process.argv[2]) throw new Error("project root required");
    process.stdout.write(await appendEvent(path.resolve(process.argv[2]), payload) ? "saved" : "duplicate");
  })().catch((error) => { console.error(`[grok-mnemo] ${error.message}`); process.exitCode = 1; });
}
module.exports = { appendEvent };
