#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ALLOW = { decision: "allow" };

function enabled() {
  return !/^(?:1|true|yes)$/i.test(process.env.MNEMO_DISABLE || "");
}

function readPayload() {
  const input = fs.readFileSync(0, "utf8").trim();
  return input ? JSON.parse(input) : {};
}

function isTempPath(candidate) {
  if (!candidate) return true;
  const resolved = path.resolve(candidate).toLowerCase();
  const roots = [os.tmpdir(), process.env.TEMP, process.env.TMP]
    .filter(Boolean)
    .map((value) => path.resolve(value).toLowerCase());
  return roots.some((root) => resolved === root || resolved.startsWith(root + path.sep));
}

function nearestMarkedRoot(start) {
  if (!start || !fs.existsSync(start)) return null;
  const home = path.resolve(os.homedir());
  let current = path.resolve(start);
  while (true) {
    if (current === home || isTempPath(current)) break;
    if (
      fs.existsSync(path.join(current, ".git")) ||
      fs.existsSync(path.join(current, "MEMORY.md")) ||
      fs.existsSync(path.join(current, "conversations"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function resolveProjectRoot(payload) {
  const candidates = [
    ...(Array.isArray(payload.workspacePaths) ? payload.workspacePaths : []),
    payload.workspacePath,
    payload.cwd,
    payload.workingDirectory,
    process.cwd(),
  ].filter((value) => typeof value === "string" && value.trim());

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (!fs.existsSync(resolved) || isTempPath(resolved)) continue;
    try {
      const gitRoot = execFileSync("git", ["-C", resolved, "rev-parse", "--show-toplevel"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 3000,
      }).trim();
      if (gitRoot && path.resolve(gitRoot) !== path.resolve(os.homedir())) return path.resolve(gitRoot);
    } catch {
      // Non-git workspaces are supported below.
    }
    const marked = nearestMarkedRoot(resolved);
    if (marked) return marked;
    return resolved;
  }
  return null;
}

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
      const content = redact(textFrom(record.content ?? record.message ?? record));
      if (content) assistant = { content, order: recordOrder(record) };
    }
  }

  const userText = user?.content || redact(payload.prompt || payload.userPrompt || "");
  const assistantText = assistant?.content || redact(payload.promptResponse || payload.response || "");
  return { userText, assistantText, order: assistant?.order ?? user?.order ?? -1 };
}

function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function ensureScaffold(root, date) {
  const project = path.basename(root);
  ensureFile(path.join(root, "MEMORY.md"), `# MEMORY.md - 프로젝트 장기기억\n\n## 프로젝트 목표\n\n| 목표 | 상태 |\n|------|------|\n| ${project} 핵심 작업 추적 | 진행 중 |\n\n## 키워드 인덱스\n\n| 키워드 | 상세 파일 |\n|--------|-----------|\n| 프로젝트, 생성일 | #meta |\n\n## architecture/\n- [memory/architecture.md](memory/architecture.md)\n\n## patterns/\n- [memory/patterns.md](memory/patterns.md)\n\n## tools/\n- [memory/tools.md](memory/tools.md)\n\n## gotchas/\n- [memory/gotchas.md](memory/gotchas.md)\n\n## meta/\n- **프로젝트**: ${project}\n- **생성일**: ${date}\n- **마지막 업데이트**: ${date}\n`);
  const memoryDir = path.join(root, "memory");
  ensureFile(path.join(memoryDir, "architecture.md"), "# Architecture - 설계 결정\n\n---\n");
  ensureFile(path.join(memoryDir, "patterns.md"), "# Patterns - 작업 패턴, 워크플로우\n\n---\n");
  ensureFile(path.join(memoryDir, "tools.md"), "# Tools - 외부 도구, 라이브러리\n\n---\n");
  ensureFile(path.join(memoryDir, "gotchas.md"), "# Gotchas - 주의사항, 함정\n\n---\n");
}

function appendTurn(root, payload, turn) {
  if (!turn.userText && !turn.assistantText) return;
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8);
  ensureScaffold(root, date);
  const conversationDir = path.join(root, "conversations");
  fs.mkdirSync(conversationDir, { recursive: true });
  const filePath = path.join(conversationDir, `${date}-antigravity.md`);
  ensureFile(filePath, `---\ndate: ${date}\nproject: ${path.basename(root)}\nkeywords: []\nsummary: ""\n---\n\n# ${date}\n`);

  const identity = [payload.conversationId || "unknown", turn.order, turn.userText, turn.assistantText].join("\0");
  const marker = `<!-- antigravity-turn:${crypto.createHash("sha1").update(identity).digest("hex")} -->`;
  const existing = fs.readFileSync(filePath, "utf8");
  if (existing.includes(marker)) return;

  const parts = ["", marker];
  if (turn.userText) parts.push(`## [${time}] User`, "", turn.userText);
  if (turn.assistantText) parts.push("", `## [${time}] Assistant`, "", turn.assistantText);
  parts.push("");
  fs.appendFileSync(filePath, parts.join("\n"), "utf8");
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

function main() {
  let root = null;
  try {
    if (enabled()) {
      const payload = readPayload();
      root = resolveProjectRoot(payload);
      if (root) appendTurn(root, payload, latestTurn(payload));
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
