"use strict";

const fs = require("fs");
const path = require("path");

function extractFrontmatterDescription(filePath, fallbackHeading = true) {
  if (!fs.existsSync(filePath)) return "";
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length && i < 30; i += 1) {
      const match = lines[i].match(/^description:\s*(.*)/);
      if (!match) continue;

      const value = match[1].trim().replace(/^["']|["']$/g, "");
      if (value && value !== ">" && value !== "|") {
        return value.replace(/\|/g, "／").slice(0, 120);
      }

      const descLines = [];
      for (let j = i + 1; j < lines.length && j < i + 10; j += 1) {
        const next = lines[j];
        if (!/^\s+\S/.test(next)) break;
        descLines.push(next.trim());
      }
      if (descLines.length > 0) {
        return descLines.join(" ").replace(/\|/g, "／").slice(0, 120);
      }
    }

    if (fallbackHeading) {
      const headingMatch = content.match(/^#\s+(.+)$/m);
      if (headingMatch) {
        return headingMatch[1].trim().replace(/\|/g, "／").slice(0, 120);
      }
    }
    return "";
  } catch {
    return "";
  }
}

function generateAgentsCatalog(agentFiles, source = "installer", options = {}) {
  const entries = Array.from(agentFiles.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const activeAgentNames = new Set(
    options.activeAgentNames || entries.map(([name]) => name),
  );
  const activeCount = entries.filter(([name]) => activeAgentNames.has(name)).length;
  const sourceOnlyCount = entries.length - activeCount;
  const lines = [
    "# 사용 가능한 글로벌 에이전트 카탈로그",
    "",
    `> 이 파일은 ${source} 설치 과정에서 자동 생성됩니다.`,
    "> 이 목록은 Olympus가 복사한 사용자 정의 에이전트 소스와 런타임 상태를 구분해 보여줍니다.",
    "> 0개는 정상 기본값입니다. 일반 분업은 CLI 네이티브 서브에이전트, 절차는 명시형 스킬을 사용하세요.",
    "",
    `총 ${activeCount}개 에이전트가 설치되어 있습니다.`,
    `복사된 source-only 참고 파일: ${sourceOnlyCount}개.`,
    "",
    "| 에이전트 | 상태 | 설명 | 경로 |",
    "|----------|------|------|------|",
  ];

  for (const [name, srcPath] of entries) {
    const agentName = name.replace(/\.md$/i, "");
    const desc = extractFrontmatterDescription(srcPath, false);
    const status = activeAgentNames.has(name) ? "active" : "source-only";
    lines.push(`| ${agentName} | ${status} | ${desc} | agents/${name} |`);
  }

  lines.push("");
  lines.push(`_생성 시각: ${new Date().toISOString()}_`);
  lines.push("");
  return lines.join("\n");
}

function writeAgentsCatalog(destHome, agentFiles, source = "installer", options = {}) {
  fs.mkdirSync(destHome, { recursive: true });
  const catalogPath = path.join(destHome, "AGENTS-CATALOG.md");
  fs.writeFileSync(
    catalogPath,
    generateAgentsCatalog(agentFiles, source, options),
    "utf8",
  );
  return catalogPath;
}

module.exports = {
  extractFrontmatterDescription,
  generateAgentsCatalog,
  writeAgentsCatalog,
};
