#!/usr/bin/env node
"use strict";

const { spawn } = require("child_process");

const env = { ...process.env };
if (!env.MODE) env.MODE = "stdio";
if (!env.DEFAULT_SEARCH_ENGINE) env.DEFAULT_SEARCH_ENGINE = "duckduckgo";

const child =
  process.platform === "win32"
    ? spawn(
        "cmd.exe",
        ["/d", "/s", "/c", "npx -y open-websearch@latest"],
        { env, stdio: ["pipe", "pipe", "pipe"] }
      )
    : spawn("npx", ["-y", "open-websearch@latest"], {
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });

process.stdin.pipe(child.stdin);
child.stderr.on("data", (chunk) => process.stderr.write(chunk));

let pendingText = "";

function isJsonRpcLine(line) {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && parsed.jsonrpc === "2.0";
  } catch {
    return false;
  }
}

function flushLine(rawLine) {
  const line = rawLine.replace(/\r$/, "");
  if (line.length === 0) return;
  if (isJsonRpcLine(line)) {
    process.stdout.write(`${line}\n`);
  } else {
    process.stderr.write(`${line}\n`);
  }
}

child.stdout.on("data", (chunk) => {
  pendingText += chunk.toString("utf8");
  let lineEnd = pendingText.indexOf("\n");
  while (lineEnd !== -1) {
    const rawLine = pendingText.slice(0, lineEnd);
    pendingText = pendingText.slice(lineEnd + 1);
    flushLine(rawLine);
    lineEnd = pendingText.indexOf("\n");
  }
});

child.stdout.on("end", () => {
  if (pendingText.length > 0) {
    flushLine(pendingText);
    pendingText = "";
  }
});

child.on("error", (error) => {
  console.error(`[open-websearch-wrapper] failed to start: ${error.message}`);
  process.exit(1);
});

child.on("close", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
