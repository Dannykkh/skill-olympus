#!/usr/bin/env node
"use strict";

// 레시피 라이브러리 도구 — where / init / index / check <dir> / search <단어...>
// 의존성 없이 Node만으로 돈다. 모든 CLI(Claude·Codex·Antigravity·Grok)가 같은 라이브러리를 쓰도록
// 위치는 CODE_RECIPES_DIR 하나로만 바꾼다.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const KINDS = Object.freeze(["ui", "backend", "mcp", "infra"]);
const REUSE = Object.freeze(["personal", "company-internal", "public"]);
const REQUIRED_FIELDS = Object.freeze([
  "id", "kind", "title", "tags", "version", "updated", "source", "reuse", "when",
]);
const REQUIRED_SECTIONS = Object.freeze([
  "언제 쓰나", "쓰지 않을 때", "계약", "구조", "값", "상태와 흐름",
  "결정과 이유", "함정", "옮길 때", "견본",
]);

// 형식이 분명한 비밀값만 오류로 본다. 견본 테스트의 가짜 비밀번호까지 막으면 쓸모없는 경고가 쌓인다.
const SECRET_PATTERNS = Object.freeze([
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "개인 키"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS 액세스 키"],
  [/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{24,}/, "API 키(sk-)"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, "GitHub 토큰"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, "Slack 토큰"],
]);
const WARN_PATTERNS = Object.freeze([
  [/\b[A-Za-z]:\\Users\\[^\\\s"'`]+/, "Windows 사용자 경로"],
  [/(?:^|[\s"'`(])\/(?:Users|home)\/[^/\s"'`]+\//, "macOS·Linux 사용자 경로"],
  [/(?:password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"'\s<>{}]{8,}["']/i, "비밀값 같은 할당"],
]);
const EMAIL = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b/g;
const FAKE_EMAIL_DOMAIN = /@(?:[\w-]+\.)*(?:example\.(?:com|org|net)|test|invalid|localhost)$/i;

function libraryRoot(env = process.env) {
  return path.resolve(env.CODE_RECIPES_DIR || path.join(os.homedir(), "code-recipes"));
}

// 머리는 맨 앞 --- 사이의 `키: 값` 줄만 읽는다. YAML 전체를 지원하지 않는다.
function parseHeader(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0].trim() !== "---") return null;
  const header = {};
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "---") return header;
    const match = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (match) header[match[1]] = match[2].trim();
  }
  return null;
}

function tagsOf(header) {
  return String(header.tags || "")
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function listRecipes(root) {
  const recipes = [];
  for (const kind of KINDS) {
    const kindDir = path.join(root, kind);
    if (!fs.existsSync(kindDir)) continue;
    for (const entry of fs.readdirSync(kindDir, { withFileTypes: true })) {
      const recipeFile = path.join(kindDir, entry.name, "recipe.md");
      if (!entry.isDirectory() || !fs.existsSync(recipeFile)) continue;
      const header = parseHeader(fs.readFileSync(recipeFile, "utf8")) || {};
      recipes.push({ dir: path.join(kindDir, entry.name), kind, id: entry.name, header });
    }
  }
  return recipes.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

function initLibrary(root) {
  fs.mkdirSync(root, { recursive: true });
  for (const kind of KINDS) fs.mkdirSync(path.join(root, kind), { recursive: true });
  if (!fs.existsSync(path.join(root, "index.md"))) buildIndex(root);
  return root;
}

function cell(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function buildIndex(root) {
  const rows = listRecipes(root).map(({ kind, id, header }) =>
    `| \`${id}\` | ${kind} | ${cell(header.title)} | ${cell(header.when)} | ${cell(tagsOf(header).join(", "))} | ${cell(header.version)} | ${cell(header.updated)} | ${cell(header.reuse)} |`,
  );
  const text = [
    "# Recipe Index",
    "",
    "> `recipe-lib.js index`가 각 레시피의 `recipe.md` 머리에서 다시 만듭니다. 손으로 고치지 마세요.",
    "",
    "| id | kind | 제목 | 언제 쓰나 | tags | v | 갱신 | 사용 범위 |",
    "|----|------|------|-----------|------|---|------|-----------|",
    ...rows,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(root, "index.md"), text, "utf8");
  return rows.length;
}

function walkFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      files.push(...walkFiles(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function readText(file) {
  const stat = fs.statSync(file);
  if (stat.size > 1024 * 1024) return null;
  const buffer = fs.readFileSync(file);
  if (buffer.includes(0)) return null;
  return buffer.toString("utf8");
}

function checkRecipe(dir) {
  const errors = [];
  const warnings = [];
  const recipeFile = path.join(dir, "recipe.md");
  if (!fs.existsSync(recipeFile)) {
    return { errors: ["recipe.md 없음"], warnings };
  }
  const text = fs.readFileSync(recipeFile, "utf8");
  const header = parseHeader(text);
  if (!header) {
    errors.push("recipe.md 맨 앞에 --- 로 감싼 머리가 없음");
  } else {
    for (const field of REQUIRED_FIELDS) {
      if (!header[field]) errors.push(`머리 필드 없음: ${field}`);
    }
    if (header.kind && !KINDS.includes(header.kind)) errors.push(`kind는 ${KINDS.join("·")} 중 하나: ${header.kind}`);
    if (header.reuse && !REUSE.includes(header.reuse)) errors.push(`reuse는 ${REUSE.join("·")} 중 하나: ${header.reuse}`);
    if (header.version && !/^\d+$/.test(header.version)) errors.push(`version은 정수: ${header.version}`);
    if (header.updated && !/^\d{4}-\d{2}-\d{2}$/.test(header.updated)) errors.push(`updated는 YYYY-MM-DD: ${header.updated}`);
    if (header.id && header.id !== path.basename(dir)) errors.push(`id(${header.id})와 폴더 이름(${path.basename(dir)})이 다름`);
    if (header.kind && header.kind !== path.basename(path.dirname(dir))) {
      errors.push(`kind(${header.kind})와 상위 폴더 이름(${path.basename(path.dirname(dir))})이 다름`);
    }
  }
  const headings = new Set(
    text.split(/\r?\n/).filter((line) => line.startsWith("## ")).map((line) => line.slice(3).trim()),
  );
  for (const section of REQUIRED_SECTIONS) {
    if (!headings.has(section)) errors.push(`섹션 없음: ## ${section}`);
  }
  if (!/^검증:\s*\S/m.test(text)) errors.push("## 견본에 `검증:` 줄 없음 (실행 못 했으면 `검증: NOT RUN — 이유`)");

  const sampleDir = path.join(dir, "sample");
  const sampleFiles = fs.existsSync(sampleDir) ? walkFiles(sampleDir) : [];
  if (sampleFiles.length === 0) {
    errors.push("sample/ 견본 없음");
  } else if (header && header.kind === "ui") {
    if (!fs.existsSync(path.join(sampleDir, "preview.html"))) errors.push("ui 견본은 sample/preview.html 필요");
  } else if (header && (header.kind === "backend" || header.kind === "mcp")) {
    if (!sampleFiles.some((file) => /(test|spec)/i.test(path.basename(file)))) {
      errors.push(`${header.kind} 견본에는 테스트 파일(이름에 test·spec) 필요`);
    }
  }

  for (const file of walkFiles(dir)) {
    const content = readText(file);
    if (content === null) continue;
    const rel = path.relative(dir, file).replace(/\\/g, "/");
    for (const [pattern, label] of SECRET_PATTERNS) {
      if (pattern.test(content)) errors.push(`${rel}: ${label} 형태 발견 — 수확 전에 지우세요`);
    }
    for (const [pattern, label] of WARN_PATTERNS) {
      if (pattern.test(content)) warnings.push(`${rel}: ${label} — 원래 프로젝트 흔적이 아닌지 확인`);
    }
    const realEmails = (content.match(EMAIL) || []).filter((email) => !FAKE_EMAIL_DOMAIN.test(email));
    if (realEmails.length > 0) warnings.push(`${rel}: 이메일 ${realEmails[0]} — 가짜 주소(example.com)인지 확인`);
  }
  return { errors, warnings };
}

function searchIndex(root, words) {
  const indexFile = path.join(root, "index.md");
  if (!fs.existsSync(indexFile)) return [];
  const needles = words.map((word) => word.toLowerCase());
  return fs
    .readFileSync(indexFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("| `"))
    .filter((line) => needles.every((needle) => line.toLowerCase().includes(needle)));
}

function main(argv) {
  const [command, ...rest] = argv;
  const root = libraryRoot();
  switch (command) {
    case "where":
      console.log(`${root}${fs.existsSync(root) ? "" : "  (아직 없음 — 첫 수확 때 init)"}`);
      return 0;
    case "init":
      console.log(`라이브러리: ${initLibrary(root)}`);
      return 0;
    case "index": {
      if (!fs.existsSync(root)) {
        console.error(`라이브러리 없음: ${root}`);
        return 1;
      }
      console.log(`index.md: 레시피 ${buildIndex(root)}건`);
      return 0;
    }
    case "check": {
      if (!rest[0]) {
        console.error("사용법: recipe-lib.js check <레시피 폴더>");
        return 2;
      }
      const { errors, warnings } = checkRecipe(path.resolve(rest[0]));
      for (const message of errors) console.log(`오류: ${message}`);
      for (const message of warnings) console.log(`경고: ${message}`);
      console.log(`검사: 오류 ${errors.length}, 경고 ${warnings.length}`);
      return errors.length > 0 ? 1 : 0;
    }
    case "search": {
      const rows = searchIndex(root, rest);
      for (const row of rows) console.log(row);
      if (rows.length === 0) console.log("일치하는 레시피 없음");
      return 0;
    }
    default:
      console.error("사용법: recipe-lib.js <where|init|index|check <dir>|search <단어...>>");
      return 2;
  }
}

module.exports = {
  KINDS,
  REQUIRED_FIELDS,
  REQUIRED_SECTIONS,
  libraryRoot,
  parseHeader,
  listRecipes,
  initLibrary,
  buildIndex,
  checkRecipe,
  searchIndex,
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
