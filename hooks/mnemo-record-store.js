#!/usr/bin/env node
"use strict";

// 각 어댑터가 해석한 레코드만 받는다. 이벤트 식별·원본 조회는 호출자가 소유한다.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { setTimeout: pause } = require("node:timers/promises");
const { storageSafe } = require("./mnemo-project-root.js");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const redact = value => String(value || "").replace(/<private>[\s\S]*?<\/private>/gi, "[PRIVATE]").trim();
const runtimes = new Set(["claude", "codex", "grok", "antigravity", "devin"]);

function atomicJson(file, value) {
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const fd = fs.openSync(temporary, "wx", 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n"); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  try { fs.renameSync(temporary, file); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

function record(root, runtime, identity, parts, options = {}) {
  if (!runtimes.has(runtime)) throw new Error("Unknown Mnemo runtime");
  const now = options.now || new Date();
  const pad = n => String(n).padStart(2, "0");
  const date = options.date || `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const time = now.toTimeString().slice(0, 8);
  const marker = options.marker || `<!-- mnemo-${runtime}-event:${hash(String(identity))} -->`;
  const clean = parts.map(part => ({ role: part.role, text: redact(part.text) })).filter(part => part.text);
  return { runtime, date, marker, parts: clean, aliases: options.aliases || [], uuid: options.uuid || "", globalIdentity: options.globalIdentity !== false,
    queuedAt: now.toISOString(),
    header: `---\ndate: ${date}\nproject: ${path.basename(root)}\nkeywords: []\nsummary: ""\n---\n\n# ${date}\n\n`,
    content: clean.map(part => `\n## [${time}] ${part.role}\n\n${part.text}\n`).join("") + marker + "\n" };
}

function validate(entry) {
  entry.runtime ||= "codex"; // 이전 Codex 대기 파일에는 runtime이 없으므로 호환한다.
  if (!runtimes.has(entry.runtime) || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
      !/^<!-- [a-z-]+:[a-zA-Z0-9-]+ -->$/.test(entry.marker) || typeof entry.content !== "string" || typeof entry.header !== "string")
    throw new Error("Invalid pending Mnemo record");
  if (typeof entry.queuedAt !== "string" || !Number.isFinite(Date.parse(entry.queuedAt))) throw new Error("Invalid pending Mnemo timestamp");
  return entry;
}

function completeMarker(text, entry) {
  // 옛 Grok/agy/Devin의 선두 표식만 남은 부분 쓰기를 완료로 판정하지 않는다.
  const parts = entry.parts || [];
  const normal = value => value.replace(/\r\n/g, "\n").replace(/## \[[0-9:]+\] (User|Assistant)/g, "## [] $1").trim();
  const expected = normal(entry.content.slice(0, entry.content.lastIndexOf(entry.marker)));
  const at = text.indexOf(entry.marker);
  if (at >= 0) {
    if (normal(text.slice(Math.max(0, at-entry.content.length-64), at)).endsWith(expected)) return true;
  }
  for (const alias of entry.aliases || []) {
    const position = text.indexOf(alias);
    if (position < 0) continue;
    const next = /<!-- (?:mnemo-[a-z-]+-event|turn|turnhash|grok-event|devin-event|antigravity-turn):[A-Za-z0-9-]+ -->/.exec(text.slice(position+alias.length));
    const body = text.slice(position+alias.length, next ? position+alias.length+next.index : text.length);
    const headings = [...body.matchAll(/^## \[[0-9:]+\] (User|Assistant)\s*$/gm)];
    if (parts.every(part => headings.some((heading,i) => heading[1]===part.role &&
        body.slice(heading.index+heading[0].length,headings[i+1]?.index ?? body.length).trim()===part.text))) return true;
  }
  return false;
}

function append(dir, entry) {
  validate(entry);
  if (entry.globalIdentity) {
    for (const name of fs.readdirSync(dir).filter(name => name.endsWith(`-${entry.runtime}.md`))) {
      if (completeMarker(fs.readFileSync(path.join(dir, name), "utf8"), entry)) return false;
    }
  }
  const file = path.join(dir, `${entry.date}-${entry.runtime}.md`);
  const fd = fs.openSync(file, "a+");
  const size = fs.fstatSync(fd).size;
  try {
    if (completeMarker(fs.readFileSync(fd, "utf8"), entry)) return false;
    const bytes = Buffer.from((size ? "" : entry.header) + entry.content, "utf8");
    try {
      let written = 0;
      while (written < bytes.length) {
        const count = fs.writeSync(fd, bytes, written, bytes.length - written);
        if (!count) throw new Error("Mnemo write made no progress");
        written += count;
      }
      fs.fsyncSync(fd);
    } catch (error) { fs.ftruncateSync(fd, size); fs.fsyncSync(fd); throw error; }
    return true;
  } finally { fs.closeSync(fd); }
}

function addClaudeUuid(dir, entry) {
  if (entry.runtime !== "claude" || !entry.uuid) return;
  const file = path.join(dir, ".mnemo-index.json");
  let index = { version: 1 };
  if (fs.existsSync(file)) {
    try { index = JSON.parse(fs.readFileSync(file, "utf8")); }
    catch { throw new Error("[index-read] unreadable shared index; preserved"); }
  }
  if (!index || typeof index !== "object" || Array.isArray(index)) throw new Error("[index-read] invalid shared index; preserved");
  index.claude ||= {};
  if (typeof index.claude !== "object" || Array.isArray(index.claude)) throw new Error("[index-read] invalid Claude index; preserved");
  const ids = index.claude[entry.date] || [];
  if (!Array.isArray(ids)) throw new Error("[index-read] invalid Claude date index; preserved");
  if (!ids.includes(entry.uuid)) {
    index.claude[entry.date] = [...ids, entry.uuid];
    atomicJson(file, index);
  }
}

const waits = [50, 100, 200, 400, 800, 800, 800];
async function retry(action, deadline, waitUntilDeadline = false) {
  for (let i = 0; ; i++) {
    try { return action(); } catch (error) {
      if ((!waitUntilDeadline && i === waits.length) || Date.now() >= deadline) throw error;
      await pause(Math.min(waits[Math.min(i, waits.length - 1)], deadline - Date.now()));
    }
  }
}
function clearLock(dir) {
  const owner = path.join(dir, "owner.json");
  if (fs.existsSync(owner)) fs.unlinkSync(owner);
  fs.rmdirSync(dir);
}
function acquire(dir) {
  try { fs.mkdirSync(dir); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    let owner;
    try { owner = JSON.parse(fs.readFileSync(path.join(dir, "owner.json"), "utf8")); } catch {}
    if (Number.isSafeInteger(owner?.pid) && owner.pid > 0) {
      try { process.kill(owner.pid, 0); } catch (probe) {
        if (probe.code === "ESRCH") { clearLock(dir); return acquire(dir); }
      }
    } else if (Date.now() - fs.statSync(dir).mtimeMs > 60000 && !fs.readdirSync(dir).length) {
      fs.rmdirSync(dir); return acquire(dir);
    }
    throw error;
  }
  try { fs.writeFileSync(path.join(dir, "owner.json"), JSON.stringify({ pid: process.pid }), { flag: "wx", mode: 0o600 }); }
  catch (error) { fs.rmdirSync(dir); throw error; }
}

function journal(root) {
  if (!path.isAbsolute(root)) throw new Error("Unsafe Mnemo storage");
  root = fs.realpathSync.native(root);
  if (!storageSafe(root)) throw new Error("Unsafe Mnemo storage");
  const dir = path.join(root, "conversations");
  const pending = path.join(dir, ".mnemo-pending");
  fs.mkdirSync(pending, { recursive: true });
  return {
    put(entry) {
      validate(entry);
      const file = path.join(pending, hash(`${entry.runtime}\0${entry.marker}`) + ".json");
      atomicJson(file, entry);
      return file;
    },
    async flush() {
      const deadline = Date.now() + 4000, results = new Map(), errors = [];
      const files = fs.readdirSync(pending).filter(name => /^[a-f0-9]{64}\.json$/.test(name));
      const entries = [];
      for (const name of files) {
        try { entries.push({ file: path.join(pending, name), entry: validate(JSON.parse(fs.readFileSync(path.join(pending, name), "utf8"))) }); }
        catch (error) { errors.push(error.message); }
      }
      entries.sort((a,b) => a.entry.queuedAt.localeCompare(b.entry.queuedAt));
      for (const { file, entry } of entries) {
        try {
          const saved = await retry(() => append(dir, entry), deadline);
          results.set(entry.marker, saved ? "saved" : "duplicate");
          // 본문을 확인한 뒤에만 UUID를 갱신한다. 색인 실패도 대기 파일을 남겨 재시도한다.
          addClaudeUuid(dir, entry);
          fs.unlinkSync(file);
        } catch (error) { errors.push(error.message); }
      }
      return { results, error: errors.join("; ") };
    },
    async locked(action) {
      const lock = path.join(dir, ".mnemo-write.lock");
      await retry(() => acquire(lock), Date.now() + 8000, true);
      try { return await action(this); } finally { clearLock(lock); }
    },
    confirmed(entry) {
      const names = entry.globalIdentity ? fs.readdirSync(dir).filter(name => name.endsWith(`-${entry.runtime}.md`))
        : [`${entry.date}-${entry.runtime}.md`];
      return names.some(name => {
        const file = path.join(dir, name);
        return fs.existsSync(file) && completeMarker(fs.readFileSync(file, "utf8"), entry);
      });
    },
  };
}

async function storeRecords(root, entries) {
  const tx = journal(root);
  const files = entries.map(entry => tx.put(entry)); // 잠금을 기다리기 전에 완전한 내용을 보존한다.
  let flushed = { results: new Map(), error: "" };
  let statuses = entries.map(() => "pending");
  try {
    await tx.locked(async j => {
      flushed = await j.flush();
      // A replay can publish the same pending name while another writer flushes
      // it. Confirm the body under the lock instead of treating queue presence
      // as proof that this record is still missing.
      statuses = entries.map(entry => flushed.results.get(entry.marker) || (j.confirmed(entry) ? "duplicate" : "pending"));
    });
  }
  catch (error) { flushed.error = error.message; }
  return { statuses, error: flushed.error, savedCount: [...flushed.results.values()].filter(status => status === "saved").length,
    pendingFiles: files.filter((file,i) => statuses[i] === "pending") };
}

module.exports = { record, journal, storeRecords, atomicJson, redact, hash };
