const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const installSh = path.join(repoRoot, "install.sh");

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

  return candidates.find((candidate) => {
    if (!candidate || (!path.isAbsolute(candidate) && !fs.existsSync(candidate))) {
      return false;
    }
    return spawnSync(candidate, ["--version"], { stdio: "ignore" }).status === 0;
  });
}

function shellPath(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  const drivePath = normalized.match(/^([A-Za-z]):\/(.*)$/);
  return drivePath
    ? `/${drivePath[1].toLowerCase()}/${drivePath[2]}`
    : normalized;
}

function writeExecutable(filePath, contents) {
  fs.writeFileSync(filePath, contents, "utf8");
  fs.chmodSync(filePath, 0o755);
}

function seedOrchestratorRuntime(home) {
  const serverRoot = path.join(
    home,
    ".olympus",
    "runtime-modules",
    "orchestrator",
    "mcp-server",
  );
  fs.mkdirSync(path.join(serverRoot, "dist"), { recursive: true });
  fs.mkdirSync(path.join(serverRoot, "node_modules", "@modelcontextprotocol", "sdk"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(serverRoot, "node_modules", "better-sqlite3"), {
    recursive: true,
  });
  fs.writeFileSync(path.join(serverRoot, "dist", "index.js"), "// fixture\n");
  fs.writeFileSync(
    path.join(serverRoot, "node_modules", "@modelcontextprotocol", "sdk", "package.json"),
    "{}\n",
  );
  fs.writeFileSync(
    path.join(serverRoot, "node_modules", "better-sqlite3", "package.json"),
    "{}\n",
  );
}

function runIsolatedInstaller(bash, args, options = {}) {
  const {
    createGrokHome = false,
    failPrune = false,
    useCodexHomeOverride = false,
  } = options;
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-install-sh-test-"));
  const shimDir = path.join(tempHome, "bin");
  const codexHome = useCodexHomeOverride
    ? path.join(tempHome, "custom-codex-home")
    : path.join(tempHome, ".codex");

  try {
    fs.mkdirSync(shimDir, { recursive: true });
    const realNode = shellPath(process.execPath).replaceAll("'", "'\\''");
    writeExecutable(
      path.join(shimDir, "node"),
      `#!/usr/bin/env bash\ncase "\${1:-}" in\n  */install-select.js) exec '${realNode}' "$@" ;;\n  */prune-stale-assets.js) [ "\${FAIL_PRUNE:-0}" = "1" ] && exit 86 ;;\nesac\nexit 0\n`,
    );
    for (const command of ["claude", "codex", "agy", "jq"]) {
      writeExecutable(path.join(shimDir, command), "#!/usr/bin/env bash\nexit 0\n");
    }
    writeExecutable(
      path.join(shimDir, "npm"),
      "#!/usr/bin/env bash\necho 'unexpected npm invocation' >&2\nexit 97\n",
    );

    seedOrchestratorRuntime(path.join(tempHome, ".claude"));
    seedOrchestratorRuntime(codexHome);
    seedOrchestratorRuntime(path.join(tempHome, ".gemini", "antigravity-cli"));
    if (createGrokHome) fs.mkdirSync(path.join(tempHome, ".grok"), { recursive: true });

    const env = {
      ...process.env,
      HOME: shellPath(tempHome),
      USERPROFILE: tempHome,
      ANTIGRAVITY_HOME: shellPath(path.join(tempHome, ".gemini")),
      GROK_HOME: shellPath(path.join(tempHome, ".grok")),
      FAIL_PRUNE: failPrune ? "1" : "0",
      OLYMPUS_UPDATE_CHECK_DISABLE: "1",
      PATH: `${shimDir}${path.delimiter}${process.env.PATH || ""}`,
    };
    if (useCodexHomeOverride) env.CODEX_HOME = shellPath(codexHome);
    else delete env.CODEX_HOME;

    return spawnSync(
      bash,
      ["--noprofile", "--norc", "-u", shellPath(installSh), ...args],
      { cwd: repoRoot, env, encoding: "utf8", timeout: 30_000 },
    );
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}

const bash = findBash();

test(
  "install.sh --help exits before changing runtime homes",
  { skip: bash ? false : "bash is unavailable" },
  () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-install-sh-help-test-"));
    const shimDir = path.join(tempHome, "bin");

    try {
      fs.mkdirSync(shimDir, { recursive: true });
      writeExecutable(
        path.join(shimDir, "node"),
        "#!/usr/bin/env bash\necho 'unexpected node invocation' >&2\nexit 93\n",
      );
      const env = {
        ...process.env,
        HOME: shellPath(tempHome),
        USERPROFILE: tempHome,
        CODEX_HOME: shellPath(path.join(tempHome, ".codex")),
        ANTIGRAVITY_HOME: shellPath(path.join(tempHome, ".gemini")),
        PATH: `${shimDir}${path.delimiter}${process.env.PATH || ""}`,
      };
      const result = spawnSync(
        bash,
        ["--noprofile", "--norc", "-u", shellPath(installSh), "--help"],
        { cwd: repoRoot, env, encoding: "utf8", timeout: 30_000 },
      );
      const output = `${result.stdout || ""}\n${result.stderr || ""}`;

      assert.equal(result.status, 0, output);
      assert.match(output, /Usage: bash install\.sh \[options\]/);
      assert.doesNotMatch(output, /unexpected node invocation|Skills 설치 중|설치 완료/);
      for (const runtimeHome of [".claude", ".codex", ".gemini", ".grok"]) {
        assert.equal(fs.existsSync(path.join(tempHome, runtimeHome)), false);
      }
    } finally {
      fs.rmSync(tempHome, { recursive: true, force: true });
    }
  },
);

for (const scenario of [
  { name: "default selection and CODEX_HOME fallback", args: [], override: false },
  { name: "--all selection and CODEX_HOME override", args: ["--all"], override: true },
]) {
  test(
    `install.sh isolates ${scenario.name}`,
    { skip: bash ? false : "bash is unavailable" },
    () => {
      const result = runIsolatedInstaller(bash, scenario.args, {
        useCodexHomeOverride: scenario.override,
      });
      const output = `${result.stdout || ""}\n${result.stderr || ""}`;

      assert.equal(result.error, undefined, output);
      assert.equal(result.status, 0, output);
      assert.match(output, /LLM: claude,codex,antigravity,grok/);
      assert.doesNotMatch(output, /unbound variable/);
      assert.doesNotMatch(output, /unexpected npm invocation/);

      const codexSummary = output.match(
        /\n  \[Codex\]\n([\s\S]*?)(?:\n  \[(?:Antigravity|Grok)\]|\n  If a same-name asset)/,
      );
      assert.ok(codexSummary, output);
      assert.match(codexSummary[1], /- Orchestrator: 등록 완료/);
    },
  );
}

for (const scenario of [
  {
    name: "Claude",
    args: ["--llm", "claude"],
    expected: "Claude stale asset 정리 실패",
  },
  {
    name: "Grok compatibility",
    args: ["--llm", "grok"],
    createGrokHome: true,
    expected: "Grok 호환 stale asset 정리 실패",
  },
]) {
  test(
    `install.sh stops when ${scenario.name} stale-asset pruning fails`,
    { skip: bash ? false : "bash is unavailable" },
    () => {
      const result = runIsolatedInstaller(bash, scenario.args, {
        createGrokHome: scenario.createGrokHome,
        failPrune: true,
      });
      const output = `${result.stdout || ""}\n${result.stderr || ""}`;

      assert.equal(result.error, undefined, output);
      assert.equal(result.status, 1, output);
      assert.match(output, new RegExp(scenario.expected));
      assert.doesNotMatch(output, /설치 완료!/);
    },
  );
}
