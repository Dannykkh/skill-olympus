const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  DEFAULT_COMMON_RUNTIME_SKILLS,
  RUNTIME_SKILL_ADDITIONS,
  RUNTIME_SKILL_EXCLUSIONS,
  selectRuntimeSkills,
} = require("../skill-install-policy");

const repoRoot = path.resolve(__dirname, "..", "..");
const syncScript = path.join(repoRoot, "scripts", "sync-portable-skills.js");

function findBash() {
  const candidates = [];
  if (process.env.BASH_PATH) candidates.push(process.env.BASH_PATH);
  if (process.platform === "win32") {
    for (const base of [process.env.ProgramFiles, process.env.ProgramW6432]) {
      if (base) candidates.push(path.join(base, "Git", "bin", "bash.exe"));
    }
  } else {
    candidates.push("/bin/bash", "/usr/bin/bash");
  }
  return candidates.find(
    (candidate) =>
      candidate &&
      (path.isAbsolute(candidate) ? fs.existsSync(candidate) : true) &&
      spawnSync(candidate, ["--version"], { stdio: "ignore" }).status === 0,
  );
}

function shellPath(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  const drivePath = normalized.match(/^([A-Za-z]):\/(.*)$/);
  return drivePath ? `/${drivePath[1].toLowerCase()}/${drivePath[2]}` : normalized;
}

function writeExecutable(filePath, contents) {
  fs.writeFileSync(filePath, contents, "utf8");
  fs.chmodSync(filePath, 0o755);
}

function allPublicSkillNames() {
  return fs
    .readdirSync(path.join(repoRoot, "skills"), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name !== "deploymonitor" &&
        fs.existsSync(path.join(repoRoot, "skills", entry.name, "SKILL.md")),
    )
    .map((entry) => entry.name)
    .sort();
}

function readAllText(root) {
  if (!fs.existsSync(root)) return "";
  const values = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(candidate);
      else values.push(fs.readFileSync(candidate, "utf8"));
    }
  }
  return values.join("\n");
}

function runSync(runtime, home, ...args) {
  return spawnSync(
    process.execPath,
    [syncScript, runtime, "--home", home, ...args],
    { cwd: repoRoot, encoding: "utf8", timeout: 120000 },
  );
}

test("OpenClaw and Hermes expose only the 18 portable entry points by default", () => {
  const allSkills = allPublicSkillNames();
  for (const runtime of ["openclaw", "hermes"]) {
    const selection = selectRuntimeSkills(
      allSkills,
      RUNTIME_SKILL_EXCLUSIONS[runtime],
    );
    assert.deepEqual(RUNTIME_SKILL_ADDITIONS[runtime], []);
    assert.deepEqual(selection.skillNames, DEFAULT_COMMON_RUNTIME_SKILLS);
    assert.equal(selection.skillNames.length, 18);
    assert.equal(selection.runtimeExcludedNames.length, 6);
    assert.equal(selection.defaultDisabledNames.length, 76);
  }
});

for (const runtime of ["openclaw", "hermes"]) {
  test(`${runtime} skills-only sync installs, preserves conflicts, and unlinks safely`, () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `olympus-${runtime}-test-`));
    const home = path.join(tempRoot, runtime);
    const localSkill = path.join(home, "skills", "local-only", "SKILL.md");
    const conflict = path.join(home, "skills", "design-plan", "SKILL.md");

    try {
      fs.mkdirSync(path.dirname(localSkill), { recursive: true });
      fs.writeFileSync(localSkill, "local-only", "utf8");
      fs.mkdirSync(path.dirname(conflict), { recursive: true });
      fs.writeFileSync(conflict, "user-design-plan", "utf8");

      const installed = runSync(runtime, home);
      assert.equal(installed.status, 0, `${installed.stdout}\n${installed.stderr}`);

      const manifestPath = path.join(home, ".olympus-skills-sync-manifest.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      assert.equal(manifest.tier, "skills-only");
      assert.equal(manifest.runtime, runtime);
      assert.equal(manifest.managedSkills.length, 18);
      assert.equal(
        fs.existsSync(path.join(home, "skills", "zephermine", "SKILL.md")),
        true,
      );
      for (const adapter of RUNTIME_SKILL_EXCLUSIONS[runtime]) {
        assert.equal(fs.existsSync(path.join(home, "skills", adapter)), false);
      }
      assert.equal(fs.readFileSync(localSkill, "utf8"), "local-only");
      assert.match(
        readAllText(path.join(home, "_olympus-preserved")),
        /user-design-plan/,
      );

      const catalog = fs.readFileSync(path.join(home, "SKILLS-CATALOG.md"), "utf8");
      assert.match(catalog, /기본 활성 스킬: 18개/);
      // 로컬 전용 deploymonitor는 git에 추적되지 않으므로 clean clone에서는 source-only가 76개다.
      const sourceOnlyCount = fs.existsSync(
        path.join(__dirname, "..", "..", "skills", "deploymonitor", "SKILL.md"),
      )
        ? 77
        : 76;
      assert.match(catalog, new RegExp(`source-only 스킬: ${sourceOnlyCount}개`));

      const managedSkill = path.join(home, "skills", "api-tester", "SKILL.md");
      fs.appendFileSync(managedSkill, "\nuser-managed-change\n", "utf8");
      const removed = runSync(runtime, home, "--unlink");
      assert.equal(removed.status, 0, `${removed.stdout}\n${removed.stderr}`);
      assert.equal(fs.existsSync(manifestPath), false);
      assert.equal(fs.existsSync(path.join(home, "SKILLS-CATALOG.md")), false);
      assert.equal(fs.existsSync(path.join(home, ".olympus", "source-skills")), false);
      assert.equal(fs.readFileSync(localSkill, "utf8"), "local-only");
      assert.match(
        readAllText(path.join(home, "_olympus-preserved")),
        /user-managed-change/,
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
}

test("portable host wrappers stay thin and the TermSnap defaults remain unchanged", () => {
  const selector = fs.readFileSync(path.join(repoRoot, "install-select.js"), "utf8");
  assert.match(
    selector,
    /const ALL_LLMS = \["claude", "codex", "antigravity", "grok"\]/,
  );

  for (const runtime of ["openclaw", "hermes"]) {
    const windowsWrapper = fs.readFileSync(
      path.join(repoRoot, `install-${runtime}.bat`),
      "utf8",
    );
    const shellWrapper = fs.readFileSync(
      path.join(repoRoot, `install-${runtime}.sh`),
      "utf8",
    );
    assert.match(windowsWrapper, new RegExp(`OLYMPUS_PORTABLE_RUNTIME=${runtime}`));
    assert.match(windowsWrapper, /install-portable-host\.bat/);
    assert.match(shellWrapper, new RegExp(`install-portable-host\\.sh" ${runtime}`));
  }

  for (const installerName of ["install.bat", "install.sh"]) {
    const installer = fs.readFileSync(path.join(repoRoot, installerName), "utf8");
    assert.match(installer, /sync-portable-skills\.js["']?\s+openclaw/);
    assert.match(installer, /sync-portable-skills\.js["']?\s+hermes/);
    assert.match(installer, /Plugins\/Hooks\/Mnemo\/MCP/);
  }
});

test("selector accepts explicit skills-only hosts and rejects unknown targets", () => {
  const selector = path.join(repoRoot, "install-select.js");
  const defaults = spawnSync(process.execPath, [selector], {
    encoding: "utf8",
  });
  assert.equal(defaults.status, 0, defaults.stderr);
  assert.equal(defaults.stdout.split(/\r?\n/)[0], "claude,codex,antigravity,grok");

  const explicit = spawnSync(
    process.execPath,
    [selector, "--llm", "openclaw,hermes"],
    { encoding: "utf8" },
  );
  assert.equal(explicit.status, 0, explicit.stderr);
  assert.equal(explicit.stdout.split(/\r?\n/)[0], "openclaw,hermes");

  const splitByBatchParsing = spawnSync(
    process.execPath,
    [selector, "--llm", "openclaw", "hermes"],
    { encoding: "utf8" },
  );
  assert.equal(splitByBatchParsing.status, 0, splitByBatchParsing.stderr);
  assert.equal(
    splitByBatchParsing.stdout.split(/\r?\n/)[0],
    "openclaw,hermes",
  );

  const invalid = spawnSync(
    process.execPath,
    [selector, "--llm", "unknown-host"],
    { encoding: "utf8" },
  );
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /Unsupported CLI target/);
});

test(
  "Windows host-specific wrappers install and uninstall only their selected home",
  { skip: process.platform === "win32" ? false : "Windows-only wrapper" },
  () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "olympus-wrapper-test-"));
    try {
      for (const runtime of ["openclaw", "hermes"]) {
        const home = path.join(tempRoot, runtime);
        const wrapper = path.join(repoRoot, `install-${runtime}.bat`);
        const installCommand = `call "${wrapper}" --home "${home}"`;
        const installed = spawnSync("cmd.exe", ["/d", "/c", installCommand], {
          cwd: repoRoot,
          encoding: "utf8",
          timeout: 120000,
          windowsVerbatimArguments: true,
        });
        assert.equal(
          installed.status,
          0,
          `${runtime} wrapper install failed\n${installed.stdout}\n${installed.stderr}`,
        );
        const manifestPath = path.join(home, ".olympus-skills-sync-manifest.json");
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        assert.equal(manifest.runtime, runtime);
        assert.equal(manifest.managedSkills.length, 18);

        const uninstallCommand = `call "${wrapper}" --home "${home}" --uninstall`;
        const removed = spawnSync("cmd.exe", ["/d", "/c", uninstallCommand], {
          cwd: repoRoot,
          encoding: "utf8",
          timeout: 120000,
          windowsVerbatimArguments: true,
        });
        assert.equal(
          removed.status,
          0,
          `${runtime} wrapper uninstall failed\n${removed.stdout}\n${removed.stderr}`,
        );
        assert.equal(fs.existsSync(manifestPath), false);
      }
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  },
);

const bash = findBash();

test(
  "shell host-specific wrappers install and uninstall only their selected home",
  { skip: bash ? false : "bash is unavailable" },
  () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "olympus-shell-wrapper-test-"));
    try {
      for (const runtime of ["openclaw", "hermes"]) {
        const home = path.join(tempRoot, runtime);
        const wrapper = path.join(repoRoot, `install-${runtime}.sh`);
        const installed = spawnSync(
          bash,
          ["--noprofile", "--norc", shellPath(wrapper), "--home", shellPath(home)],
          { cwd: repoRoot, encoding: "utf8", timeout: 120000 },
        );
        assert.equal(
          installed.status,
          0,
          `${runtime} shell wrapper install failed\n${installed.stdout}\n${installed.stderr}`,
        );
        const manifestPath = path.join(home, ".olympus-skills-sync-manifest.json");
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        assert.equal(manifest.runtime, runtime);
        assert.equal(manifest.managedSkills.length, 18);

        const removed = spawnSync(
          bash,
          [
            "--noprofile",
            "--norc",
            shellPath(wrapper),
            "--home",
            shellPath(home),
            "--uninstall",
          ],
          { cwd: repoRoot, encoding: "utf8", timeout: 120000 },
        );
        assert.equal(
          removed.status,
          0,
          `${runtime} shell wrapper uninstall failed\n${removed.stdout}\n${removed.stderr}`,
        );
        assert.equal(fs.existsSync(manifestPath), false);
      }
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  },
);

test(
  "TermSnap Windows installer accepts explicit OpenClaw and Hermes skills-only targets",
  { skip: process.platform === "win32" ? false : "Windows-only installer" },
  () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "olympus-main-bat-test-"));
    const shimDirectory = path.join(tempRoot, "bin");
    const openclawHome = path.join(tempRoot, ".openclaw");
    const hermesHome = path.join(tempRoot, ".hermes");
    try {
      fs.mkdirSync(shimDirectory, { recursive: true });
      fs.writeFileSync(path.join(shimDirectory, "jq.cmd"), "@exit /b 0\r\n", "utf8");
      const env = {
        ...process.env,
        HOME: tempRoot,
        USERPROFILE: tempRoot,
        CODEX_HOME: path.join(tempRoot, ".codex"),
        ANTIGRAVITY_HOME: path.join(tempRoot, ".gemini"),
        OPENCLAW_HOME: openclawHome,
        HERMES_HOME: hermesHome,
        OLYMPUS_UPDATE_CHECK_DISABLE: "1",
        PATH: `${shimDirectory}${path.delimiter}${process.env.PATH || ""}`,
      };
      const command = `echo.| call "${path.join(repoRoot, "install.bat")}" --llm openclaw,hermes`;
      const result = spawnSync("cmd.exe", ["/d", "/c", command], {
        cwd: repoRoot,
        env,
        encoding: "utf8",
        timeout: 120000,
        windowsVerbatimArguments: true,
      });
      const output = `${result.stdout || ""}\n${result.stderr || ""}`;
      assert.equal(result.status, 0, output);
      assert.match(output, /LLM: openclaw,hermes/);
      assert.equal(
        JSON.parse(
          fs.readFileSync(
            path.join(openclawHome, ".olympus-skills-sync-manifest.json"),
            "utf8",
          ),
        ).managedSkills.length,
        18,
      );
      assert.equal(
        JSON.parse(
          fs.readFileSync(
            path.join(hermesHome, ".olympus-skills-sync-manifest.json"),
            "utf8",
          ),
        ).managedSkills.length,
        18,
      );
      assert.equal(fs.existsSync(path.join(tempRoot, ".claude")), false);
      assert.equal(fs.existsSync(path.join(tempRoot, ".codex")), false);
      assert.equal(fs.existsSync(path.join(tempRoot, ".gemini")), false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  },
);

test(
  "TermSnap shell installer accepts explicit OpenClaw and Hermes skills-only targets",
  { skip: bash ? false : "bash is unavailable" },
  () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "olympus-main-sh-test-"));
    const shimDirectory = path.join(tempRoot, "bin");
    const openclawHome = path.join(tempRoot, ".openclaw");
    const hermesHome = path.join(tempRoot, ".hermes");
    try {
      fs.mkdirSync(shimDirectory, { recursive: true });
      writeExecutable(path.join(shimDirectory, "jq"), "#!/usr/bin/env bash\nexit 0\n");
      const env = {
        ...process.env,
        HOME: shellPath(tempRoot),
        USERPROFILE: tempRoot,
        CODEX_HOME: shellPath(path.join(tempRoot, ".codex")),
        ANTIGRAVITY_HOME: shellPath(path.join(tempRoot, ".gemini")),
        OPENCLAW_HOME: shellPath(openclawHome),
        HERMES_HOME: shellPath(hermesHome),
        OLYMPUS_UPDATE_CHECK_DISABLE: "1",
        PATH: `${shimDirectory}${path.delimiter}${process.env.PATH || ""}`,
      };
      const result = spawnSync(
        bash,
        [
          "--noprofile",
          "--norc",
          shellPath(path.join(repoRoot, "install.sh")),
          "--llm",
          "openclaw,hermes",
        ],
        { cwd: repoRoot, env, encoding: "utf8", timeout: 120000 },
      );
      const output = `${result.stdout || ""}\n${result.stderr || ""}`;
      assert.equal(result.status, 0, output);
      assert.match(output, /LLM: openclaw,hermes/);
      for (const home of [openclawHome, hermesHome]) {
        const manifest = JSON.parse(
          fs.readFileSync(path.join(home, ".olympus-skills-sync-manifest.json"), "utf8"),
        );
        assert.equal(manifest.managedSkills.length, 18);
      }
      assert.equal(fs.existsSync(path.join(tempRoot, ".claude")), false);
      assert.equal(fs.existsSync(path.join(tempRoot, ".codex")), false);
      assert.equal(fs.existsSync(path.join(tempRoot, ".gemini")), false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  },
);
