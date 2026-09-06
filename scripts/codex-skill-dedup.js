"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const START = "# OLYMPUS-CODEX-SKILL-DEDUP:START";
const END = "# OLYMPUS-CODEX-SKILL-DEDUP:END";
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const pathKey = (value) => {
  let absolute = path.resolve(value);
  try { absolute = fs.realpathSync(absolute); } catch { /* Missing paths still identify user overrides. */ }
  return process.platform === "win32" ? absolute.toLowerCase() : absolute;
};

function managedFingerprint(body) {
  const entries = [];
  let entry;
  for (const source of body.split(/\r?\n/)) {
    const line = source.trim();
    if (!line) continue;
    if (/^\[\[\s*skills\s*\.\s*config\s*\]\]$/.test(line)) {
      entry = {};
      entries.push(entry);
      continue;
    }
    const assignment = line.match(/^(path|enabled)\s*=\s*(.*)$/);
    if (!entry || !assignment || Object.hasOwn(entry, assignment[1])) {
      throw new Error("duplicate-skill config block was edited; preserving user settings");
    }
    const [, key, value] = assignment;
    if (key === "path") {
      entry.path = /^'[^']*'$/.test(value) ? value.slice(1, -1) : JSON.parse(value);
    } else {
      if (value !== "true" && value !== "false") throw new Error("edited duplicate-skill enabled value; preserving config");
      entry.enabled = value === "true";
    }
  }
  if (entries.some((value) => typeof value.path !== "string" || typeof value.enabled !== "boolean")) {
    throw new Error("incomplete duplicate-skill config block; preserving config");
  }
  return digest(JSON.stringify(entries.map((value) => [value.path, value.enabled])));
}

// Only remove our unedited fragment. User settings elsewhere remain byte-for-byte
// intact; an edited fragment is treated as a user decision, not overwritten.
function withoutManagedBlock(text) {
  if (!text.includes(START) && !text.includes(END)) return text;
  const pattern = /^# OLYMPUS-CODEX-SKILL-DEDUP:START sha256=([a-f0-9]{64})\r?\n([\s\S]*?)^# OLYMPUS-CODEX-SKILL-DEDUP:END(?:\r?\n|$)/gm;
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== 1 || text.split(START).length !== 2 || text.split(END).length !== 2) {
    throw new Error("duplicate-skill config markers are ambiguous; preserving config");
  }
  const match = matches[0];
  // Codex's TOML writer can insert new MCP sections before the trailing END
  // comment. These are outside our skill tables and must survive reconciliation.
  const foreignHeader = [...match[2].matchAll(/^[ \t]*\[/gm)].find((header) =>
    !/^\[\[\s*skills\s*\.\s*config\s*\]\][ \t]*(?:\r?\n|$)/.test(match[2].slice(header.index).trimStart()),
  );
  const managed = foreignHeader ? match[2].slice(0, foreignHeader.index) : match[2];
  const foreign = foreignHeader ? match[2].slice(foreignHeader.index) : "";
  if (managedFingerprint(managed) !== match[1]) {
    throw new Error("duplicate-skill config block was edited; preserving user settings");
  }
  const suffix = text.slice(match.index + match[0].length);
  // An assignment after the fragment still belongs to its last array table.
  if (!/^(?:\s|#[^\n]*(?:\n|$))*(?:\[|$)/.test(suffix)) {
    throw new Error("settings follow the duplicate-skill table without a new section; preserving config");
  }
  return text.slice(0, match.index) + foreign + suffix;
}

// A conservative lexical reader, not a TOML reserializer. Mask comments and
// strings (including multiline prompts) before recognizing section headers.
// Unsupported skill override forms cause a visible skip instead of guessing.
function userOverrides(text) {
  const strings = [];
  let masked = "";
  for (let i = 0; i < text.length;) {
    const char = text[i];
    if (char === "#") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (char === '"' || char === "'") {
      const start = i;
      const triple = text.slice(i, i + 3) === char.repeat(3);
      const width = triple ? 3 : 1;
      i += width;
      const bodyStart = i;
      let closed = false;
      while (i < text.length) {
        if (char === '"' && text[i] === "\\") { i += 2; continue; }
        if (text.slice(i, i + width) === char.repeat(width)) {
          i += width;
          if (triple) {
            for (let extra = 0; extra < 2 && text[i] === char; extra++) i++;
          }
          closed = true;
          break;
        }
        if (!triple && text[i] === "\n") break;
        i++;
      }
      if (!closed) throw new Error("cannot safely read config strings; preserving config");
      let value = null;
      if (!triple) {
        try {
          value = char === "'" ? text.slice(bodyStart, i - 1) : JSON.parse(text.slice(start, i));
        } catch { /* Unsupported TOML escapes are never guessed for paths. */ }
      }
      masked += `@${strings.length}` + "\n".repeat((text.slice(start, i).match(/\n/g) || []).length);
      strings.push(value);
    } else {
      masked += char;
      i++;
    }
  }
  const keys = (source) => source.split(".").map((part) => {
    const key = part.trim();
    return /^@\d+$/.test(key) ? strings[Number(key.slice(1))] : key;
  });
  const overrides = new Set();
  let section = [];
  let skillEntry = null;
  let depth = 0;
  const finish = () => {
    if (skillEntry && !skillEntry.path) throw new Error("skill override has no readable absolute path; preserving config");
    if (skillEntry) overrides.add(pathKey(skillEntry.path));
  };
  for (const source of masked.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = source.trim();
    if (!line) continue;
    const header = depth === 0 && line.match(/^(\[\[?)(.*?)\]\]?$/);
    if (header) {
      finish();
      section = keys(header[2]);
      skillEntry = null;
      if (section[0] === "skills" && section[1] === "config") {
        if (header[1] !== "[[" || section.length !== 2) {
          throw new Error("unsupported skills.config section; preserving config");
        }
        skillEntry = {};
      }
      continue;
    }
    const assignment = depth === 0 && line.match(/^([^=]+)=(.*)$/);
    if (assignment) {
      const key = keys(assignment[1]);
      const fullKey = [...section, ...key];
      if (!skillEntry && fullKey[0] === "skills" && fullKey[1] === "config") {
        throw new Error("inline or dotted skills.config overrides require manual review; preserving config");
      }
      if (fullKey.length === 1 && fullKey[0] === "skills") {
        throw new Error("inline skills configuration requires manual review; preserving config");
      }
      if (skillEntry && key[0] === "path") {
        const token = assignment[2].trim();
        const value = /^@\d+$/.test(token) ? strings[Number(token.slice(1))] : null;
        if (key.length !== 1 || typeof value !== "string" || !path.isAbsolute(value)) {
          throw new Error("skill override path is not a supported absolute string; preserving config");
        }
        skillEntry.path = value;
      }
    }
    for (const char of line) {
      if (char === "[" || char === "{") depth++;
      if (char === "]" || char === "}") depth--;
    }
    if (depth < 0) throw new Error("unbalanced config; preserving config");
  }
  finish();
  if (depth !== 0) throw new Error("unbalanced config; preserving config");
  return overrides;
}

function readSkills(root) {
  if (!fs.existsSync(root)) return [];
  const skills = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || (!entry.isDirectory() && !entry.isSymbolicLink())) continue;
    const directory = path.join(root, entry.name);
    const skillPath = path.join(directory, "SKILL.md");
    if (!fs.existsSync(skillPath)) continue;
    const text = fs.readFileSync(skillPath, "utf8").replace(/^\uFEFF/, "");
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const name = frontmatter?.[1].match(/^name:\s*(?:"([a-zA-Z0-9_-]+)"|'([a-zA-Z0-9_-]+)'|([a-zA-Z0-9_-]+))\s*(?:#[^\r\n]*)?$/m);
    if (name) skills.push({ name: name[1] || name[2] || name[3], directory, skillPath });
  }
  return skills;
}

function treeHash(directory) {
  const hash = crypto.createHash("sha256");
  const visit = (current, relative) => {
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`linked resource needs manual review: ${current}`);
    if (stat.isDirectory()) {
      hash.update(`directory\0${relative}\0`);
      for (const name of fs.readdirSync(current).sort()) visit(path.join(current, name), `${relative}/${name}`);
    } else if (stat.isFile()) {
      hash.update(`file\0${relative}\0${stat.mode & 0o111}\0${stat.size}\0`);
      hash.update(fs.readFileSync(current));
    } else {
      throw new Error(`unsupported resource needs manual review: ${current}`);
    }
  };
  visit(fs.realpathSync(directory), "");
  return hash.digest("hex");
}

function writeConfig(configPath, original, updated) {
  if (original === updated) return null;
  const exists = fs.existsSync(configPath);
  const mode = exists ? fs.statSync(configPath).mode & 0o777 : 0o600;
  const nonce = `${Date.now()}-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  const backup = exists ? path.join(path.dirname(configPath), ".olympus", "backups", `config.toml.skill-dedup-${nonce}.bak`) : null;
  if (backup) {
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.writeFileSync(backup, original, { encoding: "utf8", flag: "wx", mode });
  }
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const temporary = `${configPath}.skill-dedup-${nonce}.tmp`;
  try {
    fs.writeFileSync(temporary, updated, { encoding: "utf8", flag: "wx", mode });
    const current = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
    if (current !== original) throw new Error("config changed during duplicate inspection; retry sync");
    fs.renameSync(temporary, configPath);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  return backup;
}

function reconcileCodexSkillDuplicates({ codexHome, userHome = os.homedir(), unlink = false, log = console.log, warn = console.warn }) {
  const configPath = path.join(codexHome, "config.toml");
  const result = { disabled: 0, conflicts: 0, userOverrides: 0, changed: false };
  if (fs.existsSync(configPath) && fs.lstatSync(configPath).isSymbolicLink()) {
    warn("[codex-dedup] linked config.toml requires manual review; preserving config");
    return result;
  }
  const original = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  let base;
  let overrides;
  try {
    base = withoutManagedBlock(original);
    overrides = userOverrides(base);
  } catch (error) {
    warn(`[codex-dedup] ${error.message}`);
    return result;
  }
  const disabled = [];
  if (!unlink) {
    const roots = [path.join(codexHome, "skills"), path.join(userHome, ".agents", "skills")];
    let inventories;
    try { inventories = roots.map(readSkills); } catch (error) {
      warn(`[codex-dedup] cannot inspect skills; preserving config (${error.code || "read error"})`);
      return result;
    }
    const groups = new Map();
    inventories.forEach((skills, root) => skills.forEach((skill) => {
      if (!groups.has(skill.name)) groups.set(skill.name, []);
      groups.get(skill.name).push({ ...skill, root });
    }));
    for (const [name, copies] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
      if (!copies.some((s) => s.root === 0) || !copies.some((s) => s.root === 1)) continue;
      if (copies.length !== 2) {
        result.conflicts++;
        warn(`[codex-dedup] ${name}: more than two registrations; preserving all copies`);
        continue;
      }
      if (copies.some((skill) => overrides.has(pathKey(skill.skillPath)))) {
        result.userOverrides++;
        continue;
      }
      const [retained, redundant] = copies;
      try {
        if (pathKey(fs.realpathSync(retained.directory)) === pathKey(fs.realpathSync(redundant.directory))) continue;
        if (treeHash(retained.directory) !== treeHash(redundant.directory)) {
          result.conflicts++;
          warn(`[codex-dedup] ${name}: contents differ; preserving both registrations: ${retained.skillPath} | ${redundant.skillPath}`);
          continue;
        }
        disabled.push(redundant.skillPath);
      } catch (error) {
        result.conflicts++;
        warn(`[codex-dedup] ${name}: comparison incomplete; preserving both registrations (${error.message})`);
      }
    }
  }
  let updated = base;
  if (disabled.length) {
    const eol = original.includes("\r\n") ? "\r\n" : "\n";
    const body = disabled.map((skillPath) => `[[skills.config]]${eol}path = ${JSON.stringify(skillPath.replace(/\\/g, "/"))}${eol}enabled = false${eol}`).join(eol);
    const separator = !base || base.endsWith(eol + eol) ? "" : base.endsWith(eol) ? eol : eol + eol;
    updated += `${separator}${START} sha256=${managedFingerprint(body)}${eol}${body}${END}${eol}`;
  }
  // Writes fail the parent sync. Diagnostic skips above always explain why.
  const backup = writeConfig(configPath, original, updated);
  result.disabled = disabled.length;
  result.changed = updated !== original;
  log(`[codex-dedup] disabled=${result.disabled} conflicts=${result.conflicts} user_overrides=${result.userOverrides} changed=${result.changed}`);
  if (backup) log(`[codex-dedup] config_backup=${backup}`);
  return result;
}

module.exports = { reconcileCodexSkillDuplicates };
