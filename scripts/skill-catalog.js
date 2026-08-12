"use strict";

const fs = require("fs");
const path = require("path");
const { extractFrontmatterDescription } = require("./agent-catalog");

// These modules have executable runtimes that must survive a dormant-library
// refresh. They stay outside CLI skill discovery while keeping dependency
// caches such as node_modules across source updates.
const EXECUTABLE_RUNTIME_MODULES = new Set(["orchestrator"]);

function collectSkillFiles(skillsSrcDir) {
  const files = new Map();
  if (!fs.existsSync(skillsSrcDir)) return files;

  for (const entry of fs.readdirSync(skillsSrcDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(skillsSrcDir, entry.name, "SKILL.md");
    if (fs.existsSync(skillMd)) {
      files.set(entry.name, skillMd);
    }
  }

  return new Map(
    Array.from(files.entries()).sort((a, b) => a[0].localeCompare(b[0])),
  );
}

function displayPath(filePath) {
  return path.resolve(filePath).replace(/\\/g, "/").replace(/\|/g, "／");
}

function assertSkillDirectoryName(name) {
  if (path.basename(name) !== name || name === "." || name === "..") {
    throw new Error(`Invalid skill directory name: ${name}`);
  }
}

function validateSkillSourceLibrary(sourceRoot, skillFiles) {
  const copied = new Map();
  for (const [name] of skillFiles.entries()) {
    assertSkillDirectoryName(name);
    const skillMd = path.join(sourceRoot, name, "SKILL.md");
    const stat = fs.statSync(skillMd);
    if (!stat.isFile()) {
      throw new Error(`Dormant skill source is not a file: ${skillMd}`);
    }
    copied.set(name, skillMd);
  }

  const actualNames = fs
    .readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  const expectedNames = Array.from(skillFiles.keys()).sort((a, b) =>
    a.localeCompare(b),
  );
  if (
    actualNames.length !== expectedNames.length ||
    actualNames.some((name, index) => name !== expectedNames[index])
  ) {
    throw new Error(
      `Dormant skill source validation failed: expected ${expectedNames.length} directories, found ${actualNames.length}`,
    );
  }

  return copied;
}

function syncExecutableRuntimeModule(destHome, name, skillMd) {
  if (!EXECUTABLE_RUNTIME_MODULES.has(name)) return null;

  const runtimeRoot = path.join(path.resolve(destHome), ".olympus", "runtime-modules");
  const destDir = path.join(runtimeRoot, name);
  const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const stagingDir = path.join(runtimeRoot, `.${name}.staging-${nonce}`);
  const backupDir = path.join(runtimeRoot, `.${name}.backup-${nonce}`);
  const srcDir = path.dirname(skillMd);
  const relativeCache = path.join("mcp-server", "node_modules");
  let movedExisting = false;
  let movedCache = false;
  let committed = false;

  fs.mkdirSync(runtimeRoot, { recursive: true });
  try {
    fs.cpSync(srcDir, stagingDir, {
      recursive: true,
      force: true,
      filter: (src) => !src.split(path.sep).includes("node_modules"),
    });
    if (!fs.existsSync(path.join(stagingDir, "SKILL.md"))) {
      throw new Error(`Executable runtime module is incomplete: ${stagingDir}`);
    }

    if (fs.existsSync(destDir)) {
      fs.renameSync(destDir, backupDir);
      movedExisting = true;
      const previousCache = path.join(backupDir, relativeCache);
      if (fs.existsSync(previousCache)) {
        const nextCache = path.join(stagingDir, relativeCache);
        fs.mkdirSync(path.dirname(nextCache), { recursive: true });
        fs.renameSync(previousCache, nextCache);
        movedCache = true;
      }
    }

    fs.renameSync(stagingDir, destDir);
    committed = true;
    if (movedExisting) {
      try {
        fs.rmSync(backupDir, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 50,
        });
      } catch (error) {
        console.warn(
          `[skill-catalog] stale runtime-module backup retained: ${backupDir} (${error.message})`,
        );
      }
      movedExisting = false;
    }
    return destDir;
  } catch (error) {
    if (committed && fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
      committed = false;
    }
    if (movedExisting && fs.existsSync(backupDir)) {
      if (movedCache) {
        const stagedCache = path.join(stagingDir, relativeCache);
        const backupCache = path.join(backupDir, relativeCache);
        if (fs.existsSync(stagedCache)) {
          fs.mkdirSync(path.dirname(backupCache), { recursive: true });
          fs.renameSync(stagedCache, backupCache);
        }
      }
      fs.renameSync(backupDir, destDir);
      movedExisting = false;
    }
    throw error;
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    if (!committed && movedExisting && fs.existsSync(backupDir) && !fs.existsSync(destDir)) {
      fs.renameSync(backupDir, destDir);
    }
  }
}

function syncSkillSourceLibrary(destHome, skillFiles) {
  const olympusRoot = path.join(path.resolve(destHome), ".olympus");
  const sourceRoot = path.join(olympusRoot, "source-skills");
  const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const stagingRoot = path.join(olympusRoot, `.source-skills.staging-${nonce}`);
  const backupRoot = path.join(olympusRoot, `.source-skills.backup-${nonce}`);
  let movedExisting = false;
  let committed = false;

  fs.mkdirSync(olympusRoot, { recursive: true });
  fs.mkdirSync(stagingRoot, { recursive: true });

  try {
    for (const [name, skillMd] of skillFiles.entries()) {
      assertSkillDirectoryName(name);
      if (!fs.existsSync(skillMd)) {
        throw new Error(`Skill source not found: ${skillMd}`);
      }
      const srcDir = path.dirname(skillMd);
      const destDir = path.join(stagingRoot, name);
      fs.cpSync(srcDir, destDir, {
        recursive: true,
        force: true,
        filter: (src) => !src.split(path.sep).includes("node_modules"),
      });
    }
    validateSkillSourceLibrary(stagingRoot, skillFiles);

    if (fs.existsSync(sourceRoot)) {
      fs.renameSync(sourceRoot, backupRoot);
      movedExisting = true;
    }
    let copied;
    try {
      fs.renameSync(stagingRoot, sourceRoot);
      committed = true;
      copied = validateSkillSourceLibrary(sourceRoot, skillFiles);
    } catch (error) {
      if (committed) {
        fs.rmSync(sourceRoot, { recursive: true, force: true });
        committed = false;
      }
      if (movedExisting && fs.existsSync(backupRoot)) {
        fs.renameSync(backupRoot, sourceRoot);
        movedExisting = false;
      }
      throw error;
    }
    if (movedExisting) {
      try {
        fs.rmSync(backupRoot, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 50,
        });
      } catch (error) {
        // The new validated library is already committed. A locked stale backup
        // is safer than rolling back or failing an otherwise complete sync.
        console.warn(
          `[skill-catalog] stale source-library backup retained: ${backupRoot} (${error.message})`,
        );
      }
      movedExisting = false;
    }
    for (const [name, skillMd] of skillFiles.entries()) {
      syncExecutableRuntimeModule(destHome, name, skillMd);
    }
    return copied;
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
    if (!committed && movedExisting && fs.existsSync(backupRoot)) {
      if (!fs.existsSync(sourceRoot)) fs.renameSync(backupRoot, sourceRoot);
    }
  }
}

function generateSkillsCatalog(skillFiles, source = "installer", options = {}) {
  const entries = Array.from(skillFiles.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const activeSkillNames = new Set(options.activeSkillNames || []);
  const destHome = options.destHome ? path.resolve(options.destHome) : null;
  const activeCount = entries.filter(([name]) => activeSkillNames.has(name)).length;
  const sourceOnlyCount = entries.length - activeCount;
  const lines = [
    "# 사용 가능한 글로벌 스킬 카탈로그",
    "",
    `> 이 파일은 ${source} 설치 과정에서 자동 생성됩니다.`,
    "> active만 CLI의 상시 스킬 레지스트리에 들어갑니다. source-only는 사용자의 명시 요청 또는 active 하네스의 내부 모듈 계약에 따라 아래 원본 경로에서 직접 읽습니다.",
    "> active는 Olympus가 관리하는 설치 상태입니다. CLI별 사용자 설정(예: Claude `skillOverrides`)이 일부를 추가로 비활성화할 수 있으며 동기화기는 그 사용자 선택을 보존합니다.",
    "> source-only를 모두 런타임에 복원하려면 설치 또는 동기화 명령에 `--include-source-only-skills`를 지정하세요.",
    "> 일부 CLI는 미등록 `/이름`을 모델 전달 전에 거부합니다. source-only를 직접 요청할 때는 자연어를 사용하고, active 하네스는 slash 호출 없이 정확한 원본을 읽습니다. 네이티브 슬래시 메뉴가 필요하면 위 opt-in으로 활성화하세요.",
    "",
    `기본 활성 스킬: ${activeCount}개.`,
    `source-only 스킬: ${sourceOnlyCount}개.`,
    "",
    "| 스킬 | 상태 | 설명 | 읽을 경로 |",
    "|------|------|------|-----------|",
  ];

  for (const [name, srcPath] of entries) {
    const active = activeSkillNames.has(name);
    const status = active ? "active" : "source-only";
    const skillPath = active && destHome
      ? path.join(destHome, "skills", name, "SKILL.md")
      : srcPath;
    const description = extractFrontmatterDescription(srcPath, true);
    lines.push(
      `| ${name} | ${status} | ${description} | ${displayPath(skillPath)} |`,
    );
  }

  lines.push("");
  lines.push(`_생성 시각: ${new Date().toISOString()}_`);
  lines.push("");
  return lines.join("\n");
}

function writeSkillsCatalog(destHome, skillFiles, source = "installer", options = {}) {
  fs.mkdirSync(destHome, { recursive: true });
  const catalogPath = path.join(destHome, "SKILLS-CATALOG.md");
  fs.writeFileSync(
    catalogPath,
    generateSkillsCatalog(skillFiles, source, { ...options, destHome }),
    "utf8",
  );
  return catalogPath;
}

module.exports = {
  collectSkillFiles,
  generateSkillsCatalog,
  syncExecutableRuntimeModule,
  syncSkillSourceLibrary,
  writeSkillsCatalog,
};
