#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ALLOW = { decision: "allow" };

function enabled() {
  return !/^(?:1|true|yes)$/i.test(process.env.MNEMO_DISABLE || "");
}

function readPayload() {
  const input = fs.readFileSync(0, "utf8").trim();
  return input ? JSON.parse(input) : {};
}

// The installed adapter carries the same helper as Claude, Codex and Grok.
const rootHelper = fs.existsSync(path.join(__dirname, "mnemo-project-root.js"))
  ? path.join(__dirname, "mnemo-project-root.js")
  : path.join(__dirname, "../../../hooks/mnemo-project-root.js");
const { resolveAntigravity: resolveProjectRoot } = require(rootHelper);

function redact(value) {
  return String(value || "").replace(/<private>[\s\S]*?<\/private>/gi, "[PRIVATE]").trim();
}

function textFrom(value, depth = 0) {
  if (depth > 5 || value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => textFrom(item, depth + 1)).filter(Boolean).join("\n");
  if (typeof value !== "object") return "";
  for (const key of ["text", "content", "message", "response", "output", "value"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const found = textFrom(value[key], depth + 1);
      if (found) return found;
    }
  }
  return "";
}

function readTranscript(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return [];
  return fs.readFileSync(transcriptPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean)
    .map((record, index) => ({ ...(record.step || record), __index: index }));
}

function isUserRecord(record) {
  const source = String(record.source || record.role || "").toUpperCase();
  const type = String(record.type || "").toUpperCase();
  return source === "USER" || source === "USER_EXPLICIT" || type === "USER_INPUT";
}

function isModelRecord(record) {
  const source = String(record.source || record.role || "").toUpperCase();
  const type = String(record.type || "").toUpperCase();
  if (source === "ASSISTANT") return true;
  if (source !== "MODEL") return false;
  if (type === "GENERIC") return false;
  return !/(?:TOOL|COMMAND|FUNCTION|THOUGHT|REASONING)/.test(type);
}

function recordOrder(record) {
  const raw = record.step_index ?? record.stepIndex ?? record.index ?? record.__index;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : record.__index;
}

function latestTurn(payload) {
  const records = readTranscript(payload.transcriptPath);
  let user = null;
  for (const record of records) {
    const content = redact(textFrom(record.content ?? record.message ?? record));
    if (content && isUserRecord(record)) user = { content, order: recordOrder(record) };
  }

  let assistant = null;
  if (user) {
    for (const record of records) {
      if (recordOrder(record) < user.order || !isModelRecord(record)) continue;
      const raw = record.content ?? record.message;
      if (!raw) continue;
      const content = redact(textFrom(raw));
      if (content) assistant = { content, order: recordOrder(record) };
    }
  }

  const userText = user?.content || redact(payload.prompt || payload.userPrompt || "");
  const assistantText = assistant?.content || redact(payload.promptResponse || payload.response || "");
  const users = records.filter(isUserRecord).map(record => ({content:redact(textFrom(record.content ?? record.message ?? record)),order:recordOrder(record),aliases:[]})).filter(user => user.content);
  // 과거의 단일 턴 표식과 맞춰 이미 저장한 입력을 중복으로 쓰지 않는다.
  for (let i=0;i<users.length;i++) {
    const userOnly = [payload.conversationId || 'unknown',users[i].order,users[i].content,''].join('\0');
    users[i].aliases.push(`<!-- antigravity-turn:${crypto.createHash('sha1').update(userOnly).digest('hex')} -->`);
    const next = users[i+1]?.order ?? Infinity;
    const models = records.filter(record => recordOrder(record)>=users[i].order && recordOrder(record)<next && isModelRecord(record));
    for (const model of models) {
      const content = redact(textFrom(model.content ?? model.message));
      if (!content) continue;
      const identity = [payload.conversationId || 'unknown',recordOrder(model),users[i].content,content].join('\0');
      users[i].aliases.push(`<!-- antigravity-turn:${crypto.createHash('sha1').update(identity).digest('hex')} -->`);
    }
  }
  return { userText, assistantText, order: assistant?.order ?? user?.order ?? -1, users };
}

function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function ensureScaffold(root, date) {
  ensureFile(path.join(root, ".mnemo-root"), "");
  const project = path.basename(root);
  const splitCategories = new Set(["architecture", "patterns", "tools", "gotchas"]
    .filter(category => fs.existsSync(path.join(root, "memory", category, "index.md"))));
  // Preserve split canonical files and route a newly created root index to them.
  const ensureScaffoldFile = (filePath, content) => {
    if (path.basename(filePath) === "MEMORY.md") {
      for (const category of splitCategories) {
        content = content.replaceAll(`memory/${category}.md`, `memory/${category}/index.md`);
      }
    } else if (splitCategories.has(path.basename(filePath, ".md"))) return;
    ensureFile(filePath, content);
  };
  ensureScaffoldFile(path.join(root, "MEMORY.md"), `# MEMORY.md - 프로젝트 장기기억\n\n## 프로젝트 목표\n\n| 목표 | 상태 |\n|------|------|\n| ${project} 핵심 작업 추적 | 진행 중 |\n\n## 키워드 인덱스\n\n| 키워드 | 상세 파일 |\n|--------|-----------|\n| 프로젝트, 생성일 | #meta |\n\n## architecture/\n- [memory/architecture.md](memory/architecture.md)\n\n## patterns/\n- [memory/patterns.md](memory/patterns.md)\n\n## tools/\n- [memory/tools.md](memory/tools.md)\n\n## gotchas/\n- [memory/gotchas.md](memory/gotchas.md)\n\n## meta/\n- **프로젝트**: ${project}\n- **생성일**: ${date}\n- **마지막 업데이트**: ${date}\n`);
  const memoryDir = path.join(root, "memory");
  ensureScaffoldFile(path.join(memoryDir, "architecture.md"), "# Architecture - 설계 결정\n\n---\n");
  ensureScaffoldFile(path.join(memoryDir, "patterns.md"), "# Patterns - 작업 패턴, 워크플로우\n\n---\n");
  ensureScaffoldFile(path.join(memoryDir, "tools.md"), "# Tools - 외부 도구, 라이브러리\n\n---\n");
  ensureScaffoldFile(path.join(memoryDir, "gotchas.md"), "# Gotchas - 주의사항, 함정\n\n---\n");
}

const sharedStore = fs.existsSync(path.join(__dirname, 'mnemo-record-store.js'))
  ? path.join(__dirname, 'mnemo-record-store.js') : path.resolve(__dirname, '../../../hooks/mnemo-record-store.js');
const { record, storeRecords } = require(sharedStore);
async function appendTurn(root, payload, turn) {
  if (!turn.userText && !turn.assistantText) return {statuses:[]};
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  ensureScaffold(root, date);
  const conversation = payload.conversationId || payload.transcriptPath || 'unknown';
  const entries = [];
  const users = turn.users?.length ? turn.users : [{content:turn.userText,order:turn.order,aliases:[]}];
  for (const user of users) {
    if (!user.content) continue;
    entries.push(record(root,'antigravity',`${conversation}:user:${user.order}:${user.content}`,
      [{role:'User',text:user.content}],{aliases:user.aliases || []}));
  }
  if (turn.assistantText) {
    const legacy = [payload.conversationId || 'unknown',turn.order,turn.userText,turn.assistantText].join('\0');
    const alias = `<!-- antigravity-turn:${crypto.createHash('sha1').update(legacy).digest('hex')} -->`;
    entries.push(record(root,'antigravity',`${conversation}:assistant:${turn.order}:${turn.assistantText}`,
      [{role:'Assistant',text:turn.assistantText}],{aliases:[alias]}));
  }
  const result = await storeRecords(root,entries);
  if (result.error) logFailure(root,new Error(result.error));
  return result;
}

function logFailure(root, error) {
  try {
    if (!root) return;
    const logDir = path.join(root, ".claude");
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      path.join(logDir, "mnemo-errors.log"),
      `[${new Date().toISOString()}] [antigravity-mnemo/save-turn] ${error.message || error}\n`,
      "utf8",
    );
  } catch {
    // The Stop hook must remain fail-open.
  }
}

async function main() {
  let root = null;
  try {
    if (enabled()) {
      const payload = readPayload();
      root = resolveProjectRoot(payload);
      if (root) await appendTurn(root, payload, latestTurn(payload));
    }
  } catch (error) {
    logFailure(root, error);
    console.error(`[antigravity-mnemo] ${error.message || error}`);
  }
  process.stdout.write(JSON.stringify(ALLOW));
}

// 메모리 정제가 필요하면 카탈로그의 source-only memory-distill 모듈을 직접 읽어 실행한다.
if (require.main === module) main();

module.exports = {
  appendTurn,
  latestTurn,
  redact,
  resolveProjectRoot,
};
