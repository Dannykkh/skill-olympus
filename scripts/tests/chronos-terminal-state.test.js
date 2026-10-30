"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { isolatedHomeEnv } = require("./isolated-home-env");

const repoRoot = path.resolve(__dirname, "../..");
const fixturePrefix = "olympus-chronos-terminal-";

function findBash() {
  const candidates = [process.env.BASH_PATH];
  if (process.platform === "win32") {
    for (const base of [process.env.ProgramFiles, process.env.ProgramW6432]) {
      if (base) candidates.push(path.join(base, "Git/bin/bash.exe"));
    }
  } else {
    candidates.push("/bin/bash", "/usr/bin/bash");
  }
  return candidates.find((candidate) => candidate && spawnSync(candidate, [
    "-c", "command -v jq >/dev/null && command -v perl >/dev/null && command -v git >/dev/null",
  ], { stdio: "ignore", timeout: 5000, windowsHide: true }).status === 0);
}

function available(command) {
  return spawnSync(command, ["-NoProfile", "-NonInteractive", "-Command", "exit 0"], {
    stdio: "ignore", timeout: 5000, windowsHide: true,
  }).status === 0;
}

function shellPath(value) {
  return value.replaceAll("\\", "/").replace(/^([A-Za-z]):\//, (_, drive) => `/${drive.toLowerCase()}/`);
}

const bash = findBash();
const powershells = [{ name: "PowerShell", command: "pwsh" }];
if (process.platform === "win32") powershells.push({ name: "Windows PowerShell", command: "powershell.exe" });

const runners = [
  { name: "Claude Bash Stop", kind: "claude", command: bash, script: "hooks/loop-stop.sh", bash: true },
  { name: "Codex Bash notify", kind: "codex", command: bash, script: "skills/auto-continue-loop/scripts/continue-loop.sh", bash: true },
  { name: "Antigravity Stop", kind: "antigravity", command: process.execPath, script: "hooks/antigravity-hook.js" },
];
for (const runtime of powershells) {
  const command = available(runtime.command) ? runtime.command : null;
  runners.push(
    { name: `Claude ${runtime.name} Stop`, kind: "claude", command, script: "hooks/loop-stop.ps1" },
    { name: `Codex ${runtime.name} notify`, kind: "codex", command, script: "skills/auto-continue-loop/scripts/continue-loop.ps1" },
  );
}

function runFixture(runner, output, { iteration = 0, maximum = 4, promise = "null" } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), fixturePrefix));
  try {
    const stateDir = path.join(directory, { claude: ".claude", codex: ".codex", antigravity: ".chronos" }[runner.kind]);
    const statePath = path.join(stateDir, "loop-state.md");
    const transcriptPath = path.join(directory, "transcript.jsonl");
    const home = path.join(directory, "home");
    fs.mkdirSync(stateDir, { recursive: true });
    fs.mkdirSync(home);
    fs.writeFileSync(statePath, [
      "---", `iteration: ${iteration}`, `max_iterations: ${maximum}`,
      `completion_promise: ${promise}`, "session_id: terminal-test", "---",
      "Verify every in-scope requirement and fix the next actionable issue.", "",
    ].join("\n"));
    const transcript = runner.kind === "antigravity"
      ? { source: "MODEL", type: "MESSAGE", content: output }
      : { message: { role: "assistant", content: [{ type: "text", text: output }] } };
    fs.writeFileSync(transcriptPath, `${JSON.stringify(transcript)}\n`);
    const payload = runner.kind === "antigravity"
      ? { conversationId: "terminal-test", workspacePaths: [directory], transcriptPath }
      : runner.kind === "codex"
        ? { cwd: directory, "session-id": "terminal-test", "turn-id": "turn-1", "last-assistant-message": output }
        : { session_id: "terminal-test", transcript_path: runner.bash ? shellPath(transcriptPath) : transcriptPath };
    const script = path.join(repoRoot, runner.script);
    const args = runner.bash ? [shellPath(script)] : runner.kind === "antigravity"
      ? [script, "chronos"] : ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script];
    // save-turn passes the notify payload as a file argument. Keep that production
    // path; stdin is a separate fallback with its own PowerShell decoding behavior.
    if (runner.kind === "codex") {
      const payloadPath = path.join(directory, "notify.json");
      fs.writeFileSync(payloadPath, JSON.stringify(payload));
      args.push(runner.bash ? shellPath(payloadPath) : payloadPath);
    }
    const env = isolatedHomeEnv(home, { CHRONOS_DRY_RUN: "1" });
    delete env.GROK_HOOK_EVENT;
    delete env.DEVIN_PROJECT_DIR;
    const result = spawnSync(runner.command, args, {
      cwd: directory, input: runner.kind === "codex" ? "" : JSON.stringify(payload), env,
      encoding: "utf8", timeout: 15000, windowsHide: true,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${runner.name}\n${result.stdout}\n${result.stderr}`);
    const readIfExists = (file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    const state = readIfExists(statePath);
    const log = readIfExists(path.join(home, ".codex/hooks/chronos-continue.log")) || "";
    const preview = readIfExists(path.join(directory, "docs/chronos/codex-resume-preview.txt"));
    const response = result.stdout.trim().startsWith("{") ? JSON.parse(result.stdout) : null;
    return { state, log, preview, response, output: `${result.stdout}\n${result.stderr}` };
  } finally {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith(fixturePrefix));
    fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

function assertContinued(runner, result) {
  assert.notEqual(result.state, null, result.output + result.log);
  assert.match(result.state, /^iteration: 1\r?$/m);
  if (runner.kind === "codex") {
    assert.ok(result.preview, "dry run must prepare a real resume prompt without launching Codex");
    assert.match(result.log, /dry-run:/);
    assert.doesNotMatch(result.log, /loop-(?:complete|blocked|exhausted):/);
  } else {
    assert.equal(result.response.decision, runner.kind === "claude" ? "block" : "continue");
  }
}

for (const runner of runners) {
  const options = { skip: runner.command ? false : `${runner.name} runtime or required utilities unavailable` };

  test(`${runner.name}: proved completion stops successfully`, options, () => {
    const result = runFixture(runner, "══ Chronos Complete ══\nAC-1: proved; verification gate passed.");
    assert.equal(result.state, null, result.output + result.log);
    assert.equal(result.preview, null);
    assert.doesNotMatch(result.output + result.log, /Chronos Blocked|loop-blocked:|EXHAUSTED|loop-exhausted:/);
    if (runner.kind === "codex") assert.match(result.log, /loop-complete:/);
    if (runner.kind === "antigravity") assert.equal(result.response.decision, "allow");
  });

  test(`${runner.name}: parked requirements stop as incomplete`, options, () => {
    const result = runFixture(runner, [
      "", " \t", "══ Chronos Blocked — 외부 접근 대기 ══",
      "AC-1: missing (PARKED: external access unavailable).",
      "Owner Decision Brief: supply a test account to verify the denial path.",
      "Chronos Complete is not justified by this evidence.",
    ].join("\r\n"));
    assert.equal(result.state, null, result.output + result.log);
    assert.equal(result.preview, null);
    const terminal = result.output + result.log;
    assert.match(terminal, /Chronos Blocked|loop-blocked:/);
    assert.match(terminal, /not success/);
    assert.doesNotMatch(terminal, /loop-complete:|작업 완료|완료 조건 달성/);
    if (runner.kind === "antigravity") assert.equal(result.response.decision, "allow");
    if (runner.kind === "claude") assert.equal(result.response.decision, undefined);
  });

  test(`${runner.name}: actionable work continues`, options, () => {
    assertContinued(runner, runFixture(runner, "AC-1 passed. AC-2 still needs its negative control. The next check is ready."));
  });

  test(`${runner.name}: mentioning a possible blocked report does not stop`, options, () => {
    assertContinued(runner, runFixture(runner, "A later Chronos Blocked report may be needed. One authorized check remains now."));
  });

  test(`${runner.name}: a blocked marker inside a code example does not stop`, options, () => {
    assertContinued(runner, runFixture(runner, [
      "검증을 계속 진행합니다. 다음은 보고 형식 예시입니다:",
      "```text", "Chronos Blocked", "```", "아직 실행 가능한 검사가 있습니다.",
    ].join("\n")));
  });

  test(`${runner.name}: a later blocked subheading does not stop`, options, () => {
    assertContinued(runner, runFixture(runner, [
      "", "진행 보고: 남은 검사 1건을 실행합니다.", "",
      "## Chronos Blocked — 발생 시 보고 예시", "현재는 진행 가능한 검사가 있습니다.",
    ].join("\n")));
  });

  test(`${runner.name}: matching completion promise still stops`, options, () => {
    const result = runFixture(runner, "All requirements proved.\n<promise>all checks passed</promise>", { promise: '"all checks passed"' });
    assert.equal(result.state, null, result.output + result.log);
    assert.equal(result.preview, null);
    if (runner.kind === "codex") assert.match(result.log, /loop-complete:/);
  });

  test(`${runner.name}: exhausted iteration budget remains incomplete`, options, () => {
    const result = runFixture(runner, "AC-2 remains missing; the permitted attempts are exhausted.", { iteration: 4 });
    assert.equal(result.state, null, result.output + result.log);
    assert.equal(result.preview, null);
    assert.match(result.output + result.log, /EXHAUSTED|loop-exhausted:/);
    assert.doesNotMatch(result.log, /loop-complete:/);
    if (runner.kind === "antigravity") assert.equal(result.response.decision, "allow");
  });
}
