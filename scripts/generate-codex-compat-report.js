#!/usr/bin/env node
"use strict";

// Backward-compatible entrypoint. The old generator used a second inventory
// model and could overwrite the canonical audit with stale agent assumptions.
const path = require("path");
const { spawnSync } = require("child_process");

const auditScript = path.join(__dirname, "audit-codex-compatibility.js");
const defaultReport = path.join(
  __dirname,
  "..",
  "docs",
  "codex-compatibility-report.md",
);
const forwardedArgs = process.argv.slice(2);

if (!forwardedArgs.includes("--write")) {
  forwardedArgs.push("--write", defaultReport);
}

console.error(
  "[deprecated] generate-codex-compat-report.js delegates to audit-codex-compatibility.js",
);
const result = spawnSync(process.execPath, [auditScript, ...forwardedArgs], {
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
