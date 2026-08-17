const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { syncSkillSourceLibrary } = require("../skill-catalog");

const repoRoot = path.resolve(__dirname, "..", "..");

function makeTempHome(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFixtureFile(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  return target;
}

function copySyncFixtureScripts(fixtureRoot) {
  const scriptNames = [
    "agent-catalog.js",
    "agent-files.js",
    "agent-install-policy.js",
    "prune-stale-assets.js",
    "skill-catalog.js",
    "skill-install-policy.js",
    "sync-claude-agents.js",
    "sync-claude-skills.js",
    "sync-codex-assets.js",
    "sync-gemini-assets.js",
  ];
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  fs.mkdirSync(fixtureScripts, { recursive: true });
  for (const name of scriptNames) {
    fs.copyFileSync(
      path.join(repoRoot, "scripts", name),
      path.join(fixtureScripts, name),
    );
  }
}

function writeManagedFixtureVersion(fixtureRoot, version) {
  writeFixtureFile(
    fixtureRoot,
    path.join("skills", "design-plan", "SKILL.md"),
    `---\nname: design-plan\ndescription: Managed fixture\n---\n${version}\n`,
  );
  writeFixtureFile(
    fixtureRoot,
    path.join("agents", "fixture-agent.md"),
    `# Fixture agent\n${version}\n`,
  );
  writeFixtureFile(
    fixtureRoot,
    path.join("agents", "references", "fixture.md"),
    `support-${version}\n`,
  );
  writeFixtureFile(
    fixtureRoot,
    path.join("hooks", "fixture-hook.js"),
    `// hook-${version}\n`,
  );
  writeFixtureFile(
    fixtureRoot,
    path.join("skills", "codex-mnemo", "hooks", "fixture-notify.js"),
    `// notify-${version}\n`,
  );
  const removedSkillFile = path.join(
    fixtureRoot,
    "skills",
    "design-plan",
    "removed-after-v1.txt",
  );
  const removedSupportFile = path.join(
    fixtureRoot,
    "agents",
    "references",
    "removed-after-v1.txt",
  );
  if (version === "v1") {
    fs.writeFileSync(removedSkillFile, "managed-v1-only", "utf8");
    fs.writeFileSync(removedSupportFile, "managed-v1-only", "utf8");
  } else {
    fs.rmSync(removedSkillFile, { force: true });
    fs.rmSync(removedSupportFile, { force: true });
  }
}

function readAllTextFiles(root) {
  if (!fs.existsSync(root)) return "";
  const chunks = [];
  const visit = (current) => {
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(current)) visit(path.join(current, name));
      return;
    }
    try {
      chunks.push(fs.readFileSync(current, "utf8"));
    } catch {
      // Binary recovery files are irrelevant to these text fixtures.
    }
  };
  visit(root);
  return chunks.join("\n");
}

function runOrchestratorInstallerFixture(hookSource) {
  const tempRoot = makeTempHome(`ccc-orchestrator-${hookSource}-`);
  const fakeUserRoot = path.join(tempRoot, "user");
  const sourceDir = path.join(tempRoot, "source-library", "orchestrator");
  const targetProject = path.join(tempRoot, "target-project");
  const runtimeModule = path.join(
    fakeUserRoot,
    ".claude",
    ".olympus",
    "runtime-modules",
    "orchestrator",
  );
  fs.mkdirSync(targetProject, { recursive: true });
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "skills", "orchestrator", "install.js"),
    path.join(sourceDir, "install.js"),
  );
  writeFixtureFile(sourceDir, path.join("commands", "workpm.md"), "workpm");
  writeFixtureFile(sourceDir, path.join("commands", "pmworker.md"), "pmworker");
  writeFixtureFile(runtimeModule, path.join("mcp-server", "package.json"), "{}");
  writeFixtureFile(runtimeModule, path.join("mcp-server", "node_modules", ".keep"), "");
  writeFixtureFile(runtimeModule, path.join("mcp-server", "dist", "index.js"), "// runtime");
  writeFixtureFile(runtimeModule, path.join("mcp-server", "scripts", "spawn-worker.ps1"), "# runtime");
  writeFixtureFile(runtimeModule, path.join("mcp-server", "scripts", "spawn-worker.sh"), "# runtime");

  const expectedHook = `${hookSource}-hook`;
  if (hookSource === "repo") {
    writeFixtureFile(tempRoot, path.join("hooks", "orchestrator-detector.js"), expectedHook);
  } else if (hookSource === "global") {
    writeFixtureFile(
      path.join(fakeUserRoot, ".claude"),
      path.join("hooks", "orchestrator-detector.js"),
      expectedHook,
    );
  }

  const installer = path.join(sourceDir, "install.js");
  const bootstrap = [
    `require("node:os").homedir = () => ${JSON.stringify(fakeUserRoot)};`,
    `process.argv = [process.execPath, ${JSON.stringify(installer)}, ${JSON.stringify(targetProject)}];`,
    `require(${JSON.stringify(installer)});`,
  ].join("\n");
  const result = spawnSync(process.execPath, ["-e", bootstrap], {
    cwd: tempRoot,
    encoding: "utf8",
    timeout: 30000,
  });
  return { result, fakeUserRoot, runtimeModule, sourceDir, targetProject, expectedHook };
}

test("dormant skill source replacement validates staging and preserves the previous library on failure", () => {
  const tempHome = makeTempHome("ccc-source-library-test-");
  const sourceRoot = path.join(tempHome, ".olympus", "source-skills");
  const previousSkill = path.join(sourceRoot, "previous", "SKILL.md");
  fs.mkdirSync(path.dirname(previousSkill), { recursive: true });
  fs.writeFileSync(previousSkill, "previous-library", "utf8");
  const cachedOrchestratorDependency = path.join(
    tempHome,
    ".olympus",
    "runtime-modules",
    "orchestrator",
    "mcp-server",
    "node_modules",
    ".olympus-cache-sentinel",
  );
  fs.mkdirSync(path.dirname(cachedOrchestratorDependency), { recursive: true });
  fs.writeFileSync(cachedOrchestratorDependency, "preserve-mcp-cache", "utf8");

  const missingSkill = path.join(tempHome, "missing", "SKILL.md");
  assert.throws(
    () => syncSkillSourceLibrary(tempHome, new Map([["broken", missingSkill]])),
    /Skill source not found/,
  );
  assert.equal(fs.readFileSync(previousSkill, "utf8"), "previous-library");

  const validSkill = path.join(tempHome, "input", "replacement", "SKILL.md");
  const nestedDependency = path.join(
    path.dirname(validSkill),
    "node_modules",
    "ignored",
    "package.json",
  );
  fs.mkdirSync(path.dirname(nestedDependency), { recursive: true });
  fs.writeFileSync(validSkill, "---\nname: replacement\n---\n", "utf8");
  fs.writeFileSync(nestedDependency, "{}", "utf8");
  const orchestratorSkill = path.join(tempHome, "input", "orchestrator", "SKILL.md");
  const orchestratorDist = path.join(
    path.dirname(orchestratorSkill),
    "mcp-server",
    "dist",
    "index.js",
  );
  fs.mkdirSync(path.dirname(orchestratorDist), { recursive: true });
  fs.writeFileSync(orchestratorSkill, "---\nname: orchestrator\n---\n", "utf8");
  fs.writeFileSync(orchestratorDist, "// compiled orchestrator", "utf8");

  const copied = syncSkillSourceLibrary(
    tempHome,
    new Map([
      ["replacement", validSkill],
      ["orchestrator", orchestratorSkill],
    ]),
  );
  assert.equal(fs.existsSync(previousSkill), false);
  assert.equal(
    copied.get("replacement"),
    path.join(sourceRoot, "replacement", "SKILL.md"),
  );
  assert.equal(fs.existsSync(copied.get("replacement")), true);
  assert.equal(
    fs.existsSync(path.join(sourceRoot, "replacement", "node_modules")),
    false,
  );
  assert.equal(
    fs.readFileSync(cachedOrchestratorDependency, "utf8"),
    "preserve-mcp-cache",
    "atomic source replacement discarded the installed orchestrator MCP cache",
  );
  assert.deepEqual(
    fs
      .readdirSync(path.join(tempHome, ".olympus"))
      .filter((name) => name.startsWith(".source-skills.")),
    [],
  );
});

test("sync CLIs reject unknown options before changing runtime homes", () => {
  const cases = [
    {
      name: "claude",
      script: path.join(repoRoot, "scripts", "sync-claude-skills.js"),
      args: [makeTempHome("ccc-claude-args-test-"), "--unknown-policy-flag"],
      env: process.env,
      manifest: null,
    },
    {
      name: "codex",
      script: path.join(repoRoot, "scripts", "sync-codex-assets.js"),
      args: ["--unknown-policy-flag"],
      env: {
        ...process.env,
        CODEX_HOME: makeTempHome("ccc-codex-args-test-"),
      },
      manifest: ".codex-sync-manifest.json",
    },
    {
      name: "gemini",
      script: path.join(repoRoot, "scripts", "sync-gemini-assets.js"),
      args: ["--unknown-policy-flag"],
      env: {
        ...process.env,
        GEMINI_HOME: makeTempHome("ccc-gemini-args-test-"),
      },
      manifest: ".gemini-sync-manifest.json",
    },
  ];

  for (const entry of cases) {
    const result = spawnSync(process.execPath, [entry.script, ...entry.args], {
      cwd: repoRoot,
      env: entry.env,
      encoding: "utf8",
      timeout: 30000,
    });
    assert.notEqual(result.status, 0, `${entry.name} accepted an unknown option`);
    assert.match(result.stderr, /unknown option/);
    if (entry.manifest) {
      const home =
        entry.name === "codex" ? entry.env.CODEX_HOME : entry.env.GEMINI_HOME;
      assert.equal(fs.existsSync(path.join(home, entry.manifest)), false);
    }
  }
});

test("managed asset hashes distinguish safe upgrades from user modifications", () => {
  const fixtureRoot = makeTempHome("ccc-managed-hash-fixture-");
  copySyncFixtureScripts(fixtureRoot);

  const cases = [
    {
      name: "claude-skills",
      script: "sync-claude-skills.js",
      manifest: ".claude-skills-sync-manifest.json",
      args: (home) => [home],
      env: () => ({ ...process.env }),
      hashGroups: ["skills"],
      targets: (home) => [path.join(home, "skills", "design-plan", "SKILL.md")],
      removedTargets: (home) => [
        path.join(home, "skills", "design-plan", "removed-after-v1.txt"),
      ],
    },
    {
      name: "claude-agents",
      script: "sync-claude-agents.js",
      manifest: ".claude-agents-sync-manifest.json",
      args: (home) => [home, "--include-source-only-agents"],
      env: () => ({ ...process.env }),
      hashGroups: ["agents", "supportDirectories"],
      targets: (home) => [
        path.join(home, "agents", "fixture-agent.md"),
        path.join(home, "agents", "references", "fixture.md"),
      ],
      removedTargets: (home) => [
        path.join(home, "agents", "references", "removed-after-v1.txt"),
      ],
    },
    {
      name: "codex",
      script: "sync-codex-assets.js",
      manifest: ".codex-sync-manifest.json",
      args: () => ["--include-source-only-agents"],
      env: (home) => ({ ...process.env, CODEX_HOME: home }),
      hashGroups: [
        "skills",
        "agents",
        "hooks",
        "codexNotifyHooks",
        "supportDirectories",
      ],
      targets: (home) => [
        path.join(home, "skills", "design-plan", "SKILL.md"),
        path.join(home, "agents", "fixture-agent.md"),
        path.join(home, "agents", "references", "fixture.md"),
        path.join(home, "hooks", "fixture-hook.js"),
        path.join(home, "hooks", "fixture-notify.js"),
      ],
      removedTargets: (home) => [
        path.join(home, "skills", "design-plan", "removed-after-v1.txt"),
        path.join(home, "agents", "references", "removed-after-v1.txt"),
      ],
    },
    {
      name: "gemini",
      script: "sync-gemini-assets.js",
      manifest: ".gemini-sync-manifest.json",
      args: () => ["--include-source-only-agents"],
      env: (home) => ({ ...process.env, GEMINI_HOME: home }),
      hashGroups: ["skills", "agents", "hooks", "supportDirectories"],
      targets: (home) => [
        path.join(home, "skills", "design-plan", "SKILL.md"),
        path.join(home, "agents", "fixture-agent.md"),
        path.join(home, "agents", "references", "fixture.md"),
        path.join(home, "hooks", "fixture-hook.js"),
      ],
      removedTargets: (home) => [
        path.join(home, "skills", "design-plan", "removed-after-v1.txt"),
        path.join(home, "agents", "references", "removed-after-v1.txt"),
      ],
    },
  ];

  for (const entry of cases) {
    writeManagedFixtureVersion(fixtureRoot, "v1");
    const home = makeTempHome(`ccc-${entry.name}-managed-hash-`);
    const script = path.join(fixtureRoot, "scripts", entry.script);
    const runSync = () => {
      const result = spawnSync(process.execPath, [script, ...entry.args(home)], {
        cwd: fixtureRoot,
        env: entry.env(home),
        encoding: "utf8",
        timeout: 30000,
      });
      assert.equal(
        result.status,
        0,
        `${entry.name} sync failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      );
    };

    runSync();
    const manifestPath = path.join(home, entry.manifest);
    const firstManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const group of entry.hashGroups) {
      const hashes = firstManifest.managedAssetHashes[group];
      assert.equal(
        Object.values(hashes).every(
          (value) => typeof value === "string" && value.length === 64,
        ),
        true,
        `${entry.name} did not record ${group} hashes`,
      );
      assert.ok(
        Object.keys(hashes).length > 0,
        `${entry.name} recorded an empty ${group} hash map`,
      );
    }

    const unrelatedSkill = writeFixtureFile(
      path.join(home, "skills", "local-only"),
      "SKILL.md",
      "local-only-skill",
    );
    const unrelatedAgent = writeFixtureFile(
      path.join(home, "agents"),
      "local-only.md",
      "local-only-agent",
    );

    writeManagedFixtureVersion(fixtureRoot, "v2");
    runSync();
    for (const target of entry.targets(home)) {
      assert.match(fs.readFileSync(target, "utf8"), /v2/);
    }
    for (const target of entry.removedTargets(home)) {
      assert.equal(
        fs.existsSync(target),
        false,
        `${entry.name} retained a file removed from the managed v2 source`,
      );
    }
    assert.equal(
      fs.existsSync(path.join(home, "_olympus-preserved")),
      false,
      `${entry.name} backed up an unmodified Olympus v1 during the v2 upgrade`,
    );

    for (const target of entry.targets(home)) {
      fs.appendFileSync(target, "\nuser-change\n", "utf8");
    }
    writeManagedFixtureVersion(fixtureRoot, "v3");
    runSync();
    const preservedRoot = path.join(home, "_olympus-preserved");
    assert.match(
      readAllTextFiles(preservedRoot),
      /user-change/,
      `${entry.name} did not preserve a user-modified managed asset`,
    );
    for (const target of entry.targets(home)) {
      assert.match(fs.readFileSync(target, "utf8"), /v3/);
      assert.doesNotMatch(fs.readFileSync(target, "utf8"), /user-change/);
    }

    const legacyManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    delete legacyManifest.managedAssetHashes;
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(legacyManifest, null, 2) + "\n",
      "utf8",
    );
    fs.appendFileSync(entry.targets(home)[0], "\nlegacy-user-change\n", "utf8");
    writeManagedFixtureVersion(fixtureRoot, "v4");
    runSync();
    assert.match(
      readAllTextFiles(preservedRoot),
      /legacy-user-change/,
      `${entry.name} trusted a legacy manifest without a hash`,
    );
    assert.equal(fs.readFileSync(unrelatedSkill, "utf8"), "local-only-skill");
    assert.equal(fs.readFileSync(unrelatedAgent, "utf8"), "local-only-agent");
  }
});

test("catalog generation publishes a portable dormant library and sync manifests follow catalog work", () => {
  const tempHome = makeTempHome("ccc-portable-catalog-test-");
  const generateCatalogs = path.join(repoRoot, "scripts", "generate-catalogs.js");
  const result = spawnSync(
    process.execPath,
    [generateCatalogs, tempHome, "--source", "portable-test", "--exclude", "agent-team-codex"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 120000,
    },
  );
  assert.equal(
    result.status,
    0,
    `catalog generation failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const dormantDocx = path.join(
    tempHome,
    ".olympus",
    "source-skills",
    "docx",
    "SKILL.md",
  );
  const catalog = fs.readFileSync(path.join(tempHome, "SKILLS-CATALOG.md"), "utf8");
  const dormantDisplayPath = dormantDocx.replace(/\\/g, "/");
  assert.equal(fs.existsSync(dormantDocx), true);
  assert.match(catalog, new RegExp(dormantDisplayPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(catalog.includes(repoRoot.replace(/\\/g, "/")), false);

  for (const scriptName of [
    "sync-claude-skills.js",
    "sync-codex-assets.js",
    "sync-gemini-assets.js",
  ]) {
    const source = fs.readFileSync(path.join(repoRoot, "scripts", scriptName), "utf8");
    const libraryIndex = source.lastIndexOf("syncSkillSourceLibrary(");
    const catalogIndex = source.lastIndexOf("writeSkillsCatalog(");
    const manifestWriteMatches = [
      ...source.matchAll(/fs\.writeFileSync\(\r?\n\s+manifestPath/g),
    ];
    const manifestIndex = Math.max(
      source.lastIndexOf("writeManifest("),
      manifestWriteMatches.at(-1)?.index ?? -1,
    );
    assert.ok(libraryIndex >= 0, `${scriptName} does not publish a dormant library`);
    assert.ok(catalogIndex > libraryIndex, `${scriptName} writes its catalog before the library`);
    assert.ok(manifestIndex > catalogIndex, `${scriptName} commits its manifest before catalog success`);
  }
});

test("unlink removes exact untracked Olympus assets and preserves same-name user modifications", () => {
  const cases = [
    {
      name: "claude-agents",
      script: path.join(repoRoot, "scripts", "sync-claude-agents.js"),
      home: makeTempHome("ccc-claude-agent-unlink-test-"),
      args(home) {
        return [home, "--unlink"];
      },
      env(home) {
        return { ...process.env, HOME: home, USERPROFILE: home };
      },
      exactSource: path.join(repoRoot, "agents", "architect.md"),
      exactTarget(home) {
        return path.join(home, "agents", "architect.md");
      },
      modifiedSource: path.join(repoRoot, "agents", "documentation.md"),
      modifiedTarget(home) {
        return path.join(home, "agents", "documentation.md");
      },
    },
    {
      name: "codex",
      script: path.join(repoRoot, "scripts", "sync-codex-assets.js"),
      home: makeTempHome("ccc-codex-unlink-test-"),
      args() {
        return ["--unlink"];
      },
      env(home) {
        return { ...process.env, CODEX_HOME: home };
      },
      exactSource: path.join(repoRoot, "skills", "docx"),
      exactTarget(home) {
        return path.join(home, "skills", "docx");
      },
      modifiedSource: path.join(repoRoot, "skills", "pdf"),
      modifiedTarget(home) {
        return path.join(home, "skills", "pdf");
      },
    },
    {
      name: "gemini",
      script: path.join(repoRoot, "scripts", "sync-gemini-assets.js"),
      home: makeTempHome("ccc-gemini-unlink-test-"),
      args() {
        return ["--unlink"];
      },
      env(home) {
        return { ...process.env, GEMINI_HOME: home };
      },
      exactSource: path.join(repoRoot, "skills", "docx"),
      exactTarget(home) {
        return path.join(home, "skills", "docx");
      },
      modifiedSource: path.join(repoRoot, "skills", "pdf"),
      modifiedTarget(home) {
        return path.join(home, "skills", "pdf");
      },
    },
  ];

  for (const entry of cases) {
    const exactTarget = entry.exactTarget(entry.home);
    const modifiedTarget = entry.modifiedTarget(entry.home);
    fs.mkdirSync(path.dirname(exactTarget), { recursive: true });
    fs.cpSync(entry.exactSource, exactTarget, { recursive: true, force: true });
    fs.cpSync(entry.modifiedSource, modifiedTarget, { recursive: true, force: true });
    const modifiedFile = fs.statSync(modifiedTarget).isDirectory()
      ? path.join(modifiedTarget, "SKILL.md")
      : modifiedTarget;
    fs.appendFileSync(modifiedFile, "\nuser-owned modification\n", "utf8");

    const result = spawnSync(
      process.execPath,
      [entry.script, ...entry.args(entry.home)],
      {
        cwd: repoRoot,
        env: entry.env(entry.home),
        encoding: "utf8",
        timeout: 120000,
      },
    );
    assert.equal(
      result.status,
      0,
      `${entry.name} unlink failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
    assert.equal(fs.existsSync(exactTarget), false, `${entry.name} retained an exact Olympus asset`);
    assert.equal(fs.existsSync(modifiedTarget), false, `${entry.name} left a modified collision active`);
    const preservationRoot = path.join(entry.home, "_olympus-preserved");
    const preserved = fs.existsSync(preservationRoot)
      ? fs.readdirSync(preservationRoot, { recursive: true }).map(String)
      : [];
    assert.equal(
      preserved.some((name) => name.includes(path.basename(modifiedTarget))),
      true,
      `${entry.name} did not preserve the modified collision`,
    );
  }
});

test("installers stop when a required policy sync fails", () => {
  const unixInstaller = fs.readFileSync(path.join(repoRoot, "install.sh"), "utf8");
  const windowsInstaller = fs.readFileSync(path.join(repoRoot, "install.bat"), "utf8");

  assert.doesNotMatch(
    unixInstaller,
    /sync-codex-assets\.js[^\n]*&&\s*CODEX_SYNC_RESULT=.*\|\|/,
  );
  assert.doesNotMatch(
    unixInstaller,
    /sync-gemini-assets\.js[^\n]*&&\s*GEMINI_SYNC_RESULT=.*\|\|/,
  );
  assert.match(unixInstaller, /필수 정책 동기화 실패[\s\S]{0,100}exit 1/);
  assert.match(windowsInstaller, /Required policy sync failed:[\s\S]{0,100}exit \/b 1/);
  assert.match(windowsInstaller, /Grok compatibility skill sync failed:[\s\S]{0,100}exit \/b 1/);
});

test("installers and the Codex audit resolve orchestrator MCP from the non-discovery runtime mirror", () => {
  const cases = [
    ["install.sh", /\.olympus\/runtime-modules\/orchestrator/],
    ["install.bat", /\.olympus\/runtime-modules\/orchestrator/],
    [
      "skills/orchestrator/install.js",
      /path\.join\(\s*globalClaudeDir,\s*"\.olympus",\s*"runtime-modules",\s*"orchestrator"/,
    ],
    [
      "scripts/audit-codex-compatibility.js",
      /path\.join\(\s*codexHome,\s*"\.olympus",\s*"runtime-modules",\s*"orchestrator"/,
    ],
  ];
  for (const [relativePath, runtimePathPattern] of cases) {
    const source = fs
      .readFileSync(path.join(repoRoot, relativePath), "utf8")
      .replace(/\\/g, "/");
    assert.match(
      source,
      runtimePathPattern,
      `${relativePath} does not resolve the orchestrator runtime mirror`,
    );
    assert.doesNotMatch(
      source,
      /(?:^|[\/"'])skills\/orchestrator\/mcp-server/,
      `${relativePath} still assumes orchestrator is registered in active skills`,
    );
  }
});

test("Gemini installer registers and removes orchestrator only in user scope", () => {
  for (const relativePath of ["install.sh", "install.bat"]) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(
      source,
      /gemini mcp add --scope user orchestrator node/,
      `${relativePath} can leak orchestrator registration into project settings`,
    );
    assert.match(source, /gemini mcp remove --scope user orchestrator/);
    assert.doesNotMatch(source, /gemini mcp (?:add|remove) orchestrator/);
  }
});

test("orchestrator direct installer uses the runtime mirror and bounded hook fallbacks", () => {
  for (const hookSource of ["repo", "global", "none"]) {
    const fixture = runOrchestratorInstallerFixture(hookSource);
    assert.equal(
      fixture.result.status,
      0,
      `${hookSource} fixture failed\nstdout:\n${fixture.result.stdout}\nstderr:\n${fixture.result.stderr}`,
    );

    const settingsPath = path.join(
      fixture.targetProject,
      ".claude",
      "settings.local.json",
    );
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    assert.equal(
      settings.mcpServers.orchestrator.args[0],
      path
        .join(fixture.runtimeModule, "mcp-server", "dist", "index.js")
        .replace(/\\/g, "/"),
    );
    assert.equal(
      fs.existsSync(
        path.join(fixture.targetProject, ".claude", "commands", "workpm.md"),
      ),
      true,
    );

    const installedHook = path.join(
      fixture.targetProject,
      "hooks",
      "orchestrator-detector.js",
    );
    const hookEntries = settings.hooks?.UserPromptSubmit || [];
    if (hookSource === "none") {
      assert.equal(fs.existsSync(installedHook), false);
      assert.equal(hookEntries.length, 0);
      assert.match(fixture.result.stderr, /explicit workpm invocation remains available/);
    } else {
      assert.equal(fs.readFileSync(installedHook, "utf8"), fixture.expectedHook);
      assert.equal(
        hookEntries.some((entry) =>
          entry.hooks?.some((hook) =>
            hook.command?.includes("orchestrator-detector.js"),
          ),
        ),
        true,
      );
    }
  }
});

test("Codex compatibility audit reads the selected CODEX_HOME manifest", () => {
  const codexHome = makeTempHome("ccc-codex-audit-home-");
  fs.writeFileSync(
    path.join(codexHome, ".codex-sync-manifest.json"),
    JSON.stringify({
      managedSkills: ["argos", "code-reviewer"],
      managedAgents: [],
      managedHooks: ["save-turn.ps1"],
      managedCodexNotifyHooks: ["codex-hook-bridge.js"],
    }),
    "utf8",
  );
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "audit-codex-compatibility.js")],
    {
      cwd: repoRoot,
      env: { ...process.env, CODEX_HOME: codexHome },
      encoding: "utf8",
      timeout: 30000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Managed sync skills: 2/);
  assert.match(result.stdout, /Managed sync root hooks: 1/);
  assert.match(result.stdout, /Managed Codex notify hooks: 1/);
});
