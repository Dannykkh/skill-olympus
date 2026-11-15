"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { isolatedHomeEnv } = require("./isolated-home-env");

const repo = path.resolve(__dirname, "../..");
const installer = path.join(repo, "skills/codex-mnemo/install.js");
const ps5 = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
const ps7 = "C:/Program Files/PowerShell/7/pwsh.exe";
const quote = value => `'${value.replaceAll("'", "''")}'`;
const windows = process.platform === "win32" && fs.existsSync(ps5);

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mnemo-notify-forward-"));
  const home = path.join(root, "codex home 한글");
  const workspace = fs.mkdtempSync(path.join(path.dirname(repo), ".codex-notify-project-"));
  const project = path.join(workspace, "project 한글");
  fs.mkdirSync(path.join(home, "hooks"), { recursive: true });
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, ".mnemo-root"), "");
  const env = isolatedHomeEnv(root, {
    CODEX_HOME: home, MNEMO_DISABLE: "0", MNEMO_STRICT: "1",
    TERMSNAP_INTERNAL_KNOWLEDGE_JOB: "0", TERMSNAP_PROJECT_PATH: project,
  });
  t.after(() => {
    assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("mnemo-notify-forward-"));
    assert.equal(path.dirname(workspace), path.dirname(repo));
    assert.ok(path.basename(workspace).startsWith(".codex-notify-project-"));
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, home, project, env };
}

function install(f, ...args) {
  return spawnSync(process.execPath, [installer, ...args], {
    env: f.env, encoding: "utf8", windowsHide: true, timeout: 30000,
  });
}

function assertSuccess(result) {
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
}

for (const [label, shell, legacy] of [
  ["PowerShell 5.1", ps5, false],
  ["PowerShell 7 Legacy", ps7, true],
]) {
  for (const kind of ["Mnemo", "TermSnap"]) {
    test(`${kind} relay preserves JSON and stores the complete turn in ${label}`, {
      skip: !windows || !fs.existsSync(shell),
    }, t => {
      const f = fixture(t);
      const receipt = path.join(f.root, "receipt.json");
      const capture = path.join(f.home, "hooks", "capture.ps1");
      fs.writeFileSync(capture, "\uFEFF" +
        `[IO.File]::WriteAllText(${quote(receipt)}, [string]$args[0], (New-Object Text.UTF8Encoding $false))\nexit 0\n`);
      let notify = [shell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", capture];
      let original;
      if (kind === "TermSnap") {
        const wrapper = path.join(f.home, "hooks", "ide-response-notify-wrapper.ps1");
        original = [
          "# ide-response-notify-wrapper.ps1", "# version: v17",
          '$ErrorActionPreference = "SilentlyContinue"',
          "$notificationArgs = @($args)",
          `$previousCommand = ${quote(ps5)}`,
          `$previousArguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ${quote(path.join(f.home, "hooks", "save-turn.ps1"))})`,
          `$termSnapPowerShell = ${quote(shell)}`,
          `$termSnapArguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ${quote(capture)})`,
          "try {",
          "    if ($previousCommand) { & $previousCommand @previousArguments @notificationArgs }",
          "} finally {",
          "    & $termSnapPowerShell @termSnapArguments @notificationArgs",
          "}", "exit 0", "",
        ].join("\n");
        fs.writeFileSync(wrapper, "\uFEFF" + original);
        notify = [...notify.slice(0, -1), wrapper];
      }
      fs.writeFileSync(path.join(f.home, "config.toml"), `notify = ${JSON.stringify(notify)}\n`);
      const installed = install(f);
      assertSuccess(installed);
      const config = fs.readFileSync(path.join(f.home, "config.toml"), "utf8");
      const active = kind === "TermSnap" ? notify : [
        shell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
        path.join(f.home, "hooks", "codex-mnemo-notify-wrapper.ps1"),
      ];
      assert.ok(config.replaceAll("\\", "/").includes(active.at(-1).replaceAll("\\", "/")), config);
      const wrapper = active.at(-1);
      if (legacy) {
        const text = fs.readFileSync(wrapper, "utf8").replace(/^\uFEFF/, "");
        fs.writeFileSync(wrapper, "\uFEFF$PSNativeCommandArgumentPassing = 'Legacy'\n" + text);
      }
      const payload = {
        type: "agent-turn-complete", cwd: f.project,
        "thread-id": "notify-forwarding-test", "turn-id": "notify-forwarding-turn",
        "input-messages": ['한글 "quoted" input\nC:\\path with spaces\\', 'follow-up `literal` $(literal); & | < >'],
        "last-assistant-message": '한글 "answer"\n```text\nC:\\trailing\\\n```',
      };
      const json = JSON.stringify(payload);
      for (let replay = 0; replay < 2; replay++) {
        assertSuccess(spawnSync(shell, [...active.slice(1), json], {
          env: f.env, encoding: "utf8", windowsHide: true, timeout: 30000,
        }));
        assert.equal(fs.readFileSync(receipt, "utf8"), json);
      }
      const saved = fs.readdirSync(path.join(f.project, "conversations"))
        .filter(name => name.endsWith("-codex.md"))
        .map(name => fs.readFileSync(path.join(f.project, "conversations", name), "utf8")).join("\n");
      for (const input of payload["input-messages"]) assert.ok(saved.includes(input));
      assert.ok(saved.includes(payload["last-assistant-message"]));
      assert.equal(saved.split("<!-- turn:notify-forwarding-turn -->").length - 1, 1);
      const beforeReinstall = fs.readFileSync(wrapper, "utf8");
      assertSuccess(install(f));
      assert.equal(fs.readFileSync(wrapper, "utf8"), beforeReinstall);
      assertSuccess(install(f, "--check"));
      if (original) {
        assert.equal(fs.readFileSync(`${wrapper}.pre-mnemo-transport.bak`, "utf8"), "\uFEFF" + original);
        fs.writeFileSync(wrapper, "\uFEFF" + original);
        const unsafe = install(f, "--check");
        assert.equal(unsafe.status, 1);
        assert.match(unsafe.stdout, /UNSAFE native notify forwarding/);
      }
    });
  }
}

test("native forwarding retains empty arguments, backslashes, Unicode and literal shell syntax", {
  skip: !windows,
}, t => {
  const f = fixture(t);
  const receipt = path.join(f.root, "argv.json");
  const capture = path.join(f.root, "capture.js");
  const entry = path.join(f.root, "entry.ps1");
  const values = ["", "한글", 'a"b', "C:\\space and slash\\", '\\\\"', "` $(literal); & | <> %PATH%"];
  fs.writeFileSync(capture, `require('node:fs').writeFileSync(${JSON.stringify(receipt)}, JSON.stringify(process.argv.slice(2)));`);
  fs.writeFileSync(entry, "\uFEFF" + [
    "$PSNativeCommandArgumentPassing = 'Legacy'",
    `. ${quote(path.join(repo, "skills/codex-mnemo/hooks/invoke-notify.ps1"))}`,
    `$values = ConvertFrom-Json ${quote(JSON.stringify([capture, ...values]))}`,
    `Invoke-MnemoNotifyCommand -Command ${quote(process.execPath)} -CommandArguments $values | Out-Null`,
  ].join("\n"), "utf8");
  for (const shell of [ps5, ps7].filter(fs.existsSync)) {
    assertSuccess(spawnSync(shell, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", entry], {
      env: f.env, encoding: "utf8", windowsHide: true, timeout: 15000,
    }));
    assert.deepEqual(JSON.parse(fs.readFileSync(receipt, "utf8")), values);
  }
});
