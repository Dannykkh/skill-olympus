"use strict";

const fs = require("fs");
const path = require("path");

function listDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function collectAgentFiles(agentsSrcDir, skillsSrcDir) {
  const files = new Map();

  if (fs.existsSync(agentsSrcDir)) {
    for (const name of fs.readdirSync(agentsSrcDir).sort()) {
      const src = path.join(agentsSrcDir, name);
      if (name.toLowerCase() === "memory.md") continue;
      if (name.toLowerCase().endsWith(".md") && fs.statSync(src).isFile()) {
        files.set(name, src);
      }
    }
  }

  for (const skillName of listDirectories(skillsSrcDir)) {
    const embeddedAgentsDir = path.join(skillsSrcDir, skillName, "agents");
    if (!fs.existsSync(embeddedAgentsDir)) continue;
    for (const name of fs.readdirSync(embeddedAgentsDir).sort()) {
      const src = path.join(embeddedAgentsDir, name);
      if (name.toLowerCase().endsWith(".md") && fs.statSync(src).isFile()) {
        if (files.has(name)) continue;
        files.set(name, src);
      }
    }
  }

  return files;
}

module.exports = { collectAgentFiles };
