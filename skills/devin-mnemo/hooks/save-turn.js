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
    if (options.beforeRow !== undefined) args.push("--before-row", String(options.beforeRow));
    if (options.since !== undefined) args.push("--since", String(options.since));
    if (options.db) args.push("--db", options.db);
    const result = spawnSync(command, args, { encoding: "utf8", timeout: 2500, windowsHide: true });
    if (!result.error && result.status === 0) {
      try { return JSON.parse(result.stdout); } catch { /* A broken Python alias is not a usable reader. */ }
    }
  }
  return null;
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

const shared = fs.existsSync(path.join(__dirname,'mnemo-record-store.js'))
  ? path.join(__dirname,'mnemo-record-store.js') : path.resolve(__dirname,'../../../hooks/mnemo-record-store.js');
const { journal, record, atomicJson } = require(shared);
function readState(file) {
  const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8')) : {version:1,sessions:{}};
  if (state.version !== 1 || !state.sessions) throw new Error('unsupported Devin event index');
  state.pendingReads ||= [];
  if (!Array.isArray(state.pendingReads)) throw new Error('invalid pending Devin reads; preserved');
  return state;
}
async function saveEvent(payload, options = {}) {
  if (/^(1|true|yes)$/i.test(process.env.MNEMO_DISABLE || '')) return false;
  const event = payload.hook_event_name;
  if (!['UserPromptSubmit','Stop','SessionEnd'].includes(event)) return false;
  const sessionId = String(payload.session_id || '');
  if (!sessionId) return false;
  const root = options.root || resolveDevin(payload);
  if (!root) return false;
  const tx = journal(root);
  const stateFile = path.join(root,'conversations','.devin-events.json');
  const snapshot = readState(stateFile);
  const previous = snapshot.sessions[sessionId] || {};
  const promptId = String(payload.prompt_id || previous.promptId || '');
  const submittedAt = Math.floor(Date.now()/1000);
  let currentEntry, baseline, message;
  if (event === 'UserPromptSubmit') {
    if (!payload.prompt_id || !redact(payload.prompt)) return false;
    currentEntry = record(root,'devin',`${sessionId}:user:${promptId}`,[{role:'User',text:payload.prompt}],
      {aliases:[`<!-- devin-event:${hash(`${sessionId}:user:${promptId}`)} -->`]});
    tx.put(currentEntry); // DB 조회나 잠금 대기 전에 사용자 입력을 보존한다.
    baseline = pythonCall('baseline',sessionId,{db:options.db});
  } else if (previous.promptId === promptId && !previous.assistantSaved) {
    for (let i=0;i<3 && !message;i++) {
      message = pythonCall('assistant',sessionId,{afterRow:previous.baseline,since:previous.submittedAt,db:options.db});
      if (!message && i<2) await pause(150);
    }
    if (message?.content) {
      const key = `${sessionId}:assistant:${promptId}:${message.message_id || message.row_id}`;
      currentEntry = record(root,'devin',key,[{role:'Assistant',text:message.content}],{aliases:[`<!-- devin-event:${hash(key)} -->`]});
      tx.put(currentEntry);
    }
  }
  // 옛 Stop의 DB 읽기는 다음 입력의 baseline으로 상한을 정해 다른 턴 답변을 가져오지 않는다.
  const recovered = [];
  for (const pending of snapshot.pendingReads.filter(p => Number.isInteger(p.beforeRow) && p.beforeRow > p.baseline).slice(0,2)) {
    const result = pythonCall('assistant',pending.sessionId,{afterRow:pending.baseline,beforeRow:pending.beforeRow,since:pending.submittedAt,db:options.db});
    if (result?.content) recovered.push({pending,result});
  }
  return tx.locked(async j => {
    const state = readState(stateFile);
    const active = state.sessions[sessionId] || {};
    if (event === 'UserPromptSubmit' && active.promptId !== promptId) {
      if (active.awaitingBody && !active.assistantSaved) state.pendingReads.push({...active,sessionId,beforeRow:Number.isInteger(baseline)?baseline:null});
      state.sessions[sessionId] = {promptId,baseline:Number.isInteger(baseline)?baseline:0,submittedAt,assistantSaved:false};
      ensureScaffold(root);
    } else if (event !== 'UserPromptSubmit' && active.promptId === promptId) {
      if (message?.content) { active.assistantSaved = true; active.awaitingBody = false; }
      else if (!active.assistantSaved) active.awaitingBody = true;
    }
    for (const {pending,result} of recovered) {
      const key = `${pending.sessionId}:assistant:${pending.promptId}:${result.message_id || result.row_id}`;
      j.put(record(root,'devin',key,[{role:'Assistant',text:result.content}],{aliases:[`<!-- devin-event:${hash(key)} -->`]}));
      state.pendingReads = state.pendingReads.filter(p => !(p.sessionId===pending.sessionId && p.promptId===pending.promptId));
    }
    atomicJson(stateFile,state);
    const result = await j.flush();
    if (result.error) console.error(`[devin-mnemo] ${result.error}`);
    if (active.awaitingBody) console.error('[devin-mnemo] assistant DB text not available; pending turn retained');
    return !!currentEntry && result.results.get(currentEntry.marker) === 'saved';
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
