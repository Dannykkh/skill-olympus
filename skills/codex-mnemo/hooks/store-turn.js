#!/usr/bin/env node
"use strict";

// 한 완료 턴을 저장하는 공통 책임. 두 셸의 save-turn이 저장·bridge·관찰·이어가기 순서를 소유한다.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const rootHelper = fs.existsSync(path.join(__dirname, "mnemo-project-root.js"))
  ? path.join(__dirname, "mnemo-project-root.js") : path.resolve(__dirname, "../../../hooks/mnemo-project-root.js");
const { resolveRoot } = require(rootHelper);

// reconcile_codex_conversations.py의 USER_INJECTION_PREFIXES와 같은 경계다.
const injectedPrefixes = ["# AGENTS.md instructions for", "<environment_context", "<codex_internal_context",
  "<skills_instructions", "<permissions instructions", "<turn_aborted", "<subagent_notification>",
  "<task-notification>", "You are an agent in a team of agents collaborating to complete a task.",
  "Message Type: NEW_TASK", "Message Type: MESSAGE", "Message Type: FINAL_ANSWER"];

function text(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join("\n");
  if (value && typeof value === "object") return text(value.text ?? value.content ?? "");
  return "";
}
function safe(value) { return text(value).replace(/<private>.*?<\/private>/gis, "[PRIVATE]").trim(); }
function userText(value) {
  const raw = text(value).trim();
  return raw && !injectedPrefixes.some(prefix => raw.startsWith(prefix)) ? safe(raw) : "";
}

function sessionFallback(file, turnId) {
  if (!file || !fs.existsSync(file)) return { users: [], response: "" };
  let active, selected, latest, hasLifecycle = false, hasMeta = false, legacyUser = "", legacyAnswer = "";
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    let item; try { item = JSON.parse(line); } catch { continue; }
    const p = item.payload || {};
    if (item.type === "session_meta" && !hasMeta) {
      hasMeta = true;
      if ((p.source && typeof p.source === "object") || p.agent_path || p.parent_thread_id || p.thread_source === "subagent")
        return { users: [], response: "" };
    } else if (item.type === "event_msg" && p.type === "task_started") {
      hasLifecycle = true;
      active = { id: p.turn_id, users: [], fallback: [], response: "" };
      if (active.id === turnId) selected = active;
    } else if (item.type === "event_msg" && p.type === "user_message" && active) {
      const value = userText(p.message ?? p.text);
      if (value) active.users.push(value);
    } else if (item.type === "response_item" && p.type === "message") {
      if (p.role === "user") {
        const value = userText(p.content);
        if (value) { legacyUser = value; if (active) active.fallback.push(value); }
      } else if (p.role === "assistant" && (p.phase === "final_answer" || !hasLifecycle)) {
        legacyAnswer = safe(p.content);
        if (active) active.response = legacyAnswer;
      }
    } else if (item.type === "event_msg" && p.type === "task_complete" && active && p.turn_id === active.id) {
      active.response = safe(p.last_agent_message) || active.response;
      latest = active; active = undefined;
    } else if (item.type === "event_msg" && p.type === "turn_aborted" && active) {
      if (selected === active) selected = undefined;
      active = undefined;
    }
  }
  const found = turnId ? selected : latest || active;
  if (found) return { users: found.users.length ? found.users : found.fallback, response: found.response };
  // 턴 경계가 없는 옛 세션만 기존 마지막 입력 대체 경로를 유지한다.
  return hasLifecycle ? { users: [], response: "" } : { users: legacyUser ? [legacyUser] : [], response: legacyAnswer };
}

function prepareTurn(payload, sessionFile) {
  const input = payload["input-messages"] ?? payload.input_messages ?? [];
  let users = (Array.isArray(input) ? input : [input]).map(userText).filter(Boolean);
  let response = safe(payload["last-assistant-message"] ?? payload.last_assistant_message);
  const turnId = String(payload["turn-id"] ?? payload.turn_id ?? "").trim();
  if (!users.length || !response) {
    const fallback = sessionFallback(sessionFile, turnId);
    if (!users.length) users = fallback.users;
    if (!response) response = fallback.response;
  }
  return { userText: users.join("\n\n> Follow-up\n\n"), response, userCount: users.length, turnId };
}

const sharedStore = fs.existsSync(path.join(__dirname, 'mnemo-record-store.js'))
  ? path.join(__dirname, 'mnemo-record-store.js') : path.resolve(__dirname, '../../../hooks/mnemo-record-store.js');
const { record, storeRecords } = require(sharedStore);
async function storeTurn(baseDir, payload, sessionFile = '') {
  const root = resolveRoot(baseDir);
  if (!root || path.resolve(baseDir) !== root) throw new Error('Unconfirmed Mnemo project root');
  const turn = prepareTurn(payload, sessionFile);
  if (!turn.userText && !turn.response) return { status: 'empty', ...turn };
  const id = /^[A-Za-z0-9-]+$/.test(turn.turnId) ? turn.turnId : '';
  const signature = crypto.createHash('sha1').update(`${turn.userText}\n---\n${turn.response}`).digest('hex');
  const marker = `<!-- ${id ? 'turn:' + id : 'turnhash:' + signature} -->`;
  const entry = record(root, 'codex', marker, [{role:'User',text:turn.userText},{role:'Assistant',text:turn.response}], {marker, globalIdentity:!!id});
  const result = await storeRecords(root, [entry]);
  return { status:result.statuses[0], ...turn, savedCount:result.savedCount,
    pendingFile:result.pendingFiles[0] || '', error:result.error };
}

module.exports = { prepareTurn, storeTurn };
if (require.main === module) {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", part => { input += part; });
  process.stdin.on("end", async () => {
    try { console.log(JSON.stringify(await storeTurn(process.argv[2], JSON.parse(input.replace(/^\uFEFF+/, "")), process.argv[3]))); }
    catch (error) { console.log(JSON.stringify({ status: "failed", error: error.message })); process.exitCode = 1; }
  });
}
