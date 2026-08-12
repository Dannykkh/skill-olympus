const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const mnemoRoot = path.join(repoRoot, "skills", "codex-mnemo");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function isolatedEnv(fakeHome, codexHome) {
  return {
    ...process.env,
    HOME: fakeHome,
    USERPROFILE: fakeHome,
    CODEX_HOME: codexHome,
  };
}

function writeRollout(root, projectRoot, fileName, touchedFile, message) {
  const sessionsDir = path.join(root, "sessions", "2026", "08", "13");
  fs.mkdirSync(sessionsDir, { recursive: true });
  const entries = [
    {
      timestamp: "2026-08-13T00:00:00Z",
      type: "session_meta",
      payload: { cwd: projectRoot },
    },
    {
      timestamp: "2026-08-13T00:00:01Z",
      type: "response_item",
      payload: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: message }],
      },
    },
    {
      timestamp: "2026-08-13T00:00:02Z",
      type: "response_item",
      payload: {
        type: "custom_tool_call",
        name: "apply_patch",
        input: `*** Begin Patch\n*** Add File: ${touchedFile}\n+fixture\n*** End Patch`,
      },
    },
    {
      timestamp: "2026-08-13T00:00:03Z",
      type: "response_item",
      payload: {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: `${message} response` }],
      },
    },
  ];
  fs.writeFileSync(
    path.join(sessionsDir, fileName),
    `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
    "utf8",
  );
}

function findPython() {
  const candidates = [];
  if (process.env.PYTHON) {
    candidates.push({ command: process.env.PYTHON, prefix: [] });
  }
  candidates.push(
    { command: "python", prefix: [] },
    { command: "python3", prefix: [] },
  );
  if (process.platform === "win32") {
    candidates.push({ command: "py", prefix: ["-3"] });
  }

  return candidates.find((candidate) => {
    const result = spawnSync(candidate.command, [...candidate.prefix, "--version"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return result.status === 0;
  });
}

test("Windows and Mnemo installers use CODEX_HOME before ~/.codex", () => {
  const installer = read("install.bat");
  assert.match(
    installer,
    /set "CODEX_DIR=%CODEX_HOME%"\r?\nif not defined CODEX_DIR set "CODEX_DIR=%USERPROFILE%\\\.codex"/,
  );
  assert.match(installer, /for %%I in \("%CODEX_DIR%"\) do set "CODEX_DIR=%%~fI"/);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-home-install-"));
  const fakeHome = path.join(tempRoot, "user-home");
  const codexHome = path.join(tempRoot, "custom-codex");
  fs.mkdirSync(fakeHome, { recursive: true });

  try {
    const result = spawnSync(process.execPath, [path.join(mnemoRoot, "install.js")], {
      cwd: repoRoot,
      env: isolatedEnv(fakeHome, codexHome),
      encoding: "utf8",
      windowsHide: true,
    });
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    assert.equal(result.status, 0, output);

    const platformHook = process.platform === "win32" ? "save-turn.ps1" : "save-turn.sh";
    assert.ok(fs.existsSync(path.join(codexHome, "hooks", platformHook)));
    assert.ok(fs.existsSync(path.join(codexHome, "hooks", "codex-hook-bridge.js")));
    assert.ok(
      fs.existsSync(
        path.join(codexHome, "scripts", "reconcile_codex_conversations.py"),
      ),
    );
    assert.ok(fs.existsSync(path.join(codexHome, "AGENTS.md")));

    const config = fs.readFileSync(path.join(codexHome, "config.toml"), "utf8");
    assert.match(config.replaceAll("\\", "/"), new RegExp(
      codexHome.replaceAll("\\", "/").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ));
    assert.equal(fs.existsSync(path.join(fakeHome, ".codex")), false);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("Mnemo installer falls back to ~/.codex when CODEX_HOME is unset", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-home-fallback-"));
  const fakeHome = path.join(tempRoot, "user-home");
  const expectedCodexHome = path.join(fakeHome, ".codex");
  fs.mkdirSync(fakeHome, { recursive: true });

  try {
    const env = { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome };
    delete env.CODEX_HOME;
    const result = spawnSync(process.execPath, [path.join(mnemoRoot, "install.js")], {
      cwd: repoRoot,
      env,
      encoding: "utf8",
      windowsHide: true,
    });
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    assert.equal(result.status, 0, output);
    assert.ok(fs.existsSync(path.join(expectedCodexHome, "config.toml")));
    assert.ok(fs.existsSync(path.join(expectedCodexHome, "AGENTS.md")));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("Mnemo hooks resolve sessions, bridge hooks, debug logs, and Chronos from CODEX_HOME", () => {
  const bridge = read("skills/codex-mnemo/hooks/codex-hook-bridge.js");
  assert.match(bridge, /process\.env\.CODEX_HOME/);
  assert.match(bridge, /path\.join\(CODEX_HOME, "sessions"\)/);
  assert.match(bridge, /path\.join\(CODEX_HOME, "hooks"/);
  assert.doesNotMatch(bridge, /os\.homedir\(\), "\.codex", "(?:sessions|hooks)"/);

  const saveTurnPs1 = read("skills/codex-mnemo/hooks/save-turn.ps1");
  assert.match(saveTurnPs1, /\$CodexHome = if \(\$env:CODEX_HOME\)/);
  assert.match(saveTurnPs1, /Join-Path \$CodexHome "hooks"/);
  assert.match(saveTurnPs1, /Join-Path \$CodexHome "sessions"/);
  assert.match(saveTurnPs1, /Join-Path \$CodexHome "skills\\auto-continue-loop/);
  assert.doesNotMatch(saveTurnPs1, /Join-Path \$HOME "\.codex\\(?:hooks|sessions|skills)/);

  const saveTurnSh = read("skills/codex-mnemo/hooks/save-turn.sh");
  assert.match(saveTurnSh, /CODEX_ROOT="\$\{CODEX_HOME:-\$HOME\/\.codex\}"/);
  assert.match(saveTurnSh, /DEBUG_FILE="\$CODEX_ROOT\/hooks\/save-turn-debug\.log"/);
  assert.match(saveTurnSh, /CHRONOS_CONTINUE="\$CODEX_ROOT\/skills\/auto-continue-loop/);
  assert.doesNotMatch(saveTurnSh, /"\$HOME\/\.codex\/(?:hooks|skills)/);

  const syncSessions = read("skills/codex-mnemo/hooks/sync-sessions.ps1");
  assert.match(syncSessions, /\$CodexHome = if \(\$env:CODEX_HOME\)/);
  assert.match(syncSessions, /Join-Path \$CodexHome "sessions"/);
  assert.match(syncSessions, /Join-Path \$CodexHome "hooks\\sync-state\.json"/);
  assert.match(syncSessions, /Join-Path \$CodexHome "hooks\\sync-targets\.txt"/);

  const reconcilePs1 = read("hooks/reconcile-conversations.ps1");
  assert.match(reconcilePs1, /\$codexHome = if \(\$env:CODEX_HOME\)/);
  assert.match(reconcilePs1, /Join-Path \$codexHome 'scripts\\reconcile_codex_conversations\.py'/);
  assert.doesNotMatch(reconcilePs1, /Join-Path \$HOME '\.codex\\scripts/);

  const reconcileSh = read("hooks/reconcile-conversations.sh");
  assert.match(reconcileSh, /CODEX_ROOT="\$\{CODEX_HOME:-\$HOME\/\.codex\}"/);
  assert.match(reconcileSh, /"\$CODEX_ROOT\/scripts\/reconcile_codex_conversations\.py"/);
  assert.doesNotMatch(reconcileSh, /"\$HOME\/\.codex\/scripts/);
});

test("hook bridge reads the current turn from custom CODEX_HOME sessions", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-home-bridge-"));
  const fakeHome = path.join(tempRoot, "user-home");
  const codexHome = path.join(tempRoot, "custom-codex");
  const projectRoot = path.join(tempRoot, "project");
  fs.mkdirSync(projectRoot, { recursive: true });

  try {
    writeRollout(codexHome, projectRoot, "rollout-custom.jsonl", "custom-home.txt", "custom home");
    writeRollout(
      path.join(fakeHome, ".codex"),
      projectRoot,
      "rollout-legacy.jsonl",
      "legacy-home.txt",
      "legacy home",
    );

    const result = spawnSync(
      process.execPath,
      [path.join(mnemoRoot, "hooks", "codex-hook-bridge.js"), `--base-dir=${projectRoot}`],
      {
        cwd: projectRoot,
        env: {
          ...isolatedEnv(fakeHome, codexHome),
          CODEX_HOOK_BRIDGE_HOOKS: "none",
        },
        input: JSON.stringify({ cwd: projectRoot }),
        encoding: "utf8",
        windowsHide: true,
      },
    );
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    assert.equal(result.status, 0, output);
    const summary = JSON.parse(result.stdout);
    assert.deepEqual(summary.touchedFiles, ["custom-home.txt"]);
    assert.deepEqual(summary.newFiles, ["custom-home.txt"]);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

const python = findPython();

test(
  "reconcile uses custom CODEX_HOME rollout JSONL as its source of truth",
  { skip: python ? false : "Python is unavailable" },
  () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-home-reconcile-"));
    const fakeHome = path.join(tempRoot, "user-home");
    const codexHome = path.join(tempRoot, "custom-codex");
    const projectRoot = path.join(tempRoot, "project");
    fs.mkdirSync(projectRoot, { recursive: true });

    try {
      writeRollout(
        codexHome,
        projectRoot,
        "rollout-custom.jsonl",
        "custom-home.txt",
        "custom source of truth",
      );
      writeRollout(
        path.join(fakeHome, ".codex"),
        projectRoot,
        "rollout-legacy.jsonl",
        "legacy-home.txt",
        "legacy source should be ignored",
      );

      const result = spawnSync(
        python.command,
        [
          ...python.prefix,
          path.join(mnemoRoot, "scripts", "reconcile_codex_conversations.py"),
          "--project-root",
          projectRoot,
          "--all",
          "--quiet",
        ],
        {
          cwd: projectRoot,
          env: isolatedEnv(fakeHome, codexHome),
          encoding: "utf8",
          windowsHide: true,
        },
      );
      const output = `${result.stdout || ""}\n${result.stderr || ""}`;
      assert.equal(result.status, 0, output);

      const conversationsDir = path.join(projectRoot, "conversations");
      const conversationText = fs
        .readdirSync(conversationsDir)
        .filter((name) => name.endsWith("-codex.md"))
        .map((name) => fs.readFileSync(path.join(conversationsDir, name), "utf8"))
        .join("\n");
      assert.match(conversationText, /custom source of truth/);
      assert.doesNotMatch(conversationText, /legacy source should be ignored/);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  },
);
