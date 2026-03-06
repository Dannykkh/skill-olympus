#!/usr/bin/env node
// install-claude-md.js
// Helper script to add long-term memory rules to the global CLAUDE.md
//
// Usage:
//   node install-claude-md.js <claude-md-path> <template-path>
//   node install-claude-md.js <claude-md-path> <template-path> --uninstall

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "Usage: node install-claude-md.js <claude-md-path> <template-path> [--uninstall]"
  );
  process.exit(1);
}

const claudeMdPath = args[0];
const templatePath = args[1];
const isUninstall = args.includes("--uninstall");

// Markers (to identify installed rules)
const START_MARKER = "<!-- MNEMO:START -->";
const END_MARKER = "<!-- MNEMO:END -->";

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, "utf8");
}

function removeInstalledRules(content) {
  // Remove content between markers
  const regex = new RegExp(
    `\\n?${START_MARKER}[\\s\\S]*?${END_MARKER}\\n?`,
    "g"
  );
  return content.replace(regex, "").trim();
}

function main() {
  let claudeMd = readFile(claudeMdPath);

  if (isUninstall) {
    // Remove installed rules only
    const cleaned = removeInstalledRules(claudeMd);
    writeFile(claudeMdPath, cleaned + "\n");
    console.log("      Long-term memory rules removed from CLAUDE.md");
    return;
  }

  // Read template
  const template = readFile(templatePath);
  if (!template) {
    console.error("      Template file not found:", templatePath);
    process.exit(1);
  }

  // Remove existing rules (prevent duplicates on reinstall)
  claudeMd = removeInstalledRules(claudeMd);

  // Add new rules
  const rulesBlock = `\n${START_MARKER}\n${template}\n${END_MARKER}`;
  claudeMd = claudeMd.trim() + rulesBlock + "\n";

  writeFile(claudeMdPath, claudeMd);
  console.log("      Long-term memory rules added to CLAUDE.md");
}

main();
