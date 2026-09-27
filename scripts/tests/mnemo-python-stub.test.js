// 이름만 Python인 명령을 고르지 않는다.
//
// Windows 스토어 스텁(WindowsApps\python.exe·python3.exe)은 PATH에서 찾히지만 실행하면 실패한다
// (exit 9009). macOS·Homebrew에는 python3만 있다. 훅이 이름만 보고 python을 고르면 기억 항목을
// 고친 뒤의 앵커 색인 재생성이 조용히 멈추고(save-tool-use), API 파일마다 가짜 구문 오류가 난다
// (validate-api). reconcile 훅·install.js처럼 --version이 되는 첫 명령을 써야 한다.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO = path.join(__dirname, "..", "..");
const WIN = process.platform === "win32";
// Windows는 python·python3 둘 다 스텁이고 py 런처가 답이다. 그 밖에서는 python만 없고 python3가 답이다.
const STUBBED = WIN ? ["python", "python3"] : ["python"];
const FALLBACK = WIN ? "py" : "python3";

function works(cmd) {
  return spawnSync(cmd, ["--version"], { encoding: "utf8", timeout: 10000, windowsHide: true }).status === 0;
}

function has(cmd) {
  return spawnSync(cmd, ["--version"], { stdio: "ignore", timeout: 10000, windowsHide: true }).error === undefined;
}

// skip: null은 Node 22에서 "건너뜀"으로 처리된다 — 없을 때는 false.
const skipReason = !works(FALLBACK) ? `${FALLBACK} 없음` : false;

// 스텁을 PATH 맨 앞에 둔다. PowerShell은 .cmd를, bash는 확장자 없는 스크립트를 먼저 찾는다.
function stubEnv(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "py-stub-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const name of STUBBED) {
    if (WIN) fs.writeFileSync(path.join(dir, `${name}.cmd`), "@exit /b 9009\r\n");
    fs.writeFileSync(path.join(dir, name), "#!/bin/sh\nexit 49\n", { mode: 0o755 });
  }
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") || "PATH";
  return { ...process.env, [key]: `${dir}${path.delimiter}${process.env[key]}` };
}

// 공백 있는 루트 — Start-Process는 인자를 따옴표로 감싸지 않아 Visual Studio 2022 같은 경로가 쪼개졌다.
// 훅의 루트 판정은 Temp를 거부하므로 저장소 옆에 만든다.
function project(t) {
  const root = fs.mkdtempSync(path.join(path.dirname(REPO), ".mnemo py stub-"));
  t.after(() => {
    assert.ok(path.basename(root).startsWith(".mnemo py stub-"));
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.writeFileSync(path.join(root, ".mnemo-root"), "");
  const scripts = path.join(root, "skills", "mnemo", "scripts");
  fs.mkdirSync(scripts, { recursive: true });
  for (const name of ["build_anchor_index.py", "mnemo_project_root.py"]) {
    fs.copyFileSync(path.join(REPO, "skills", "mnemo", "scripts", name), path.join(scripts, name));
  }
  fs.mkdirSync(path.join(root, "hooks"));
  fs.copyFileSync(path.join(REPO, "hooks", "mnemo-project-root.js"), path.join(root, "hooks", "mnemo-project-root.js"));
  fs.mkdirSync(path.join(root, "memory", "architecture"), { recursive: true });
  fs.writeFileSync(path.join(root, "memory", ".mnemo-anchor-index.md"), "# stale\n");
  fs.writeFileSync(path.join(root, "memory", "architecture", "001-x.md"),
    "# x\n\n`status: ✅ CURRENT`\n`files:` src/app.py\n");
  return root;
}

function waitForRebuild(root) {
  const index = path.join(root, "memory", ".mnemo-anchor-index.md");
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (fs.readFileSync(index, "utf8").includes("src/app.py")) return true;
    spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 250)"]);
  }
  return false;
}

function editPayload(root) {
  return JSON.stringify({
    tool_name: "Edit", session_id: "stub-test", cwd: root,
    tool_input: { file_path: path.join(root, "memory", "architecture", "001-x.md") },
  });
}

test("save-tool-use.ps1: 스텁을 건너뛰고 공백 있는 루트에서도 앵커 색인을 다시 만든다",
  { skip: !WIN ? "Windows 전용" : skipReason }, (t) => {
    const root = project(t);
    const run = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
      path.join(REPO, "hooks", "save-tool-use.ps1")],
      { input: editPayload(root), env: stubEnv(t), encoding: "utf8", timeout: 60000, windowsHide: true });
    assert.equal(run.status, 0, run.stderr);
    assert.ok(waitForRebuild(root), "앵커 색인이 다시 만들어지지 않았습니다");
  });

test(`save-tool-use.sh: python이 없거나 스텁이어도 ${FALLBACK}로 앵커 색인을 다시 만든다`,
  { skip: !has("bash") || !has("jq") ? "bash·jq 없음" : skipReason }, (t) => {
    const root = project(t);
    const run = spawnSync("bash", [path.join(REPO, "hooks", "save-tool-use.sh")],
      { input: editPayload(root), env: stubEnv(t), encoding: "utf8", timeout: 60000, windowsHide: true });
    assert.equal(run.status, 0, run.stderr);
    assert.ok(waitForRebuild(root), "앵커 색인이 다시 만들어지지 않았습니다");
  });

function apiFile(t, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "py-stub-api-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "api", "routes.py");
  fs.mkdirSync(path.dirname(file));
  fs.writeFileSync(file, body);
  return JSON.stringify({ tool_input: { file_path: file.replace(/\\/g, "/") } });
}

const validators = [
  ["validate-api.ps1", "powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File"], !WIN ? "Windows 전용" : skipReason],
  ["validate-api.sh", "bash", [], !has("bash") || !has("jq") ? "bash·jq 없음" : skipReason],
];

for (const [hook, shell, args, skip] of validators) {
  test(`${hook}: 스텁 때문에 올바른 파일을 구문 오류로 보고하지 않고, 진짜 오류는 잡는다`, { skip }, (t) => {
    const env = stubEnv(t);
    const run = (payload) => spawnSync(shell, [...args, path.join(REPO, "hooks", hook)],
      { input: payload, env, encoding: "utf8", timeout: 60000, windowsHide: true });
    const ok = run(apiFile(t, "def ok():\n    return 1\n"));
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.doesNotMatch(ok.stdout, /syntax error/);
    const broken = run(apiFile(t, "def broken(:\n"));
    assert.equal(broken.status, 1, broken.stdout + broken.stderr);
    assert.match(broken.stdout, /syntax error/);
  });
}
