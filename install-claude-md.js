#!/usr/bin/env node
// install-claude-md.js
// 글로벌 CLAUDE.md에 장기기억 규칙을 추가하는 헬퍼 스크립트
//
// 사용법:
//   node install-claude-md.js <claude-md-path> <template-path>
//   node install-claude-md.js <claude-md-path> <template-path> --uninstall

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "사용법: node install-claude-md.js <claude-md-path> <template-path> [--uninstall]"
  );
  process.exit(1);
}

const claudeMdPath = args[0];
const templatePath = args[1];
const isUninstall = args.includes("--uninstall");

// 마커 (설치된 규칙 식별용)
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
  // 마커 사이의 내용 제거
  const regex = new RegExp(
    `\\n?${START_MARKER}[\\s\\S]*?${END_MARKER}\\n?`,
    "g"
  );
  return content.replace(regex, "").trim();
}

function main() {
  let claudeMd = readFile(claudeMdPath);

  if (isUninstall) {
    // 설치된 규칙만 제거
    const cleaned = removeInstalledRules(claudeMd);
    writeFile(claudeMdPath, cleaned + "\n");
    console.log("      CLAUDE.md에서 장기기억 규칙 제거 완료");
    return;
  }

  // 템플릿 읽기
  const template = readFile(templatePath);
  if (!template) {
    console.error("      템플릿 파일을 찾을 수 없습니다:", templatePath);
    process.exit(1);
  }

  // 기존 규칙 제거 (재설치 시 중복 방지)
  claudeMd = removeInstalledRules(claudeMd);

  // 새 규칙 추가
  const rulesBlock = `\n${START_MARKER}\n${template}\n${END_MARKER}`;
  claudeMd = claudeMd.trim() + rulesBlock + "\n";

  writeFile(claudeMdPath, claudeMd);
  console.log("      CLAUDE.md에 장기기억 규칙 추가 완료");
}

main();
