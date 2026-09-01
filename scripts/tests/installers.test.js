const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  appendTurn: appendAntigravityTurn,
  latestTurn: latestAntigravityTurn,
} = require("../../skills/antigravity-mnemo/hooks/save-turn");
const { collectAgentFiles } = require("../agent-files");
const { pruneStaleAssets } = require("../prune-stale-assets");
const {
  DEFAULT_DISABLED_PASSIVE_AGENTS,
  DEFAULT_DISABLED_NATIVE_OVERLAP_AGENTS,
  DEFAULT_DISABLED_REDUNDANT_SPECIALIST_AGENTS,
  DEFAULT_DISABLED_WORKFLOW_SUPPORT_AGENTS,
  DEFAULT_RUNTIME_AGENT_ALLOWLIST,
  DEFAULT_SOURCE_ONLY_AGENTS,
  selectRuntimeAgents,
} = require("../agent-install-policy");
const {
  DEFAULT_COMMON_RUNTIME_SKILLS,
  DEFAULT_DISABLED_BROAD_CODING_SKILLS,
  DEFAULT_RUNTIME_SKILL_ALLOWLIST,
  RUNTIME_SKILL_ADDITIONS,
  RUNTIME_SKILL_EXCLUSIONS,
  selectRuntimeSkills,
} = require("../skill-install-policy");

const repoRoot = path.resolve(__dirname, "..", "..");
const installBat = path.join(repoRoot, "install.bat");
const installAntigravityMcp = path.join(repoRoot, "install-mcp-antigravity.js");
const generateCatalogs = path.join(repoRoot, "scripts", "generate-catalogs.js");
const installHooksConfig = path.join(repoRoot, "install-hooks-config.js");
const syncClaudeAgents = path.join(repoRoot, "scripts", "sync-claude-agents.js");
const syncClaudeSkills = path.join(repoRoot, "scripts", "sync-claude-skills.js");
const syncCodexAssets = path.join(repoRoot, "scripts", "sync-codex-assets.js");
const syncAntigravityAssets = path.join(repoRoot, "scripts", "sync-antigravity-assets.js");
const installAntigravityMnemo = path.join(repoRoot, "skills", "antigravity-mnemo", "install.js");
const expectedSourceOnlySkillCount = fs.existsSync(
  path.join(repoRoot, "skills", "deploymonitor", "SKILL.md"),
)
  ? 77
  : 76;
const expectedSourceOnlySkillPattern = new RegExp(
  `source-only 스킬: ${expectedSourceOnlySkillCount}개`,
);

function findFileWithContent(root, expectedContent, requiredPathPart = "") {
  if (!fs.existsSync(root)) return null;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(candidate);
      } else if (
        candidate.includes(requiredPathPart) &&
        fs.readFileSync(candidate, "utf8") === expectedContent
      ) {
        return candidate;
      }
    }
  }
  return null;
}

function assertDormantOrchestratorModule(home, runtimeName) {
  const sourceRoot = path.join(
    home,
    ".olympus",
    "source-skills",
    "orchestrator",
  );
  const runtimeRoot = path.join(
    home,
    ".olympus",
    "runtime-modules",
    "orchestrator",
  );
  assert.equal(
    fs.existsSync(path.join(sourceRoot, "SKILL.md")),
    true,
    `${runtimeName} did not publish the source-only orchestrator entry point`,
  );
  assert.equal(
    fs.existsSync(path.join(sourceRoot, "mcp-server", "dist", "index.js")),
    true,
    `${runtimeName} did not publish the source-only orchestrator MCP build`,
  );
  assert.equal(
    fs.existsSync(path.join(runtimeRoot, "SKILL.md")),
    true,
    `${runtimeName} did not publish the non-discovery orchestrator runtime mirror`,
  );
  assert.equal(
    fs.existsSync(path.join(runtimeRoot, "mcp-server", "dist", "index.js")),
    true,
    `${runtimeName} runtime mirror does not contain the orchestrator MCP build`,
  );
  assert.equal(
    fs.existsSync(path.join(home, "skills", "orchestrator")),
    false,
    `${runtimeName} unexpectedly registered orchestrator as an active skill`,
  );
}

test("install.bat --help exits before changing runtime homes", () => {
  if (process.platform !== "win32") {
    test.skip("Windows-only installer test");
    return;
  }

  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-install-help-test-"));
  const env = {
    ...process.env,
    HOME: tempHome,
    USERPROFILE: tempHome,
    CODEX_HOME: path.join(tempHome, ".codex"),
    ANTIGRAVITY_HOME: path.join(tempHome, ".gemini"),
    OLYMPUS_UPDATE_CHECK_DISABLE: "1",
  };

  try {
    const command = `call "${installBat}" --help`;
    const result = spawnSync("cmd.exe", ["/d", "/c", command], {
      cwd: repoRoot,
      env,
      encoding: "utf8",
      timeout: 30_000,
      windowsVerbatimArguments: true,
    });
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;

    assert.equal(result.status, 0, output);
    assert.match(output, /Usage: install\.bat \[options\]/);
    assert.doesNotMatch(output, /Installing Skills|Installation complete/);
    for (const runtimeHome of [".claude", ".codex", ".gemini", ".grok"]) {
      assert.equal(fs.existsSync(path.join(tempHome, runtimeHome)), false);
    }
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});

test("codex-only install.bat succeeds without a preexisting .claude directory", () => {
  if (process.platform !== "win32") {
    test.skip("Windows-only installer test");
    return;
  }

  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-install-test-"));
  const env = {
    ...process.env,
    HOME: tempHome,
    USERPROFILE: tempHome,
    // Codex CLI on Windows does not consistently derive its state directory
    // from a replaced USERPROFILE. Pin CODEX_HOME so installer tests cannot
    // rewrite the developer's real ~/.codex/config.toml.
    CODEX_HOME: path.join(tempHome, ".codex"),
  };
  // Grok has no independent Olympus sync target and reads ~/.claude through
  // compat.claude. A Codex-only selection must still prepare that shared home
  // when Grok is installed.
  fs.mkdirSync(path.join(tempHome, ".grok"), { recursive: true });
  const projectManifestPath = path.join(
    repoRoot,
    ".agents",
    ".codex-sync-manifest.json",
  );
  const projectManifestBefore = fs.existsSync(projectManifestPath)
    ? fs.readFileSync(projectManifestPath)
    : null;

  try {

  // NoDefaultCurrentDirectoryInExePath=1 환경에서는 cmd가 cwd에서 .bat를 찾지 않으므로
  // 상대 이름이 아니라 절대경로로 호출해야 한다 (gotcha 036).
  const command = `echo.| call "${installBat}" --llm codex`;
  const result = spawnSync("cmd.exe", ["/d", "/c", command], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    timeout: 120000,
    // Node 기본 이스케이프가 command 안의 따옴표를 \"로 바꿔 cmd가 못 읽음 -> 원문 그대로 전달
    windowsVerbatimArguments: true,
  });

  assert.equal(
    result.status,
    0,
    `install.bat failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  assert.equal(
    fs.existsSync(path.join(tempHome, ".codex", "hooks", "save-turn.ps1")),
    true,
    "Codex save-turn hook was not installed",
  );

  const agentsMd = fs.readFileSync(
    path.join(tempHome, ".codex", "AGENTS.md"),
    "utf8",
  );
  assert.match(
    agentsMd,
    /\/agent-team`, `\/poseidon`, `포세이돈`, `poseidon` → `agent-team-codex`/,
    "Codex agent-team alias did not resolve to agent-team-codex",
  );
  assert.match(
    agentsMd,
    /Native-First 구현 경계/,
    "Codex global instructions did not include the compact implementation boundary",
  );
  assert.equal(
    fs.existsSync(path.join(tempHome, ".codex", "skills", "zephermine", "SKILL.md")),
    true,
    "Codex global skill was not installed",
  );
  assert.equal(
    fs.existsSync(path.join(tempHome, ".codex", "skills", "react-dev", "SKILL.md")),
    false,
    "Broad React guide should not be installed by default",
  );
  assert.equal(
    fs.existsSync(
      path.join(tempHome, ".codex", "skills", "test-driven-development", "SKILL.md"),
    ),
    false,
    "Broad TDD guide should not be installed by default",
  );
  const codexManifest = JSON.parse(
    fs.readFileSync(path.join(tempHome, ".codex", ".codex-sync-manifest.json"), "utf8"),
  );
  const allRepoSkillNames = fs
    .readdirSync(path.join(repoRoot, "skills"), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(repoRoot, "skills", entry.name, "SKILL.md")),
    )
    .map((entry) => entry.name)
    .sort();
  const expectedCodexSkills = selectRuntimeSkills(
    allRepoSkillNames,
    RUNTIME_SKILL_EXCLUSIONS.codex,
  ).skillNames;
  assert.deepEqual(codexManifest.managedSkills, expectedCodexSkills);
  assert.equal(codexManifest.managedSkills.length, 20);
  const codexSkillsCatalog = fs.readFileSync(
    path.join(tempHome, ".codex", "SKILLS-CATALOG.md"),
    "utf8",
  );
  assert.match(codexSkillsCatalog, /기본 활성 스킬: 20개/);
  assert.match(codexSkillsCatalog, expectedSourceOnlySkillPattern);
  assert.match(codexSkillsCatalog, /\.olympus\/source-skills\/docx\/SKILL\.md/);
  assertDormantOrchestratorModule(path.join(tempHome, ".codex"), "Codex");
  const grokCompatRules = fs.readFileSync(
    path.join(tempHome, ".claude", "CLAUDE.md"),
    "utf8",
  );
  assert.match(grokCompatRules, /Native-First 구현 경계/);
  const grokCompatCatalog = fs.readFileSync(
    path.join(tempHome, ".claude", "SKILLS-CATALOG.md"),
    "utf8",
  );
  assert.match(grokCompatCatalog, /기본 활성 스킬: 21개/);
  assert.match(grokCompatCatalog, expectedSourceOnlySkillPattern);
  assert.match(grokCompatCatalog, /\.olympus\/source-skills\/docx\/SKILL\.md/);
  assertDormantOrchestratorModule(path.join(tempHome, ".claude"), "Claude/Grok");
  assert.equal(fs.existsSync(path.join(tempHome, ".claude", "agents")), false);
  assert.equal(
    fs.existsSync(path.join(repoRoot, ".agents", "skills", "zephermine", "SKILL.md")),
    false,
    "Codex skill was duplicated into the repository .agents/skills directory",
  );
  for (const name of DEFAULT_SOURCE_ONLY_AGENTS) {
    assert.equal(
      fs.existsSync(path.join(tempHome, ".codex", "agents", name)),
      false,
      `${name} should not be installed by default`,
    );
  }
  assert.equal(
    fs.existsSync(path.join(repoRoot, ".agents", "agents")),
    false,
    "Codex agents were duplicated into the repository .agents/agents directory",
  );

  const optInResult = spawnSync(
    process.execPath,
    [
      syncCodexAssets,
      "--include-broad-coding-skills",
      "--include-broad-coding-agents",
    ],
    { cwd: repoRoot, env, encoding: "utf8", timeout: 120000 },
  );
  assert.equal(
    optInResult.status,
    0,
    `Codex broad-skill opt-in failed\nstdout:\n${optInResult.stdout}\nstderr:\n${optInResult.stderr}`,
  );
  assert.equal(
    fs.existsSync(path.join(tempHome, ".codex", "skills", "react-dev", "SKILL.md")),
    true,
    "Broad React guide was not restored by opt-in",
  );
  for (const name of DEFAULT_SOURCE_ONLY_AGENTS) {
    assert.equal(
      fs.existsSync(path.join(tempHome, ".codex", "agents", name)),
      true,
      `${name} was not restored by opt-in`,
    );
  }

  const defaultResult = spawnSync(process.execPath, [syncCodexAssets], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    timeout: 120000,
  });
  assert.equal(defaultResult.status, 0);
  assert.equal(
    fs.existsSync(path.join(tempHome, ".codex", "skills", "react-dev", "SKILL.md")),
    false,
    "Returning to default policy did not remove the opt-in guide",
  );
  for (const name of DEFAULT_SOURCE_ONLY_AGENTS) {
    assert.equal(
      fs.existsSync(path.join(tempHome, ".codex", "agents", name)),
      false,
      `Returning to default policy did not remove ${name}`,
    );
  }

  const projectAgentOptInResult = spawnSync(
    process.execPath,
    [
      syncCodexAssets,
      "--include-project-agents",
      "--include-source-only-agents",
    ],
    { cwd: repoRoot, env, encoding: "utf8", timeout: 120000 },
  );
  assert.equal(projectAgentOptInResult.status, 0);
  assert.equal(
    fs.existsSync(path.join(repoRoot, ".agents", "agents", "chronos-worker.md")),
    true,
    "Project agent mirror was not restored by explicit opt-in",
  );
  for (const name of DEFAULT_SOURCE_ONLY_AGENTS) {
    assert.equal(
      fs.existsSync(path.join(repoRoot, ".agents", "agents", name)),
      true,
      `Project mirror opt-in did not restore ${name}`,
    );
  }

  const removeProjectAgentMirrorResult = spawnSync(
    process.execPath,
    [syncCodexAssets],
    { cwd: repoRoot, env, encoding: "utf8", timeout: 120000 },
  );
  assert.equal(removeProjectAgentMirrorResult.status, 0);
  assert.equal(
    fs.existsSync(path.join(repoRoot, ".agents", "agents")),
    false,
    "Returning to default policy did not remove the project agent mirror",
  );

  // A stale directory must still be removed when a mismatched manifest has
  // already forgotten that it was managed (the real project/global split).
  const staleSkillDir = path.join(tempHome, ".codex", "skills", "react-dev");
  fs.mkdirSync(staleSkillDir, { recursive: true });
  fs.writeFileSync(path.join(staleSkillDir, "SKILL.md"), "stale managed copy");
  for (const name of RUNTIME_SKILL_EXCLUSIONS.codex) {
    const staleExcludedDir = path.join(tempHome, ".codex", "skills", name);
    fs.mkdirSync(staleExcludedDir, { recursive: true });
    fs.writeFileSync(path.join(staleExcludedDir, "SKILL.md"), "stale incompatible copy");
  }
  const staleCleanupResult = spawnSync(process.execPath, [syncCodexAssets], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    timeout: 120000,
  });
  assert.equal(staleCleanupResult.status, 0);
  assert.equal(
    fs.existsSync(staleSkillDir),
    false,
    "Policy cleanup trusted a stale manifest and left a disabled guide installed",
  );
  assert.ok(
    findFileWithContent(
      path.join(tempHome, ".codex", "_olympus-preserved"),
      "stale managed copy",
      `${path.sep}skills${path.sep}`,
    ),
    "Policy cleanup removed a same-name custom skill without preserving it",
  );
  for (const name of RUNTIME_SKILL_EXCLUSIONS.codex) {
    assert.equal(
      fs.existsSync(path.join(tempHome, ".codex", "skills", name)),
      false,
      `Codex retained incompatible skill ${name}`,
    );
  }

  const staleAgentPath = path.join(
    tempHome,
    ".codex",
    "agents",
    "react-best-practices.md",
  );
  fs.mkdirSync(path.dirname(staleAgentPath), { recursive: true });
  fs.writeFileSync(staleAgentPath, "stale managed copy");
  const staleAgentCleanupResult = spawnSync(process.execPath, [syncCodexAssets], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    timeout: 120000,
  });
  assert.equal(staleAgentCleanupResult.status, 0);
  assert.equal(
    fs.existsSync(staleAgentPath),
    false,
    "Policy cleanup trusted a stale manifest and left a disabled agent installed",
  );
  assert.ok(
    findFileWithContent(
      path.join(tempHome, ".codex", "_olympus-preserved"),
      "stale managed copy",
      `${path.sep}agents${path.sep}`,
    ),
    "Policy cleanup removed a same-name custom agent without preserving it",
  );
  } finally {
    if (projectManifestBefore === null) {
      fs.rmSync(projectManifestPath, { force: true });
    } else {
      fs.mkdirSync(path.dirname(projectManifestPath), { recursive: true });
      fs.writeFileSync(projectManifestPath, projectManifestBefore);
    }
  }
});

test("Antigravity-only install.bat writes the current Google CLI layout", () => {
  if (process.platform !== "win32") {
    test.skip("Windows-only installer test");
    return;
  }

  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-antigravity-bat-test-"));
  const shimDir = path.join(tempHome, "bin");
  const googleHome = path.join(tempHome, ".gemini");
  fs.mkdirSync(shimDir, { recursive: true });
  fs.writeFileSync(path.join(shimDir, "agy.cmd"), "@exit /b 0\r\n", "utf8");
  // Dependency installation is not part of this layout test. A failed optional
  // orchestrator build must not prevent the core Antigravity assets from landing.
  fs.writeFileSync(path.join(shimDir, "npm.cmd"), "@exit /b 97\r\n", "utf8");
  const env = {
    ...process.env,
    HOME: tempHome,
    USERPROFILE: tempHome,
    ANTIGRAVITY_HOME: googleHome,
    CODEX_HOME: path.join(tempHome, ".codex"),
    OLYMPUS_UPDATE_CHECK_DISABLE: "1",
    PATH: `${shimDir}${path.delimiter}${process.env.PATH || ""}`,
  };

  try {
    const command = `echo.| call "${installBat}" --llm antigravity`;
    const result = spawnSync("cmd.exe", ["/d", "/c", command], {
      cwd: repoRoot,
      env,
      encoding: "utf8",
      timeout: 120000,
      windowsVerbatimArguments: true,
    });
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    assert.equal(result.error, undefined, output);
    assert.equal(result.status, 0, output);

    assert.equal(
      fs.existsSync(path.join(googleHome, "antigravity-cli", "skills", "antigravity", "SKILL.md")),
      false,
      output,
    );
    assert.equal(
      fs.existsSync(
        path.join(
          googleHome,
          "antigravity-cli",
          ".olympus",
          "source-skills",
          "antigravity",
          "SKILL.md",
        ),
      ),
      true,
      "The Antigravity review adapter should remain available through the source-only catalog",
    );
    assert.equal(
      fs.existsSync(
        path.join(googleHome, "antigravity-cli", "skills", "antigravity-mnemo", "SKILL.md"),
      ),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(googleHome, "antigravity-cli", "skills", "gemini", "SKILL.md")),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(googleHome, "config", "hooks", "antigravity-hook.js")),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(googleHome, "config", "hooks", "olympus-save-turn.js")),
      true,
    );

    const hooks = JSON.parse(
      fs.readFileSync(path.join(googleHome, "config", "hooks.json"), "utf8"),
    );
    assert.equal(
      hooks["olympus-core"].PreToolUse[0].matcher,
      "write_to_file|replace_file_content|multi_replace_file_content",
    );
    assert.match(hooks["olympus-core"].Stop[0].command, /antigravity-hook\.js" chronos/);
    assert.match(
      hooks["olympus-antigravity-mnemo"].Stop[0].command,
      /olympus-save-turn\.js/,
    );

    const rules = fs.readFileSync(path.join(googleHome, "GEMINI.md"), "utf8");
    assert.match(rules, /ANTIGRAVITY-MNEMO:START/);
    for (const command of [
      "/goal",
      "/plan",
      "/grill-me",
      "/teamwork-preview",
      "/learn",
      "/schedule",
      "/browser",
    ]) {
      assert.ok(rules.includes(command), `installed Antigravity rules omit ${command}`);
    }
    const mcp = JSON.parse(
      fs.readFileSync(path.join(googleHome, "config", "mcp_config.json"), "utf8"),
    );
    assert.ok(mcp.mcpServers.context7);
    assert.match(output, /\[Antigravity\]/);
    assert.doesNotMatch(output, /not recognized as an internal or external command/i);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});

test("Codex global sync does not apply project-manifest ownership to another home", () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-codex-home-scope-test-"));
  const codexHome = path.join(tempHome, ".codex");
  const projectManifestPath = path.join(
    repoRoot,
    ".agents",
    ".codex-sync-manifest.json",
  );
  const projectManifestBefore = fs.existsSync(projectManifestPath)
    ? fs.readFileSync(projectManifestPath)
    : null;
  const localSkill = path.join(
    codexHome,
    "skills",
    "cross-home-local",
    "SKILL.md",
  );
  fs.mkdirSync(path.dirname(localSkill), { recursive: true });
  fs.writeFileSync(localSkill, "cross-home local skill", "utf8");
  fs.mkdirSync(path.dirname(projectManifestPath), { recursive: true });
  fs.writeFileSync(
    projectManifestPath,
    JSON.stringify({ managedSkills: ["cross-home-local"] }),
    "utf8",
  );

  try {
    const result = spawnSync(process.execPath, [syncCodexAssets], {
      cwd: repoRoot,
      env: { ...process.env, CODEX_HOME: codexHome },
      encoding: "utf8",
      timeout: 120000,
    });
    assert.equal(
      result.status,
      0,
      `Codex sync failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
    assert.equal(
      fs.readFileSync(localSkill, "utf8"),
      "cross-home local skill",
      "Project manifest ownership leaked into a different Codex home",
    );
    const globalManifest = JSON.parse(
      fs.readFileSync(path.join(codexHome, ".codex-sync-manifest.json"), "utf8"),
    );
    assert.equal(globalManifest.scope, "codex-home");
    assert.equal(globalManifest.scopeRoot, codexHome);
  } finally {
    if (projectManifestBefore === null) {
      fs.rmSync(projectManifestPath, { force: true });
    } else {
      fs.writeFileSync(projectManifestPath, projectManifestBefore);
    }
  }
});

test("Claude source-only policy preserves user-owned skill overrides without adding entries", () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-skill-policy-test-"));
  const settingsPath = path.join(tempHome, "settings.json");
  fs.writeFileSync(
    settingsPath,
    JSON.stringify({
      skillOverrides: {
        "react-dev": "off",
        "dotnet-coding-standards": "on",
        "systematic-debugging": "off",
      },
    }),
  );

  const result = spawnSync(
    process.execPath,
    [
      installHooksConfig,
      path.join(tempHome, "hooks"),
      settingsPath,
      "--windows",
      "--components",
      "mnemo",
      "--llms",
      "claude",
    ],
    { encoding: "utf8", timeout: 30000 },
  );

  assert.equal(
    result.status,
    0,
    `install-hooks-config failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  assert.equal(settings.skillOverrides["react-dev"], "off");
  assert.equal(settings.skillOverrides["dotnet-coding-standards"], "on");
  assert.equal(settings.skillOverrides["systematic-debugging"], "off");
  assert.equal(Object.keys(settings.skillOverrides).length, 3);
});

test("Antigravity hook config preserves unrelated groups and rejects the retired target", () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-antigravity-hooks-test-"));
  const hooksDir = path.join(tempHome, "config", "hooks");
  const configPath = path.join(tempHome, "config", "hooks.json");
  fs.mkdirSync(hooksDir, { recursive: true });
  fs.writeFileSync(path.join(hooksDir, "antigravity-hook.js"), "// fixture\n", "utf8");
  fs.writeFileSync(
    configPath,
    JSON.stringify({ thirdParty: { Stop: [{ type: "command", command: "node third-party.js" }] } }),
    "utf8",
  );

  const install = spawnSync(process.execPath, [
    installHooksConfig,
    hooksDir,
    configPath,
    "--bash",
    "--components",
    "all",
    "--target",
    "antigravity",
  ], { encoding: "utf8", timeout: 30000 });
  assert.equal(install.status, 0, install.stderr);
  const configured = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.ok(configured.thirdParty);
  assert.equal(
    configured["olympus-core"].PreToolUse[0].matcher,
    "write_to_file|replace_file_content|multi_replace_file_content",
  );
  assert.match(configured["olympus-core"].PreToolUse[0].hooks[0].command, /antigravity-hook\.js" safety/);
  assert.match(configured["olympus-core"].Stop[0].command, /antigravity-hook\.js" chronos/);

  const retired = spawnSync(process.execPath, [
    installHooksConfig,
    hooksDir,
    configPath,
    "--bash",
    "--target",
    "gemini",
  ], { encoding: "utf8", timeout: 30000 });
  assert.notEqual(retired.status, 0);
  assert.match(retired.stderr, /retired.*antigravity/i);

  const uninstall = spawnSync(process.execPath, [
    installHooksConfig,
    hooksDir,
    configPath,
    "--uninstall",
    "--target",
    "antigravity",
  ], { encoding: "utf8", timeout: 30000 });
  assert.equal(uninstall.status, 0, uninstall.stderr);
  const remaining = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.deepEqual(Object.keys(remaining), ["thirdParty"]);
});

test("Antigravity MCP adapter owns only the entries it installs", () => {
  const googleHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-antigravity-mcp-test-"));
  const env = { ...process.env, ANTIGRAVITY_HOME: googleHome };
  const configPath = path.join(googleHome, "config", "mcp_config.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    configPath,
    JSON.stringify({ mcpServers: { personal: { command: "personal-mcp" } } }),
    "utf8",
  );

  const install = spawnSync(process.execPath, [installAntigravityMcp, "context7", "playwright"], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(install.status, 0, install.stderr);
  let config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.deepEqual(config.mcpServers.personal, { command: "personal-mcp" });
  assert.equal(config.mcpServers.context7.command, "npx");
  assert.equal(config.mcpServers.playwright.command, "npx");

  config.mcpServers.context7.args.push("--user-modified");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  const uninstall = spawnSync(
    process.execPath,
    [installAntigravityMcp, "--uninstall", "context7", "playwright"],
    { cwd: repoRoot, env, encoding: "utf8", timeout: 30000 },
  );
  assert.equal(uninstall.status, 0, uninstall.stderr);
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.ok(config.mcpServers.context7, "modified managed entry should be preserved");
  assert.equal(Object.prototype.hasOwnProperty.call(config.mcpServers, "playwright"), false);
  assert.deepEqual(config.mcpServers.personal, { command: "personal-mcp" });
});

test("Antigravity Mnemo parses camelCase transcripts, redacts private blocks, and deduplicates", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-antigravity-turn-test-"));
  const transcriptPath = path.join(tempRoot, "transcript.jsonl");
  fs.writeFileSync(transcriptPath, [
    JSON.stringify({ step_index: 1, source: "USER_EXPLICIT", type: "USER_INPUT", content: "질문 <private>secret</private>" }),
    JSON.stringify({ step_index: 2, source: "MODEL", type: "THOUGHT", content: "internal reasoning" }),
    JSON.stringify({ step_index: 3, source: "MODEL", type: "MESSAGE", content: { text: "최종 답변" } }),
    "",
  ].join("\n"), "utf8");
  const payload = { conversationId: "conversation-1", transcriptPath };
  const turn = latestAntigravityTurn(payload);
  assert.equal(turn.userText, "질문 [PRIVATE]");
  assert.equal(turn.assistantText, "최종 답변");
  assert.equal(turn.order, 3);

  appendAntigravityTurn(tempRoot, payload, turn);
  appendAntigravityTurn(tempRoot, payload, turn);
  const date = new Date().toISOString().slice(0, 10);
  const saved = fs.readFileSync(
    path.join(tempRoot, "conversations", `${date}-antigravity.md`),
    "utf8",
  );
  assert.equal((saved.match(/antigravity-turn:/g) || []).length, 1);
  assert.match(saved, /질문 \[PRIVATE\]/);
  assert.doesNotMatch(saved, /secret|internal reasoning/);
  assert.equal(fs.existsSync(path.join(tempRoot, "MEMORY.md")), true);
});

test("Antigravity core hook blocks protected files and drives Chronos through Stop", () => {
  const adapter = path.join(repoRoot, "hooks", "antigravity-hook.js");
  const safety = spawnSync(process.execPath, [adapter, "safety"], {
    cwd: repoRoot,
    input: JSON.stringify({
      workspacePaths: [repoRoot],
      toolCall: { args: { filePath: ".env" } },
    }),
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(safety.status, 0, safety.stderr);
  assert.equal(JSON.parse(safety.stdout).decision, "deny");

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-antigravity-chronos-test-"));
  const stateDir = path.join(tempRoot, ".chronos");
  const statePath = path.join(stateDir, "loop-state.md");
  const transcriptPath = path.join(tempRoot, "transcript.jsonl");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath, [
    "---",
    "iteration: 0",
    "max_iterations: 2",
    "completion_promise: null",
    "session_id: conversation-1",
    "---",
    "계속 검증하고 수정한다.",
    "",
  ].join("\n"), "utf8");
  fs.writeFileSync(
    transcriptPath,
    `${JSON.stringify({ source: "MODEL", type: "MESSAGE", content: "아직 진행 중" })}\n`,
    "utf8",
  );
  const payload = JSON.stringify({
    conversationId: "conversation-1",
    workspacePaths: [tempRoot],
    transcriptPath,
  });
  const continued = spawnSync(process.execPath, [adapter, "chronos"], {
    cwd: repoRoot,
    input: payload,
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(continued.status, 0, continued.stderr);
  const continuedResult = JSON.parse(continued.stdout);
  assert.equal(continuedResult.decision, "continue");
  assert.match(continuedResult.reason, /계속 검증하고 수정한다\./);
  assert.equal(Object.hasOwn(continuedResult, "systemMessage"), false);
  assert.match(fs.readFileSync(statePath, "utf8"), /^iteration: 1$/m);

  fs.writeFileSync(
    transcriptPath,
    `${JSON.stringify({ source: "MODEL", type: "MESSAGE", content: "Chronos Complete" })}\n`,
    "utf8",
  );
  const completed = spawnSync(process.execPath, [adapter, "chronos"], {
    cwd: repoRoot,
    input: payload,
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(completed.status, 0, completed.stderr);
  assert.equal(JSON.parse(completed.stdout).decision, "allow");
  assert.equal(fs.existsSync(statePath), false);
});

test("shared runtime skill policy is fail-closed with narrow and full opt-ins", () => {
  assert.equal(DEFAULT_DISABLED_BROAD_CODING_SKILLS.length, 8);
  assert.deepEqual(DEFAULT_COMMON_RUNTIME_SKILLS, [
    "api-tester",
    "argos",
    "auto-continue-loop",
    "biz-strategy",
    "ceo",
    "clio",
    "design-plan",
    "explain",
    "hestia",
    "ko-en-translator",
    "minos",
    "release-notes",
    "seo-audit",
    "themis",
    "video-maker",
    "workpm",
    "zephermine",
    "zeus",
  ]);
  assert.equal(DEFAULT_RUNTIME_SKILL_ALLOWLIST.length, 24);
  assert.deepEqual(RUNTIME_SKILL_ADDITIONS.codex, [
    "agent-team-codex",
    "codex-mnemo",
  ]);

  const all = [
    "zephermine",
    "react-dev",
    "test-driven-development",
    "future-skill",
    "mnemo",
  ];
  const defaults = selectRuntimeSkills(all, ["mnemo"]);
  assert.deepEqual(defaults.skillNames, ["zephermine"]);
  assert.deepEqual(defaults.runtimeExcludedNames, ["mnemo"]);
  assert.deepEqual(defaults.defaultDisabledNames, [
    "react-dev",
    "test-driven-development",
    "future-skill",
  ]);

  const broadOptIn = selectRuntimeSkills(all, ["mnemo"], false, true);
  assert.deepEqual(broadOptIn.skillNames, [
    "zephermine",
    "react-dev",
    "test-driven-development",
  ]);
  assert.deepEqual(broadOptIn.defaultDisabledNames, ["future-skill"]);

  const fullOptIn = selectRuntimeSkills(all, ["mnemo"], true);
  assert.deepEqual(fullOptIn.skillNames, [
    "zephermine",
    "react-dev",
    "test-driven-development",
    "future-skill",
  ]);
  assert.deepEqual(fullOptIn.defaultDisabledNames, []);

  for (const runtime of ["claude", "codex", "antigravity", "grok"]) {
    const selection = selectRuntimeSkills(
      DEFAULT_RUNTIME_SKILL_ALLOWLIST,
      RUNTIME_SKILL_EXCLUSIONS[runtime],
    );
    assert.equal(selection.skillNames.length, runtime === "claude" ? 21 : 20);
    for (const required of [
      ...DEFAULT_COMMON_RUNTIME_SKILLS,
      ...RUNTIME_SKILL_ADDITIONS[runtime],
    ]) {
      assert.equal(
        selection.skillNames.includes(required),
        true,
        `${runtime} is missing ${required}`,
      );
    }
  }
});

test("Claude skill sync installs only the allowlist and catalogs source-only paths", () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-claude-skills-test-"));
  const localSkill = path.join(tempHome, "skills", "local-only", "SKILL.md");
  fs.mkdirSync(path.dirname(localSkill), { recursive: true });
  fs.writeFileSync(localSkill, "---\nname: local-only\ndescription: local\n---\n");
  const customDocx = path.join(tempHome, "skills", "docx", "SKILL.md");
  fs.mkdirSync(path.dirname(customDocx), { recursive: true });
  fs.writeFileSync(customDocx, "custom same-name docx skill", "utf8");

  const defaultResult = spawnSync(process.execPath, [syncClaudeSkills, tempHome], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120000,
  });
  assert.equal(
    defaultResult.status,
    0,
    `Claude skill sync failed\nstdout:\n${defaultResult.stdout}\nstderr:\n${defaultResult.stderr}`,
  );

  const managed = JSON.parse(
    fs.readFileSync(path.join(tempHome, ".claude-skills-sync-manifest.json"), "utf8"),
  ).managedSkills;
  assert.equal(managed.length, 21);
  assert.equal(fs.existsSync(path.join(tempHome, "skills", "zephermine", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(tempHome, "skills", "docx", "SKILL.md")), false);
  assert.equal(fs.existsSync(localSkill), true);
  assert.ok(
    findFileWithContent(
      path.join(tempHome, "_olympus-preserved"),
      "custom same-name docx skill",
    ),
    "Claude sync removed a same-name user skill without preserving it",
  );

  const catalog = fs.readFileSync(path.join(tempHome, "SKILLS-CATALOG.md"), "utf8");
  assert.match(catalog, /기본 활성 스킬: 21개/);
  assert.match(catalog, expectedSourceOnlySkillPattern);
  assert.match(catalog, /\| zephermine \| active \|/);
  assert.match(catalog, /\| docx \| source-only \|/);
  assert.match(
    catalog,
    new RegExp(
      path.join(tempHome, ".olympus", "source-skills", "docx", "SKILL.md")
        .replace(/\\/g, "/")
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ),
  );
  assert.equal(
    fs.existsSync(
      path.join(tempHome, ".olympus", "source-skills", "docx", "SKILL.md"),
    ),
    true,
  );
  assertDormantOrchestratorModule(tempHome, "Claude");

  const fullResult = spawnSync(
    process.execPath,
    [syncClaudeSkills, tempHome, "--include-source-only-skills"],
    { cwd: repoRoot, encoding: "utf8", timeout: 120000 },
  );
  assert.equal(fullResult.status, 0);
  assert.equal(fs.existsSync(path.join(tempHome, "skills", "docx", "SKILL.md")), true);

  const restoredDefault = spawnSync(process.execPath, [syncClaudeSkills, tempHome], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120000,
  });
  assert.equal(restoredDefault.status, 0);
  assert.equal(fs.existsSync(path.join(tempHome, "skills", "docx")), false);
  assert.equal(fs.existsSync(localSkill), true);
});

test("shared runtime agent policy keeps every custom agent source-only by default", () => {
  assert.equal(DEFAULT_DISABLED_PASSIVE_AGENTS.length, 9);
  assert.equal(DEFAULT_DISABLED_NATIVE_OVERLAP_AGENTS.length, 7);
  assert.equal(DEFAULT_DISABLED_REDUNDANT_SPECIALIST_AGENTS.length, 24);
  assert.equal(DEFAULT_DISABLED_WORKFLOW_SUPPORT_AGENTS.length, 2);
  assert.equal(DEFAULT_RUNTIME_AGENT_ALLOWLIST.length, 0);
  assert.equal(DEFAULT_SOURCE_ONLY_AGENTS.length, 42);
  assert.equal(DEFAULT_SOURCE_ONLY_AGENTS.includes("code-reviewer.md"), true);
  assert.equal(DEFAULT_SOURCE_ONLY_AGENTS.includes("security-reviewer.md"), true);
  assert.equal(DEFAULT_SOURCE_ONLY_AGENTS.includes("chronos-worker.md"), true);
  assert.equal(DEFAULT_SOURCE_ONLY_AGENTS.includes("gotcha-analyzer.md"), true);

  const all = new Map([
    ["ai-ml.md", "ai-ml"],
    ["frontend-react.md", "frontend"],
    ["chronos-worker.md", "chronos-worker"],
    ["gotcha-analyzer.md", "gotcha-analyzer"],
    ["code-reviewer.md", "source-review-wrapper"],
    ["security-reviewer.md", "source-security-wrapper"],
    ["react-best-practices.md", "react-guide"],
    ["python-fastapi-guidelines.md", "python-guide"],
    ["naming-conventions.md", "naming-guide"],
    ["writing-guidelines.md", "writing-guide"],
    ["bilingual-dev.md", "bilingual-guide"],
    ["web-preview-guide.md", "web-preview-guide"],
    ["debugger.md", "debugger"],
    ["spec-interviewer.md", "spec-interviewer"],
    ["backend-dotnet.md", "backend-dotnet"],
    ["api-tester.md", "api-tester"],
    ["database-schema-designer.md", "database-schema-designer"],
    ["stitch-developer.md", "stitch-developer"],
    ["architect.md", "architect"],
    ["documentation.md", "documentation"],
    ["mermaid-diagram-specialist.md", "mermaid-diagram-specialist"],
    ["python-spec.md", "python-spec"],
    ["typescript-spec.md", "typescript-spec"],
    ["ui-ux-designer.md", "ui-ux-designer"],
    ["backend-spring.md", "backend-spring"],
    ["database-mysql.md", "database-mysql"],
    ["database-postgresql.md", "database-postgresql"],
    ["qa-engineer.md", "qa-engineer"],
    ["qa-writer.md", "qa-writer"],
  ]);
  const defaults = selectRuntimeAgents(all);
  assert.deepEqual(Array.from(defaults.agentFiles.keys()), []);
  assert.deepEqual(defaults.defaultDisabledNames, Array.from(all.keys()));

  const optedIn = selectRuntimeAgents(all, true);
  assert.deepEqual(Array.from(optedIn.agentFiles.keys()), Array.from(all.keys()));
  assert.deepEqual(optedIn.defaultDisabledNames, []);
});

test("Claude and Antigravity agent syncs support default exclusion and explicit opt-in", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-agent-policy-test-"));
  const claudeHome = path.join(tempRoot, ".claude");
  const googleHome = path.join(tempRoot, ".gemini");
  const cases = [
    {
      name: "Claude",
      script: syncClaudeAgents,
      scriptArgs: [claudeHome],
      env: process.env,
      catalogHome: claudeHome,
      agentsHome: path.join(claudeHome, "agents"),
      skillsHome: path.join(claudeHome, "skills"),
    },
    {
      name: "Antigravity",
      script: syncAntigravityAssets,
      scriptArgs: [],
      env: { ...process.env, ANTIGRAVITY_HOME: googleHome },
      catalogHome: path.join(googleHome, "antigravity-cli"),
      agentsHome: path.join(googleHome, "config", "agents"),
      skillsHome: path.join(googleHome, "antigravity-cli", "skills"),
    },
  ];

  for (const entry of cases) {
    const defaultResult = spawnSync(process.execPath, [entry.script, ...entry.scriptArgs], {
      cwd: repoRoot,
      env: entry.env,
      encoding: "utf8",
      timeout: 120000,
    });
    assert.equal(
      defaultResult.status,
      0,
      `Default agent sync failed\nstdout:\n${defaultResult.stdout}\nstderr:\n${defaultResult.stderr}`,
    );
    const defaultCatalog = fs.readFileSync(
      path.join(entry.catalogHome, "AGENTS-CATALOG.md"),
      "utf8",
    );
    assert.match(defaultCatalog, /총 0개 에이전트가 설치되어 있습니다/);
    assert.equal(
      fs.existsSync(entry.agentsHome),
      false,
      "Default sync should not leave an empty custom-agent directory",
    );
    if (entry.script === syncAntigravityAssets) {
      const manifest = JSON.parse(
        fs.readFileSync(
          path.join(entry.catalogHome, ".olympus-sync-manifest.json"),
          "utf8",
        ),
      );
      assert.equal(manifest.managedSkills.length, 20);
      const skillsCatalog = fs.readFileSync(
        path.join(entry.catalogHome, "SKILLS-CATALOG.md"),
        "utf8",
      );
      assert.match(skillsCatalog, /기본 활성 스킬: 20개/);
      assert.match(skillsCatalog, expectedSourceOnlySkillPattern);
      assertDormantOrchestratorModule(entry.catalogHome, "Antigravity");
      assert.equal(
        fs.existsSync(path.join(googleHome, "config", "hooks", "antigravity-hook.js")),
        true,
      );
    }
    for (const name of DEFAULT_SOURCE_ONLY_AGENTS) {
      assert.equal(fs.existsSync(path.join(entry.agentsHome, name)), false);
      assert.equal(defaultCatalog.includes(`| ${name.replace(/\.md$/, "")} |`), false);
    }

    const optInResult = spawnSync(
      process.execPath,
      [entry.script, ...entry.scriptArgs, "--include-source-only-agents"],
      { cwd: repoRoot, env: entry.env, encoding: "utf8", timeout: 120000 },
    );
    assert.equal(optInResult.status, 0);
    const optInCatalog = fs.readFileSync(
      path.join(entry.catalogHome, "AGENTS-CATALOG.md"),
      "utf8",
    );
    assert.match(
      optInCatalog,
      new RegExp(`총 ${DEFAULT_SOURCE_ONLY_AGENTS.length}개 에이전트가 설치되어 있습니다`),
    );
    assert.match(
      optInCatalog,
      /복사된 source-only 참고 파일: 0개/,
    );
    for (const name of DEFAULT_SOURCE_ONLY_AGENTS) {
      assert.equal(fs.existsSync(path.join(entry.agentsHome, name)), true);
      assert.equal(optInCatalog.includes(`| ${name.replace(/\.md$/, "")} |`), true);
    }
    assert.match(optInCatalog, /\| chronos-worker \| active \|/);
    assert.equal(
      fs.existsSync(path.join(entry.agentsHome, "references")),
      true,
      "Source-only opt-in did not copy shared agent references",
    );
    if (entry.script === syncAntigravityAssets) {
      for (const name of RUNTIME_SKILL_EXCLUSIONS.antigravity) {
        const staleExcludedDir = path.join(entry.skillsHome, name);
        fs.mkdirSync(staleExcludedDir, { recursive: true });
        fs.writeFileSync(path.join(staleExcludedDir, "SKILL.md"), "stale incompatible copy");
      }
    }

    const returnToDefaultResult = spawnSync(process.execPath, [entry.script, ...entry.scriptArgs], {
      cwd: repoRoot,
      env: entry.env,
      encoding: "utf8",
      timeout: 120000,
    });
    assert.equal(returnToDefaultResult.status, 0);
    const restoredCatalog = fs.readFileSync(
      path.join(entry.catalogHome, "AGENTS-CATALOG.md"),
      "utf8",
    );
    for (const name of DEFAULT_SOURCE_ONLY_AGENTS) {
      assert.equal(fs.existsSync(path.join(entry.agentsHome, name)), false);
      assert.equal(restoredCatalog.includes(`| ${name.replace(/\.md$/, "")} |`), false);
    }
    assert.equal(fs.existsSync(path.join(entry.agentsHome, "references")), false);
    if (entry.script === syncAntigravityAssets) {
      for (const name of RUNTIME_SKILL_EXCLUSIONS.antigravity) {
        assert.equal(
          fs.existsSync(path.join(entry.skillsHome, name)),
          false,
          `Antigravity retained incompatible skill ${name}`,
        );
      }
    }
  }
});

test("Antigravity sync migrates legacy Gemini layouts and preserves modified assets", () => {
  const googleHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-antigravity-legacy-sync-"));
  const legacySkills = path.join(googleHome, "skills");
  fs.mkdirSync(legacySkills, { recursive: true });
  fs.cpSync(
    path.join(repoRoot, "skills", "design-plan"),
    path.join(legacySkills, "design-plan"),
    { recursive: true },
  );
  fs.cpSync(
    path.join(repoRoot, "skills", "pdf"),
    path.join(legacySkills, "pdf"),
    { recursive: true },
  );
  fs.appendFileSync(
    path.join(legacySkills, "pdf", "SKILL.md"),
    "\nuser legacy customization\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(googleHome, ".gemini-sync-manifest.json"),
    JSON.stringify({
      managedSkills: ["design-plan", "pdf"],
      managedAgents: [],
      managedHooks: [],
      managedSupportDirectories: [],
      managedAssetHashes: { skills: {}, agents: {}, hooks: {}, supportDirectories: {} },
    }),
    "utf8",
  );
  fs.writeFileSync(
    path.join(googleHome, "SKILLS-CATALOG.md"),
    "# Legacy\n\n설치 과정에서 자동 생성\n",
    "utf8",
  );

  const result = spawnSync(process.execPath, [syncAntigravityAssets], {
    cwd: repoRoot,
    env: { ...process.env, ANTIGRAVITY_HOME: googleHome },
    encoding: "utf8",
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(googleHome, ".gemini-sync-manifest.json")), false);
  assert.equal(fs.existsSync(path.join(legacySkills, "design-plan")), false);
  assert.equal(fs.existsSync(path.join(legacySkills, "pdf")), false);
  assert.equal(
    fs.existsSync(
      path.join(googleHome, "antigravity-cli", "skills", "design-plan", "SKILL.md"),
    ),
    true,
  );
  assert.ok(
    findFileWithContent(
      path.join(googleHome, "_olympus-preserved"),
      fs.readFileSync(path.join(repoRoot, "skills", "pdf", "SKILL.md"), "utf8")
        + "\nuser legacy customization\n",
      "legacy-gemini-skills",
    ),
    "modified legacy Gemini skill was not preserved",
  );
});

test("stale Olympus assets are moved to backup while local-only assets remain", () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-prune-test-"));
  fs.mkdirSync(path.join(tempHome, "agents"), { recursive: true });
  fs.mkdirSync(path.join(tempHome, "skills", "pmworker"), { recursive: true });
  fs.mkdirSync(path.join(tempHome, "skills", "deploy-server"), { recursive: true });

  fs.writeFileSync(path.join(tempHome, "agents", "code-review-checklist.md"), "stale");
  fs.writeFileSync(path.join(tempHome, "agents", "custom-agent.md"), "custom");
  fs.writeFileSync(path.join(tempHome, "skills", "pmworker", "SKILL.md"), "stale");
  fs.writeFileSync(path.join(tempHome, "skills", "deploy-server", "SKILL.md"), "keep");

  const result = pruneStaleAssets(tempHome, {
    now: new Date(2026, 3, 27, 10, 11, 12),
  });

  assert.equal(result.moved.length, 3);
  assert.equal(fs.existsSync(path.join(tempHome, "agents", "code-review-checklist.md")), false);
  assert.equal(fs.existsSync(path.join(tempHome, "skills", "pmworker")), false);
  assert.equal(fs.existsSync(path.join(tempHome, "agents", "custom-agent.md")), true);
  assert.equal(fs.existsSync(path.join(tempHome, "skills", "deploy-server", "SKILL.md")), false);
  assert.equal(
    fs.existsSync(path.join(tempHome, "_pruned-stale-olympus", "20260427-101112", "agents", "code-review-checklist.md")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(tempHome, "_pruned-stale-olympus", "20260427-101112", "skills", "pmworker", "SKILL.md")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(tempHome, "_pruned-stale-olympus", "20260427-101112", "skills", "deploy-server", "SKILL.md")),
    true,
  );
});

test("generate-catalogs creates global catalogs and honors excluded skills", () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-catalog-test-"));
  const result = spawnSync(
    process.execPath,
    [
      generateCatalogs,
      tempHome,
      "--source",
      "test",
      "--exclude",
      "agent-team-codex",
      "--exclude",
      "deploymonitor",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30000,
    },
  );

  assert.equal(
    result.status,
    0,
    `generate-catalogs failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const skillsCatalog = fs.readFileSync(path.join(tempHome, "SKILLS-CATALOG.md"), "utf8");
  const agentsCatalog = fs.readFileSync(path.join(tempHome, "AGENTS-CATALOG.md"), "utf8");

  assert.match(skillsCatalog, /auto-continue-loop/);
  assert.match(skillsCatalog, /\| auto-continue-loop \| active \|/);
  assert.match(skillsCatalog, /\| docx \| source-only \|/);
  const portableDocx = path.join(
    tempHome,
    ".olympus",
    "source-skills",
    "docx",
    "SKILL.md",
  );
  assert.equal(fs.existsSync(portableDocx), true);
  assert.match(
    skillsCatalog,
    new RegExp(
      portableDocx.replace(/\\/g, "/").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ),
  );
  assert.doesNotMatch(
    skillsCatalog,
    new RegExp(
      path
        .join(repoRoot, "skills", "docx", "SKILL.md")
        .replace(/\\/g, "/")
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ),
  );
  assert.doesNotMatch(skillsCatalog, /agent-team-codex/);
  assert.doesNotMatch(skillsCatalog, /deploymonitor/);
  assert.match(agentsCatalog, /사용 가능한 글로벌 에이전트 카탈로그/);
  for (const name of DEFAULT_SOURCE_ONLY_AGENTS) {
    assert.doesNotMatch(agentsCatalog, new RegExp(name.replace(/\.md$/, "")));
  }
});

test("four CLI instruction surfaces keep the native-first boundary aligned", () => {
  const templatePaths = {
    claude: path.join(repoRoot, "skills", "mnemo", "templates", "claude-md-rules.md"),
    codex: path.join(repoRoot, "skills", "codex-mnemo", "templates", "agents-md-rules.md"),
    antigravity: path.join(repoRoot, "skills", "antigravity-mnemo", "templates", "gemini-md-rules.md"),
    grok: path.join(repoRoot, "skills", "grok-mnemo", "templates", "grok-rules.md"),
  };
  const templates = Object.fromEntries(
    Object.entries(templatePaths).map(([name, filePath]) => [
      name,
      fs.readFileSync(filePath, "utf8"),
    ]),
  );

  const aliasRuntime = {
    claude: "claude",
    codex: "codex",
    antigravity: "antigravity",
  };
  for (const [templateName, runtime] of Object.entries(aliasRuntime)) {
    const aliasSection = templates[templateName]
      .split("**우선 고정 alias:**")[1]
      ?.split(/^## /m)[0] || "";
    const targets = Array.from(aliasSection.matchAll(/→ `([a-z0-9-]+)`/g), (match) => match[1]);
    const runtimeSkills = selectRuntimeSkills(
      DEFAULT_RUNTIME_SKILL_ALLOWLIST,
      RUNTIME_SKILL_EXCLUSIONS[runtime],
    ).skillNames;
    for (const target of targets) {
      assert.equal(
        runtimeSkills.includes(target),
        true,
        `${templateName} alias target ${target} is not active`,
      );
    }
  }
  const grokSkills = selectRuntimeSkills(
    DEFAULT_RUNTIME_SKILL_ALLOWLIST,
    RUNTIME_SKILL_EXCLUSIONS.grok,
  ).skillNames;
  assert.equal(grokSkills.includes("grok-mnemo"), true);
  assert.equal(grokSkills.includes("agent-team"), true);

  for (const name of ["claude", "codex", "antigravity"]) {
    assert.match(templates[name], /## Native-First 구현 경계/);
    assert.match(templates[name], /임의 프로젝트 cwd에서 상대경로를 그대로 실행하지 않(?:는다|습니다)/);
    assert.doesNotMatch(templates[name], /web-preview-guide/);
  }
  assert.match(templates.grok, /카탈로그의 source-only 원본을 기준으로 절대경로/);
  for (const template of Object.values(templates)) {
    assert.match(template, /사용자 정의 에이전트는 기본 등록 0개/);
    assert.match(template, /source-only `\.md`는 런타임 능력으로 간주하지 않는다/);
    assert.match(template, /읽기 전용 작업자에게 쓰기 작업을 주지 않는다/);
    assert.match(template, /메인 컨텍스트가 공유 태스크 장부·활동 로그·완료 판정을 소유한다/);
    assert.match(template, /메인 컨텍스트에서 순차 실행한다/);
    assert.doesNotMatch(template, /skills\/\*\/SKILL\.md`, `~\/\.[^/]+\/agents\/\*\.md/);
    assert.doesNotMatch(template, /특정 전문 분야.*에이전트 카탈로그/);
  }
  assert.match(templates.claude, /`Explore`.*`general-purpose`/);
  assert.match(templates.codex, /`explorer`.*`worker`/);
  assert.match(templates.antigravity, /Antigravity.*`research`/);
  assert.match(templates.grok, /`explore`.*`general-purpose`/);
  assert.match(
    templates.antigravity,
    /PreToolUse[\s\S]*PostToolUse[\s\S]*PreInvocation[\s\S]*PostInvocation[\s\S]*Stop/,
  );
  assert.match(templates.antigravity, /구 Gemini CLI의 `BeforeTool`/);
  assert.match(templates.grok, /글로벌 `~\/.claude\/CLAUDE\.md`를 rules 호환으로 이미 로드/);
});

test("project instruction files keep native role ownership aligned", () => {
  const agents = fs.readFileSync(path.join(repoRoot, "AGENTS.md"), "utf8");
  const antigravity = fs.readFileSync(path.join(repoRoot, "GEMINI.md"), "utf8");

  for (const text of [agents]) {
    assert.match(text, /`Explore`.*`explorer`.*`research`.*`explore`/);
    assert.match(text, /`general-purpose`.*`worker`.*Antigravity.*`general-purpose`/);
    assert.match(text, /공유 태스크 장부·활동 로그·완료 판정/);
    assert.match(text, /메인 컨텍스트에서 순차 실행/);
  }
  assert.match(antigravity, /사용자 정의 에이전트는 기본 등록 0개/);
  assert.match(antigravity, /Antigravity 내장 `research`/);
  assert.match(antigravity, /공유 태스크 장부·활동 로그·완료 판정/);
  assert.match(antigravity, /메인 컨텍스트에서 순차 실행/);
});

test("install surfaces disclose skill registry migration and recovery", () => {
  const migrationGuide = fs.readFileSync(
    path.join(repoRoot, "docs", "skill-registry-migration.md"),
    "utf8",
  );
  const readme = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8");
  const readmeKo = fs.readFileSync(path.join(repoRoot, "README-ko.md"), "utf8");
  const setup = fs.readFileSync(path.join(repoRoot, "SETUP.md"), "utf8");
  const installBat = fs.readFileSync(path.join(repoRoot, "install.bat"), "utf8");
  const installSh = fs.readFileSync(path.join(repoRoot, "install.sh"), "utf8");

  assert.match(migrationGuide, /이름이 다른 외부·개인 스킬 \| 그대로 유지/);
  assert.match(migrationGuide, /_olympus-preserved/);
  assert.match(migrationGuide, /_pruned-stale-olympus/);
  assert.match(migrationGuide, /--include-source-only-skills/);
  assert.match(migrationGuide, /자동 `restore` 명령.*없습니다/);
  for (const doc of [readme, readmeKo, setup]) {
    assert.match(doc, /docs\/skill-registry-migration\.md/);
  }
  assert.match(readmeKo, /일반 업데이트에는 먼저 언인스톨할 필요가 없습니다/);
  assert.match(readmeKo, /인수 없이 실행하는 것이 기본 전체 설치입니다/);
  assert.match(readmeKo, /현재\s+Olympus 버전의 `SKILL\.md`/);
  assert.match(readmeKo, /과거 수정본을 복구하는 옵션은 아닙니다/);
  assert.match(readme, /normal update does not require an uninstall first/);
  assert.match(readme, /Running without arguments is the default full installation/);
  assert.match(readme, /current\s+Olympus `SKILL\.md`/);
  assert.match(readme, /does not restore an older modified copy/);
  for (const installer of [installBat, installSh]) {
    assert.match(installer, /Skill registry migration notice/);
    assert.match(installer, /_olympus-preserved/);
    assert.match(installer, /--include-source-only-skills/);
    assert.match(installer, /does not restore preserved backups automatically/);
  }
  assert.doesNotMatch(setup, /install(?:\.bat|\.sh) --(?:link|unlink)/);
});

test("localized README surfaces stay connected and disclose portable hosts", () => {
  const readmes = new Map(
    ["README.md", "README-ko.md", "README-ja.md", "README-zh-CN.md"].map(
      (name) => [name, fs.readFileSync(path.join(repoRoot, name), "utf8")],
    ),
  );

  for (const [name, contents] of readmes) {
    for (const peer of readmes.keys()) {
      if (peer !== name) {
        assert.match(contents, new RegExp(peer.replaceAll(".", "\\.")), `${name} must link ${peer}`);
      }
    }
    assert.match(contents, /install-openclaw\.(?:bat|sh)/);
    assert.match(contents, /install-hermes\.(?:bat|sh)/);
    assert.match(contents, /skills-only/i);
    assert.match(contents, /docs\/skill-registry-migration\.md/);
  }

  assert.match(readmes.get("README-ja.md"), /通常の更新では、先にアンインストールする必要はありません/);
  assert.match(readmes.get("README-zh-CN.md"), /正常更新前\s*不需要先卸载/);
});

test("agent descriptions avoid YAML plain-scalar colon ambiguity", () => {
  const agentFiles = collectAgentFiles(
    path.join(repoRoot, "agents"),
    path.join(repoRoot, "skills"),
  );
  for (const [name, filePath] of agentFiles) {
    const descriptionLine = fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .find((line) => line.startsWith("description:"));
    assert.ok(descriptionLine, `${name} is missing a description`);
    const value = descriptionLine.slice("description:".length).trim();
    const isQuotedOrBlock = /^["'>|]/.test(value);
    assert.equal(
      !isQuotedOrBlock && /:\s/.test(value),
      false,
      `${name} has an ambiguous unquoted colon in its description`,
    );
  }
});

test("Antigravity Mnemo migrates legacy Gemini entries without deleting user rules", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-antigravity-mnemo-test-"));
  const googleHome = path.join(tempRoot, ".gemini");
  fs.mkdirSync(googleHome, { recursive: true });
  fs.writeFileSync(
    path.join(googleHome, "AGENTS.md"),
    [
      "# AGENTS.md",
      "",
      "user-owned rule",
      "",
      "<!-- GEMINI-MNEMO:START -->",
      "old rules",
      "<!-- GEMINI-MNEMO:END -->",
      "",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(googleHome, "GEMINI.md"),
    [
      "# User Antigravity Rules",
      "keep this rule",
      "",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(googleHome, "settings.json"),
    JSON.stringify({
      enableAgents: true,
      experimental: { worktrees: false },
      hooks: {
        AfterAgent: [{
          hooks: [
            { command: `bash "${path.join(googleHome, "hooks", "save-turn.sh")}"` },
            { command: "bash /custom/hooks/save-turn.sh" },
          ],
        }],
      },
    }, null, 2),
    "utf8",
  );
  fs.mkdirSync(path.join(googleHome, "hooks"), { recursive: true });
  fs.writeFileSync(
    path.join(googleHome, "hooks", "save-turn.sh"),
    "user-modified legacy hook",
    "utf8",
  );

  const env = { ...process.env, ANTIGRAVITY_HOME: googleHome };
  const result = spawnSync(process.execPath, [installAntigravityMnemo], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(
    result.status,
    0,
    `Antigravity Mnemo migration failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const agentsText = fs.readFileSync(path.join(googleHome, "AGENTS.md"), "utf8");
  assert.match(agentsText, /user-owned rule/);
  assert.doesNotMatch(agentsText, /GEMINI-MNEMO|old rules/);
  const rulesText = fs.readFileSync(path.join(googleHome, "GEMINI.md"), "utf8");
  assert.match(rulesText, /keep this rule/);
  assert.match(rulesText, /ANTIGRAVITY-MNEMO:START/);
  assert.match(rulesText, /Antigravity의 `research`/);

  const settings = JSON.parse(fs.readFileSync(path.join(googleHome, "settings.json"), "utf8"));
  assert.equal(Object.prototype.hasOwnProperty.call(settings, "enableAgents"), false);
  assert.deepEqual(settings.experimental, { worktrees: false });
  assert.deepEqual(settings.hooks.AfterAgent[0].hooks, [
    { command: "bash /custom/hooks/save-turn.sh" },
  ]);
  const hooksConfig = JSON.parse(
    fs.readFileSync(path.join(googleHome, "config", "hooks.json"), "utf8"),
  );
  assert.match(
    hooksConfig["olympus-antigravity-mnemo"].Stop[0].command,
    /olympus-save-turn\.js/,
  );
  assert.equal(
    fs.existsSync(path.join(googleHome, "config", "hooks", "olympus-save-turn.js")),
    true,
  );
  assert.ok(
    findFileWithContent(
      path.join(googleHome, "_olympus-preserved"),
      "user-modified legacy hook",
      "legacy-gemini-mnemo",
    ),
    "modified legacy hook was not preserved",
  );

  const check = spawnSync(process.execPath, [installAntigravityMnemo, "--check"], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(check.status, 0, check.stderr);

  const uninstall = spawnSync(process.execPath, [installAntigravityMnemo, "--uninstall"], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(uninstall.status, 0, uninstall.stderr);
  const remainingRules = fs.readFileSync(path.join(googleHome, "GEMINI.md"), "utf8");
  assert.match(remainingRules, /keep this rule/);
  assert.doesNotMatch(remainingRules, /ANTIGRAVITY-MNEMO/);
});
