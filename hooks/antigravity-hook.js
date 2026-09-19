#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

function readPayload() {
  const input = fs.readFileSync(0, "utf8").trim();
  return input ? JSON.parse(input) : {};
}

function emit(value) {
  process.stdout.write(JSON.stringify(value));
}

function workspaceRoot(payload) {
  const candidate = Array.isArray(payload.workspacePaths)
    ? payload.workspacePaths[0]
    : payload.workspacePath || payload.cwd;
  return path.resolve(candidate || process.cwd());
}

function toolPaths(payload) {
  const args = payload.toolCall?.args || payload.tool_call?.args || payload.toolInput || {};
  const values = [];
  function visit(value, key = "", depth = 0) {
    if (depth > 4 || value == null) return;
    if (typeof value === "string") {
      if (/(?:file|path|target|destination)/i.test(key)) values.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, key, depth + 1);
      return;
    }
    if (typeof value === "object") {
      for (const [childKey, child] of Object.entries(value)) visit(child, childKey, depth + 1);
    }
  }
  visit(args);
  return [...new Set(values)];
}

function safety(payload) {
  const protectedNames = /^(?:\.env(?:\..*)?|credentials\.json|secrets?\.(?:ya?ml|json)|.*\.(?:key|pem|p12))$/i;
  const protectedSegments = new Set([".git", "node_modules", "__pycache__", ".venv", "venv"]);
  const warnings = [];
  for (const candidate of toolPaths(payload)) {
    const normalized = candidate.replace(/\\/g, "/");
    const segments = normalized.split("/").filter(Boolean);
    const fileName = segments.at(-1) || "";
    if (protectedNames.test(fileName) || segments.some((segment) => protectedSegments.has(segment))) {
      return {
        decision: "deny",
        reason: `Olympus protected-file policy blocked modification of ${candidate}`,
      };
    }
    const resolved = path.resolve(workspaceRoot(payload), candidate);
    if (!fs.existsSync(resolved) && /(?:util|helper|common|shared)/i.test(fileName)) {
      warnings.push(`New utility-like file: ${candidate}. Check whether an existing composition point should own the logic.`);
    }
  }
  recordAnchorTargets(payload);
  return warnings.length > 0
    ? { decision: "allow", reason: warnings.join("\n") }
    : { decision: "allow" };
}

// ── 앵커 조회 (Antigravity 어댑터) ─────────────────────────────────────
// Claude는 PostToolUse 하나로 끝난다 — 도구 인자를 받고 additionalContext로 주입한다.
// Antigravity는 그 둘이 다른 이벤트에 나뉘어 있다:
//   PostToolUse  → toolCall.args 를 받지만 출력이 빈 객체라 주입할 수 없다
//   PostInvocation → injectSteps 로 주입할 수 있지만 어떤 도구였는지 모른다
// 그래서 두 단이다. 앞단이 경로만 적고, 뒷단이 그걸 읽어 넘긴다.
//
// 앞단은 새 프로세스를 띄우지 않는다. 이미 편집 도구에만 걸려 도는 safety 훅에 얹는다
// (matcher: write_to_file|replace_file_content|multi_replace_file_content).
// 근거: memory/architecture/057-hook-budget-llm-never-process-rarely-constant-time-per-tool.md
const ANCHOR_INDEX = "memory/.mnemo-anchor-index.md";
const ANCHOR_PENDING = "memory/.mnemo-anchor-pending";
const ANCHOR_SEEN = "memory/.mnemo-anchor-seen";

function relativeToRoot(candidate, root) {
  const normalized = String(candidate || "").replace(/\\/g, "/").trim();
  if (!normalized) return null;
  const base = root.replace(/\\/g, "/").replace(/\/+$/, "");
  if (normalized.toLowerCase().startsWith(`${base.toLowerCase()}/`)) {
    return normalized.slice(base.length + 1);
  }
  if (/^(?:\/|[A-Za-z]:\/)/.test(normalized)) return null; // 루트 밖
  return normalized.replace(/^\.\//, "");
}

function recordAnchorTargets(payload) {
  try {
    const root = workspaceRoot(payload);
    if (!fs.existsSync(path.join(root, ANCHOR_INDEX))) return; // 색인이 없으면 할 일도 없다
    const pending = path.join(root, ANCHOR_PENDING);
    const existing = fs.existsSync(pending)
      ? fs.readFileSync(pending, "utf8").split(/\r?\n/).filter(Boolean)
      : [];
    const added = [];
    for (const candidate of toolPaths(payload)) {
      const target = relativeToRoot(candidate, root);
      if (!target) continue;
      if (/^(?:memory|conversations|docs\/handoffs)\//.test(target)) continue;
      if (existing.includes(target) || added.includes(target)) continue;
      added.push(target);
    }
    if (added.length === 0) return;
    fs.appendFileSync(pending, `${added.join("\n")}\n`, "utf8");
  } catch {
    // 안전 훅의 판정을 앵커 기록 실패로 막지 않는다.
  }
}

function anchorSection(indexText, target) {
  const lines = indexText.split(/\r?\n/);
  const found = [];
  let collecting = false;
  for (const line of lines) {
    if (collecting) {
      if (line.startsWith("## ")) break;
      if (line.startsWith("- ")) found.push(line);
    } else if (line === `## ${target}`) {
      collecting = true;
    }
  }
  return found;
}

function anchor(payload) {
  // PostInvocation: 앞단이 적어 둔 경로를 읽어 대화 흐름에 한 줄 끼워 넣는다.
  // 같은 파일은 한 대화에서 한 번만 — 매 호출 반복하면 잡음이 된다.
  const empty = {};
  try {
    const root = workspaceRoot(payload);
    const pending = path.join(root, ANCHOR_PENDING);
    if (!fs.existsSync(pending)) return empty;
    const targets = fs.readFileSync(pending, "utf8").split(/\r?\n/).filter(Boolean);
    fs.rmSync(pending, { force: true });
    if (targets.length === 0) return empty;

    const indexPath = path.join(root, ANCHOR_INDEX);
    if (!fs.existsSync(indexPath)) return empty;
    const indexText = fs.readFileSync(indexPath, "utf8");

    const seenPath = path.join(root, ANCHOR_SEEN);
    const conversation = String(payload.conversationId || "unknown");
    let seen = [];
    if (fs.existsSync(seenPath)) {
      seen = fs.readFileSync(seenPath, "utf8").split(/\r?\n/).filter(Boolean);
    }
    if (seen[0] !== conversation) seen = [conversation];

    const blocks = [];
    for (const target of targets) {
      if (seen.includes(target)) continue;
      const found = anchorSection(indexText, target);
      if (found.length === 0) continue;
      seen.push(target);
      blocks.push(`${target}\n${found.join("\n")}`);
    }
    if (blocks.length === 0) return empty;
    fs.writeFileSync(seenPath, `${seen.join("\n")}\n`, "utf8");
    const message = "이 파일에 기대는 결정입니다. 뒤집는다면 해당 기억 항목에 SUPERSEDED와 바꾼 이유를 남기세요.\n"
      + blocks.join("\n\n");
    return { injectSteps: [{ ephemeralMessage: message }] };
  } catch {
    return empty; // 주입 실패가 실행을 막지 않는다
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (pair) values[pair[1]] = pair[2].trim().replace(/^"|"$/g, "");
  }
  return { values, prompt: match[2].trim() };
}

function textFrom(value, depth = 0) {
  if (depth > 5 || value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => textFrom(item, depth + 1)).filter(Boolean).join("\n");
  if (typeof value !== "object") return "";
  for (const key of ["text", "content", "message", "response", "output"]) {
    const found = textFrom(value[key], depth + 1);
    if (found) return found;
  }
  return "";
}

function lastModelOutput(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return "";
  let output = "";
  for (const line of fs.readFileSync(transcriptPath, "utf8").split(/\r?\n/)) {
    if (!line) continue;
    try {
      const record = JSON.parse(line);
      const source = String(record.source || record.role || record.step?.source || "").toUpperCase();
      const type = String(record.type || record.step?.type || "").toUpperCase();
      if ((source === "MODEL" && !/(?:TOOL|COMMAND|FUNCTION|THOUGHT|REASONING)/.test(type)) || source === "ASSISTANT") {
        const found = textFrom(record.content ?? record.message ?? record.step ?? record);
        if (found) output = found;
      }
    } catch {
      // Ignore malformed transcript lines.
    }
  }
  return output;
}

function findStateFile(root) {
  for (const relative of [".chronos/loop-state.md", ".claude/loop-state.md", ".codex/loop-state.md"]) {
    const candidate = path.join(root, relative);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function chronos(payload) {
  const statePath = findStateFile(workspaceRoot(payload));
  if (!statePath) return { decision: "allow" };
  const parsed = parseFrontmatter(fs.readFileSync(statePath, "utf8"));
  if (!parsed || !parsed.prompt) {
    fs.rmSync(statePath, { force: true });
    return { decision: "allow", reason: "Chronos state was invalid and has been disabled." };
  }
  const values = parsed.values;
  const iteration = Number(values.iteration);
  const maximum = Number(values.max_iterations);
  if (!Number.isInteger(iteration) || !Number.isInteger(maximum)) {
    fs.rmSync(statePath, { force: true });
    return { decision: "allow", reason: "Chronos state counters were invalid and the loop was disabled." };
  }
  if (values.session_id && payload.conversationId && values.session_id !== payload.conversationId) {
    return { decision: "allow" };
  }
  if (values.started_at) {
    const started = Date.parse(values.started_at);
    if (Number.isFinite(started) && Date.now() - started >= 2 * 60 * 60 * 1000) {
      fs.rmSync(statePath, { force: true });
      return { decision: "allow", reason: "Chronos EXHAUSTED: the two-hour loop limit was reached." };
    }
  }
  const output = lastModelOutput(payload.transcriptPath);
  const promise = values.completion_promise;
  const promiseMatch = output.match(/<promise>([\s\S]*?)<\/promise>/i);
  const promiseSatisfied = promise && promise !== "null" && promiseMatch && (
    promiseMatch[1].trim().includes(promise) || promise.includes(promiseMatch[1].trim())
  );
  if (/Chronos Complete/i.test(output) || promiseSatisfied) {
    fs.rmSync(statePath, { force: true });
    return { decision: "allow" };
  }
  if (maximum > 0 && iteration >= maximum) {
    fs.rmSync(statePath, { force: true });
    return { decision: "allow", reason: `Chronos EXHAUSTED: maximum iteration count ${maximum} reached.` };
  }

  const next = iteration + 1;
  const content = fs.readFileSync(statePath, "utf8").replace(/^iteration:\s*\d+$/m, `iteration: ${next}`);
  fs.writeFileSync(statePath, content, "utf8");
  const maxLabel = maximum > 0 ? String(maximum) : "unlimited";
  let reason = `${parsed.prompt}\n\nChronos loop ${next}/${maxLabel}: verify the previous result and continue with the next highest-priority issue. Report Chronos Complete only after external verification.`;
  if (promise && promise !== "null") reason += ` Verified completion may be reported as <promise>${promise}</promise>.`;
  return { decision: "continue", reason };
}

try {
  const operation = process.argv[2] || "safety";
  const payload = readPayload();
  // anchor(PostInvocation)는 판정 훅이 아니다 — 실패해도 빈 객체를 내고 실행을 막지 않는다.
  if (operation === "anchor") emit(anchor(payload));
  else emit(operation === "chronos" ? chronos(payload) : safety(payload));
} catch (error) {
  console.error(`[antigravity-hook] ${error.message || error}`);
  emit(process.argv[2] === "anchor" ? {} : { decision: "allow" });
}
