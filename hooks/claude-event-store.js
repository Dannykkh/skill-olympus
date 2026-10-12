#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { journal, record, atomicJson, redact, hash } = require("./mnemo-record-store.js");

function transcriptAnswer(file) {
  let answer = { text: "", uuid: "" };
  if (!file || !fs.existsSync(file)) return answer;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    let value; try { value = JSON.parse(line); } catch { continue; }
    if (value.type !== "assistant") continue;
    const content = value.message?.content;
    const text = Array.isArray(content) ? content.filter(part => part.type === "text").map(part => part.text || "").join("\n").trim() : "";
    if (text) answer = { text, uuid: String(value.uuid || "") };
  }
  return answer;
}
function warn(root, message) {
  try {
    const dir = path.join(root, ".claude"); fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "mnemo-errors.log"), `[${new Date().toISOString()}] [mnemo/claude-event-store] ${message}\n`);
  } catch {}
}
async function saveClaudeEvent(root, mode, payload) {
  if (/^(1|true|yes)$/i.test(process.env.MNEMO_DISABLE || "")) return { status: "empty" };
  const tx = journal(root);
  return tx.locked(async j => {
    const stateFile = path.join(root, "conversations", ".claude-events.json");
    const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : { version: 1, sessions: {} };
    if (state.version !== 1 || !state.sessions) throw new Error("invalid Claude event state; preserved");
    const session = String(payload.session_id || payload.transcript_path || "");
    const scope = hash(session || crypto.randomUUID());
    const previous = state.sessions[scope] || { generation: 0 };
    let value, identity, uuid = "";
    if (mode === "user") {
      value = redact(payload.prompt);
      if (payload.source === "system" || value.startsWith("<task-notification>") || !value) return { status: "empty" };
      const explicit = payload.prompt_id || payload.user_message_uuid || payload.event_id;
      if (explicit && previous.inputId === String(explicit)) {
        const result = await j.flush(); return { status: "duplicate", error: result.error };
      }
      previous.generation++;
      previous.inputId = explicit ? String(explicit) : "";
      identity = `user:${scope}:${explicit || crypto.randomUUID()}`;
      previous.answer = null;
    } else {
      let source;
      try { source = transcriptAnswer(payload.transcript_path); }
      catch (error) {
        if (!payload.last_assistant_message) throw error;
        warn(root, `transcript unavailable; CLI response preserved (${error.code || 'read-error'})`);
        source = { text: "", uuid: "" };
      }
      value = redact(payload.last_assistant_message || source.text);
      if (!value) return { status: "empty", response: "" };
      if (redact(source.text) === value) uuid = source.uuid;
      const signature = hash(value);
      const last = previous.answer;
      // 아직 JSONL에 없던 답이 같은 입력 세대에서 uuid와 함께 재전달되면 기존 레코드에 연결한다.
      if (last && last.generation === previous.generation && last.signature === signature && (!uuid || !last.uuid || uuid === last.uuid)) identity = last.identity;
      else identity = `assistant:${scope}:${payload.turn_id || uuid || `${previous.generation}:${signature}`}`;
      previous.answer = { identity, signature, generation: previous.generation, uuid: uuid || last?.uuid || "" };
    }
    const entry = record(root, "claude", identity, [{ role: mode === "user" ? "User" : "Assistant", text: value }], { uuid });
    j.put(entry); // 색인·입력 세대보다 먼저 실제 내용의 복구 사본을 보존한다.
    state.sessions[scope] = previous;
    atomicJson(stateFile, state);
    const result = await j.flush();
    const status = result.results.get(entry.marker) || "pending";
    if (result.error) warn(root, result.error);
    return { status, response: mode === "assistant" ? value : "", userText: mode === "user" ? value : "", error: result.error };
  });
}
module.exports = { saveClaudeEvent, transcriptAnswer };
if (require.main === module) {
  let input = ""; process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => { input += chunk; });
  process.stdin.on("end", async () => {
    try {
      const result = await saveClaudeEvent(process.argv[2], process.argv[3], JSON.parse(input.replace(/^\uFEFF+/, "")));
      console.log(JSON.stringify(result));
      if (result.status === "pending" && process.env.MNEMO_STRICT === "1") process.exitCode = 1;
    } catch (error) { warn(process.argv[2], error.message); console.error(error.message); process.exitCode = process.env.MNEMO_STRICT === "1" ? 1 : 0; }
  });
}
