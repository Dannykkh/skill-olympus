const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { isolatedHomeEnv } = require("./isolated-home-env");

const hooks = path.resolve(__dirname, "../../hooks");
const { captureTool } = require(path.join(hooks, "claude-event-store.js"));
const windows = process.platform === "win32";
const bash = windows ? path.join(process.env.ProgramFiles, "Git/bin/bash.exe") : "bash";
const powershell = windows ? "powershell.exe" : "pwsh";
function fixture(t) {
  const dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "mnemo-capture-")));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const root = path.join(dir, "project"), home = path.join(dir, "home"), temp = path.join(dir, "temp");
  for (const p of [root, home, temp]) fs.mkdirSync(p);
  fs.writeFileSync(path.join(root, ".mnemo-root"), "");
  const env = isolatedHomeEnv(home, { TMP: temp, TEMP: temp, TMPDIR: temp, CODEX_HOME: path.join(home, ".codex"),
    GROK_HOOK_EVENT: "", DEVIN_PROJECT_DIR: "", MNEMO_DISABLE: "", OLYMPUS_UPDATE_CHECK_DISABLE: "1" });
  return { root, env };
}

function invoke(shell, hook, payload, fixture, hookDir = hooks) {
  const file = path.join(hookDir, hook + (shell === bash ? ".sh" : ".ps1"));
  const args = shell === bash ? [file.replaceAll("\\", "/")] : ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", file];
  const run = spawnSync(shell, args, { cwd: fixture.root, input: JSON.stringify(payload), env: fixture.env,
    encoding: "utf8", windowsHide: true, timeout: 30000 });
  assert.equal(run.status, 0, String(run.error || run.stderr));
  return run.stdout.replace(/^\uFEFF/, "");
}

for (const [label, shell] of [["Bash", bash], ["PowerShell", powershell]]) {
  const unavailable = spawnSync(shell, shell === bash ? ["--version"] : ["-NoProfile", "-Command", "exit 0"]).status !== 0;
  test(label + " preserves distinct calls and deduplicates a redelivered tool_use_id", { skip: unavailable }, t => {
    const f = fixture(t);
    const payload = { project_root: f.root, tool_name: "Edit", session_id: "session", tool_response: "ok" };
    for (const id of ["one", "two", "one"]) {
      invoke(shell, "save-tool-use", { ...payload, tool_use_id: id,
        tool_input: { file_path: path.join(f.root, "src", "한글-" + id + ".js") } }, f);
    }
    const dir = path.join(f.root, "conversations");
    const filename = fs.readdirSync(dir).find(name => name.endsWith("-toollog.md"));
    const rows = fs.readFileSync(path.join(dir, filename), "utf8").split(/\r?\n/).filter(line => line.startsWith("- "));
    assert.equal(rows.length, 2, JSON.stringify(rows));
    assert.deepEqual(rows.map(line => line.split("**Edit** ")[1]), ["src/한글-one.js", "src/한글-two.js"]);
    const observations = fs.readFileSync(path.join(f.root, "memory/learned/observations.jsonl"), "utf8").trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(observations.length, 2);
    assert.deepEqual(observations.map(obs => JSON.parse(obs.input).file_path), ["src/한글-one.js", "src/한글-two.js"]);
  });
  test(label + " counts recent legacy and zoned ISO errors at SessionStart", { skip: unavailable }, t => {
    const f = fixture(t);
    const now = Date.now();
    const date = new Date(now - 30000);
    const local = new Date(date - date.getTimezoneOffset() * 60000).toISOString().slice(0,19).replace("T"," ");
    const offset = new Date(+date + 9 * 3600000).toISOString().replace("Z", "+09:00");
    const log = [local, date.toISOString(), offset, new Date(now - 25*3600000).toISOString(),
      "garbage", new Date(now + 3600000).toISOString()].map(ts => "[" + ts + "] detail").join("\n");
    fs.mkdirSync(path.join(f.root, ".claude"));
    fs.writeFileSync(path.join(f.root, ".claude/mnemo-errors.log"), log);
    f.env.MNEMO_DISABLE = "1";
    const out = invoke(shell, "reconcile-conversations", { project_root: f.root }, f);
    assert.match(JSON.parse(out).systemMessage, /에러 3건/);
  });
}

test("concurrent deliveries, another session and legacy ID-less calls retain their own rows", async t => {
  const f = fixture(t), now = new Date(2026, 10, 22, 23, 59, 59);
  const original = { tool_name: "Bash", tool_input: { command: "echo ok" }, session_id: "same" };
  const events = ["one", "one", "two", null, null].map(tool_use_id => ({ ...original, tool_use_id }));
  events.push({ ...original, session_id: "other", tool_use_id: "one" });
  await Promise.all(events.map(event => captureTool(f.root, event, "learned", now)));
  await captureTool(f.root, events[0], "learned", new Date(+now + 2000));
  const dir = path.join(f.root, "conversations");
  assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith("-toollog.md")), ["2026-11-22-toollog.md"]);
  const lines = fs.readFileSync(path.join(dir, "2026-11-22-toollog.md"), "utf8").split(/\r?\n/);
  assert.equal(lines.filter(line => line.startsWith("- `[23:59:59]`")).length, 5);
  const observations = fs.readFileSync(path.join(f.root, "memory/learned/observations.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(observations.length, 5);
  assert.equal(observations.filter(obs => !obs.mnemo_tool_event).length, 2);
});

test("retry finishes a failed Markdown append after its observation has rotated", async t => {
  const f = fixture(t), now = new Date(2026, 10, 22, 23, 59, 59);
  const payload = { tool_name: "Bash", tool_input: { command: "first" }, session_id: "s", tool_use_id: "retry" };
  const file = path.join(f.root, "conversations/2026-11-22-toollog.md");
  fs.mkdirSync(file, { recursive: true }); // A directory in the way makes the final append fail.
  await assert.rejects(captureTool(f.root, payload, "learned", now));
  const directory = path.join(f.root, "memory/learned");
  const observations = path.join(directory, "observations.jsonl");
  fs.mkdirSync(path.join(directory, "archive"));
  fs.renameSync(observations, path.join(directory, "archive/observations-previous.jsonl"));
  fs.rmdirSync(file);
  await captureTool(f.root, payload, "learned", new Date(+now + 2000));
  assert.match(fs.readFileSync(file, "utf8"), /\[23:59:59\].*Bash.*first/);
  assert.equal(fs.existsSync(observations), false);
});

test("source and installed NotebookEdit hooks feed session-scoped handoff CLIs", t => {
  const f = fixture(t), config = f.env.CLAUDE_CONFIG_DIR;
  const repo = path.dirname(hooks), source = path.join(repo, "skills/mnemo");
  const packaged = path.join(config, "skills/mnemo");
  const opts = { cwd: f.root, env: { ...f.env, PYTHONUTF8: "1", PYTHONDONTWRITEBYTECODE: "1" },
    windowsHide: true, encoding: "utf8", timeout: 60000 };
  const python = ["python3", "python", "py"].find(cmd => spawnSync(cmd, ["--version"], opts).status === 0);
  if (!python) return t.skip("Python 3 handoff runtime unavailable");
  const sync = spawnSync(process.execPath, [path.join(repo, "scripts/sync-claude-skills.js"), config], opts);
  assert.equal(sync.status, 0, sync.stderr);
  const install = spawnSync(process.execPath, [path.join(packaged, "install.js")], opts);
  assert.equal(install.status, 0, install.stderr);

  const current = "12345678-aaaa-bbbb-cccc-1234567890ab";
  const other = "12345678-aaaa-bbbb-cccc-1234567890ac";
  const sessions = [[current, "분석"], [other, "별도"]];
  let observedHooks = 0;
  for (const [label, shell] of [["bash", bash], ["powershell", powershell]]) {
    if (spawnSync(shell, shell === bash ? ["--version"] : ["-NoProfile", "-Command", "exit 0"]).status !== 0) continue;
    if (shell === bash && spawnSync(shell, ["-c", "command -v jq"], opts).status !== 0) continue;
    const hookDir = (shell === powershell) === windows ? path.join(config, "hooks") : path.join(packaged, "hooks");
    for (const [session, name] of sessions) {
      const notebook = "notebooks/" + label + "-" + name + ".ipynb";
      invoke(shell, "save-tool-use", { project_root: f.root, session_id: session, tool_name: "NotebookEdit",
        tool_use_id: label + name, tool_input: { notebook_path: path.join(f.root, notebook) }, tool_response: "ok" }, f, hookDir);
    }
    observedHooks++;
  }
  assert.ok(observedHooks > 0);
  const observed = fs.readFileSync(path.join(f.root, "memory/learned/observations.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(observed.length, observedHooks * 2);
  const logs = path.join(f.root, "conversations");
  const log = fs.readFileSync(path.join(logs, fs.readdirSync(logs).find(file => file.endsWith("-toollog.md"))), "utf8");
  for (const row of observed) {
    assert.equal(row.tool, "NotebookEdit");
    assert.equal(row.event, "tool_success");
    assert.ok(log.includes("**NotebookEdit** " + JSON.parse(row.input).notebook_path));
  }
  for (const [cli, module] of [["source", source], ["installed", packaged]]) {
    const run = spawnSync(python, [path.join(module, "scripts/create_handoff.py"), cli, "--project-root", f.root,
      "--origin", "notebook changes", "--origin-source", "session " + current], opts);
    assert.equal(run.status, 0, run.stderr);
    const dir = path.join(f.root, "docs/handoffs");
    const contents = fs.readFileSync(path.join(dir, fs.readdirSync(dir).find(f => f.endsWith("-" + cli + ".md"))), "utf8");
    for (const row of observed) {
      const notebook = JSON.parse(row.input).notebook_path;
      assert.ok(notebook.startsWith("notebooks/"));
      assert.equal(contents.includes("| " + notebook + " |"), row.session === current, cli + ": " + notebook);
    }
  }
});
