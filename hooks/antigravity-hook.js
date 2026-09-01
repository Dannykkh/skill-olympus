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
  return warnings.length > 0
    ? { decision: "allow", reason: warnings.join("\n") }
    : { decision: "allow" };
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
  emit(operation === "chronos" ? chronos(payload) : safety(payload));
} catch (error) {
  console.error(`[antigravity-hook] ${error.message || error}`);
  emit({ decision: "allow" });
}
