#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { journal, record, atomicJson, redact, hash } = require("./mnemo-record-store.js");

// 사람이 보낸 입력의 promptSource. system(작업 알림 등)과 값이 없는 줄(다른 세션의 메시지·중단 표시)은 제외한다.
const humanSources = new Set(["typed", "suggestion_accepted", "queued"]);
const disabled = () => /^(1|true|yes)$/i.test(process.env.MNEMO_DISABLE || "");

function textOf(content) {
  if (typeof content === "string") return content;
  return Array.isArray(content) ? content.filter(part => part && part.type === "text").map(part => part.text || "").join("\n") : "";
}
function when(timestamp) {
  const date = new Date(timestamp || "");
  return Number.isFinite(date.getTime()) ? date : new Date();
}
function localDate(date) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

// 원본 세션 한 줄이 사람이 보낸 입력이면 저장할 값을 돌려준다(gotcha 123).
// - 프롬프트 줄: UserPromptSubmit 훅의 prompt_id와 같은 promptId로 식별해, 훅이 쓴 기록과 표식이 같다.
// - queued_command 첨부: 답이 진행 중일 때 보낸 문장이 그 턴에 끼워진 것. 프롬프트 훅을 거치지 않는다.
//   같은 첨부 형식의 작업 알림은 origin.kind가 human이 아니므로 걸러진다.
function humanInput(value) {
  if (!value || value.isSidechain || value.isMeta || value.isCompactSummary) return null;
  let id, text, timestamp = value.timestamp;
  if (value.type === "user" && humanSources.has(value.promptSource) && value.promptId) {
    id = String(value.promptId); text = textOf(value.message?.content);
  } else if (value.type === "attachment" && value.attachment?.type === "queued_command" && value.attachment.origin?.kind === "human" && value.uuid) {
    id = `queued:${value.uuid}`; text = textOf(value.attachment.prompt); timestamp = value.attachment.timestamp || timestamp;
  } else return null;
  text = redact(text);
  if (!text || text.startsWith("<task-notification>")) return null;
  return { id, text, session: String(value.sessionId || value.session_id || ""), timestamp: String(timestamp || "") };
}

// 원본 세션을 한 번만 읽어 마지막 답과 사람 입력을 함께 모은다.
// cursor(지난 Stop이 본 마지막 줄 uuid)를 만나면 그 앞의 입력은 버려, 새로 생긴 입력만 남긴다.
function readTranscript(file, cursor = "") {
  const result = { answer: { text: "", uuid: "" }, inputs: [], last: "", cursorFound: false };
  if (!file || !fs.existsSync(file)) return result;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    let value; try { value = JSON.parse(line); } catch { continue; }
    if (value.type === "assistant") {
      const content = value.message?.content;
      const text = Array.isArray(content) ? content.filter(part => part.type === "text").map(part => part.text || "").join("\n").trim() : "";
      if (text) result.answer = { text, uuid: String(value.uuid || "") };
    } else {
      const input = humanInput(value);
      if (input) result.inputs.push(input);
    }
    if (value.uuid) {
      result.last = String(value.uuid);
      if (cursor && result.last === cursor) { result.cursorFound = true; result.inputs = []; }
    }
  }
  return result;
}
function transcriptAnswer(file) { return readTranscript(file).answer; }

// 저장된 Claude 대화 파일의 표식 전체. 입력마다 파일을 다시 읽지 않도록 한 번 모은다.
function savedMarkers(root) {
  const dir = path.join(root, "conversations"), markers = new Set();
  if (!fs.existsSync(dir)) return markers;
  for (const name of fs.readdirSync(dir).filter(name => name.endsWith("-claude.md"))) {
    for (const match of fs.readFileSync(path.join(dir, name), "utf8").matchAll(/<!-- mnemo-claude-event:[a-f0-9]{64} -->/g)) markers.add(match[0]);
  }
  return markers;
}
function inputRecord(root, scope, input) {
  return record(root, "claude", `user:${scope}:${input.id}`, [{ role: "User", text: input.text }], { now: when(input.timestamp) });
}

// Stop 때 프롬프트 훅이 놓친 사람 입력을 원본 세션에서 찾는다(gotcha 123).
// 훅·SessionStart 복구와 같은 식별자를 쓰므로 이미 쓴 기록은 표식으로 걸러진다.
function missedInputs(root, scope, previous, transcript) {
  let window = transcript.inputs;
  if (!transcript.cursorFound) {
    // 커서가 없으면(설치 직후 첫 Stop 등) 프롬프트 훅이 마지막으로 저장한 입력 뒤만 본다. 그 앞은 SessionStart 복구가 맡는다.
    const anchor = previous.inputId ? window.map(input => input.id).lastIndexOf(previous.inputId) : -1;
    window = anchor >= 0 ? window.slice(anchor + 1) : [];
  }
  // texts: 지난 Stop 뒤 프롬프트 훅이 저장한 문장. prompt_id 없이 저장됐거나 원본과 다른 식별자로
  // 저장된 기록은 표식이 달라, 같은 창 안에서는 문장으로 짝짓는다. 창은 Stop마다 새로 시작한다.
  const texts = previous.texts || [];
  const consume = input => { const at = texts.indexOf(hash(input.text)); if (at >= 0) texts.splice(at, 1); return at >= 0; };
  window = window.filter(input => {
    if (input.id === previous.inputId) { consume(input); return false; }
    return !consume(input);
  });
  previous.texts = [];
  if (!window.length) return [];
  const saved = savedMarkers(root);
  return window.map(input => inputRecord(root, scope, input)).filter(entry => !saved.has(entry.marker));
}

function warn(root, message) {
  try {
    const dir = path.join(root, ".claude"); fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "mnemo-errors.log"), `[${new Date().toISOString()}] [mnemo/claude-event-store] ${message}\n`);
  } catch {}
}
async function saveClaudeEvent(root, mode, payload) {
  if (disabled()) return { status: "empty" };
  const tx = journal(root);
  return tx.locked(async j => {
    const stateFile = path.join(root, "conversations", ".claude-events.json");
    const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : { version: 1, sessions: {} };
    if (state.version !== 1 || !state.sessions) throw new Error("invalid Claude event state; preserved");
    const session = String(payload.session_id || payload.transcript_path || "");
    const scope = hash(session || crypto.randomUUID());
    const previous = state.sessions[scope] || { generation: 0 };
    let value, identity, uuid = "", caught = [];
    if (mode === "user") {
      value = redact(payload.prompt);
      if (payload.source === "system" || value.startsWith("<task-notification>") || !value) return { status: "empty" };
      const explicit = payload.prompt_id || payload.user_message_uuid || payload.event_id;
      if (explicit && previous.inputId === String(explicit)) {
        // 같은 prompt_id에 다른 문장이면 재전달이 아니다. 답 진행 중 보낸 입력이 진행 중인 턴의
        // prompt_id를 달고 오는 경우로 보이며(gotcha 123, 미확인), 원본 세션에는 별도 식별자로 남으므로
        // Stop 따라잡기가 그 식별자로 저장한다. 이 판단을 다음에 실측할 수 있게 한 줄 남긴다.
        if (previous.inputText && previous.inputText !== hash(value)) warn(root, "same prompt_id with a different prompt; left for the Stop catch-up (likely sent during a running turn)");
        const result = await j.flush(); return { status: "duplicate", error: result.error };
      }
      previous.generation++;
      previous.inputId = explicit ? String(explicit) : "";
      previous.inputText = hash(value);
      previous.texts = [...(previous.texts || []), hash(value)].slice(-32);
      identity = `user:${scope}:${explicit || crypto.randomUUID()}`;
      previous.answer = null;
    } else {
      let source;
      try { source = readTranscript(payload.transcript_path, previous.cursor); }
      catch (error) {
        if (!payload.last_assistant_message) throw error;
        warn(root, `transcript unavailable; CLI response preserved (${error.code || 'read-error'})`);
        source = readTranscript("");
      }
      caught = missedInputs(root, scope, previous, source);
      if (source.last) previous.cursor = source.last;
      value = redact(payload.last_assistant_message || source.answer.text);
      if (!value && !caught.length) return { status: "empty", response: "" };
      if (value) {
        if (redact(source.answer.text) === value) uuid = source.answer.uuid;
        const signature = hash(value);
        const last = previous.answer;
        // 아직 JSONL에 없던 답이 같은 입력 세대에서 uuid와 함께 재전달되면 기존 레코드에 연결한다.
        if (last && last.generation === previous.generation && last.signature === signature && (!uuid || !last.uuid || uuid === last.uuid)) identity = last.identity;
        else identity = `assistant:${scope}:${payload.turn_id || uuid || `${previous.generation}:${signature}`}`;
        previous.answer = { identity, signature, generation: previous.generation, uuid: uuid || last?.uuid || "" };
      }
    }
    // 따라잡은 입력은 원본 시각을 queuedAt으로 가져 답보다 먼저 쓰인다.
    for (const entry of caught) j.put(entry);
    const entry = value ? record(root, "claude", identity, [{ role: mode === "user" ? "User" : "Assistant", text: value }], { uuid }) : null;
    if (entry) j.put(entry); // 색인·입력 세대보다 먼저 실제 내용의 복구 사본을 보존한다.
    state.sessions[scope] = previous;
    atomicJson(stateFile, state);
    const result = await j.flush();
    const status = entry ? result.results.get(entry.marker) || "pending" : "empty";
    if (result.error) warn(root, result.error);
    return { status, response: mode === "assistant" ? value : "", userText: mode === "user" ? value : "", error: result.error,
      caughtUp: caught.filter(item => result.results.get(item.marker) === "saved").length };
  });
}

// SessionStart 복구(reconcile_conversations.py)가 부른다. 기간 안의 사람 입력 중 표식이 없는 것만 쓴다.
async function backfillInputs(root, options = {}) {
  if (disabled()) return { status: "empty", found: 0, missing: 0, saved: 0 };
  const inputs = [];
  for (const file of options.transcripts || []) {
    for (const input of readTranscript(file).inputs) {
      const day = localDate(when(input.timestamp));
      if (!input.session || (options.date && day !== options.date) || (options.since && day < options.since)) continue;
      inputs.push({ ...input, day });
    }
  }
  const select = () => {
    const saved = savedMarkers(root), entries = inputs.map(input => ({ input, entry: inputRecord(root, hash(input.session), input) }));
    // 표식은 2026-10-12부터 쓰였다. 그 전 세션은 훅 기록에 표식이 없으므로, 같은 날 파일에 같은 문장의
    // User 기록이 있으면 저장된 것으로 본다.
    // minimal: 표식 없는 옛 세션에서 같은 날 같은 문장을 두 번 보냈으면 하나로 본다 — 옛 세션을 다시 복구해야 할 때 원본 줄 uuid 색인으로 바꾼다
    const marked = new Set(entries.filter(({ entry }) => saved.has(entry.marker)).map(({ input }) => input.session));
    const daily = new Map(), seen = new Set();
    const legacy = input => {
      if (!daily.has(input.day)) {
        const file = path.join(root, "conversations", `${input.day}-claude.md`);
        daily.set(input.day, fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "");
      }
      return daily.get(input.day).includes(`] User\n\n${input.text.replace(/\r\n/g, "\n")}\n`);
    };
    return entries.filter(({ input, entry }) => {
      if (saved.has(entry.marker) || seen.has(entry.marker)) return false;
      seen.add(entry.marker);
      return marked.has(input.session) || !legacy(input);
    }).map(({ entry }) => entry);
  };
  if (options.dryRun) return { status: "dry-run", found: inputs.length, missing: select().length, saved: 0 };
  return journal(root).locked(async j => {
    const missing = select(); // 잠금 안에서 다시 골라 그사이 훅이 쓴 기록을 반영한다.
    for (const entry of missing) j.put(entry);
    const result = await j.flush();
    if (result.error) warn(root, result.error);
    return { status: "ok", found: inputs.length, missing: missing.length,
      saved: missing.filter(entry => result.results.get(entry.marker) === "saved").length, error: result.error };
  });
}

module.exports = { saveClaudeEvent, backfillInputs, transcriptAnswer, readTranscript, humanInput };
if (require.main === module) {
  let input = ""; process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => { input += chunk; });
  process.stdin.on("end", async () => {
    try {
      const payload = JSON.parse(input.replace(/^﻿+/, ""));
      const result = process.argv[3] === "backfill" ? await backfillInputs(process.argv[2], payload)
        : await saveClaudeEvent(process.argv[2], process.argv[3], payload);
      console.log(JSON.stringify(result));
      if (result.status === "pending" && process.env.MNEMO_STRICT === "1") process.exitCode = 1;
    } catch (error) { warn(process.argv[2], error.message); console.error(error.message); process.exitCode = process.env.MNEMO_STRICT === "1" ? 1 : 0; }
  });
}
