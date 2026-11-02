// 설치된 세션 시작 훅(reconcile-conversations.ps1·.sh)이 저장소의 update-check를 찾아
// 업데이트 안내를 systemMessage JSON으로 내보내는지 본다 (gotcha 127).
// 설치된 훅은 CLI 설정 폴더에서 돌아 형제 scripts/가 없다. 그 상태를 임시 폴더로 재현한다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const WIN = process.platform === "win32";
const repoVersion = fs.readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();

function findBash() {
  const candidates = [];
  if (process.env.BASH_PATH) candidates.push(process.env.BASH_PATH);
  if (WIN) {
    for (const base of [process.env.ProgramFiles, process.env.ProgramW6432]) {
      if (base) candidates.push(path.join(base, "Git", "bin", "bash.exe"));
    }
  } else {
    candidates.push("/bin/bash", "/usr/bin/bash");
  }
  return candidates.find(
    (candidate) => candidate && fs.existsSync(candidate) && spawnSync(candidate, ["--version"], { stdio: "ignore" }).status === 0,
  );
}

const shellPath = (p) => {
  const normalized = p.replaceAll("\\", "/");
  const drive = normalized.match(/^([A-Za-z]):\/(.*)$/);
  return drive ? `/${drive[1].toLowerCase()}/${drive[2]}` : normalized;
};

const bash = findBash();
const hasPowerShell = WIN && spawnSync("powershell", ["-NoProfile", "-Command", "exit 0"], { stdio: "ignore" }).status === 0;
const hasNode = spawnSync("node", ["--version"], { stdio: "ignore" }).status === 0;

function makeInstall() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "olympus-session-notice-"));
  const hooks = path.join(dir, "config", "hooks");
  const project = path.join(dir, "project");
  const state = path.join(dir, "state");
  fs.mkdirSync(hooks, { recursive: true });
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, ".mnemo-root"), "");
  for (const name of ["reconcile-conversations.ps1", "reconcile-conversations.sh", "mnemo-project-root.js"]) {
    fs.copyFileSync(path.join(repoRoot, "hooks", name), path.join(hooks, name));
  }
  // 설치기가 하는 일: 저장소 위치를 상태 폴더에 남긴다
  const record = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "record-repo-root.js")], {
    env: { ...process.env, OLYMPUS_STATE_DIR: state },
    encoding: "utf8",
  });
  assert.equal(record.status, 0, record.stderr);
  return { dir, hooks, project, state };
}

async function withRemote(version, fn) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(`${version}\n`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}/VERSION`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// 서버가 같은 프로세스에 있으므로 spawnSync 대신 비동기로 돌리고 stdin에 훅 페이로드를 준다.
function runHook(command, args, env, payload) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env, stdio: ["pipe", "pipe", "pipe"] });
    const out = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill(), 90000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: Buffer.concat(out), stderr });
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

function hookEnv(install, url, toPath) {
  // 프로젝트 루트 판정은 임시 폴더 아래를 저장 위치로 거부한다(gotcha 065). 훅 프로세스의 임시 폴더를
  // 다른 곳으로 돌려, 테스트 프로젝트가 평범한 프로젝트로 판정되게 한다.
  const otherTmp = path.join(install.dir, "other-tmp");
  fs.mkdirSync(otherTmp, { recursive: true });
  const env = {
    ...process.env,
    OLYMPUS_STATE_DIR: toPath(install.state),
    OLYMPUS_REMOTE_URL: url,
    MNEMO_DISABLE: "1",
    TEMP: otherTmp,
    TMP: otherTmp,
    TMPDIR: otherTmp,
  };
  for (const key of ["OLYMPUS_DIR", "OLYMPUS_UPDATE_CHECK_DISABLE", "GROK_HOOK_EVENT", "DEVIN_PROJECT_DIR", "CLAUDE_PROJECT_DIR"]) {
    delete env[key];
  }
  return env;
}

const RUNNERS = [
  {
    name: "reconcile-conversations.ps1",
    skip: hasPowerShell ? false : "Windows PowerShell 없음",
    run: (install, url) => runHook(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(install.hooks, "reconcile-conversations.ps1")],
      hookEnv(install, url, (p) => p),
      { hook_event_name: "SessionStart", cwd: install.project },
    ),
  },
  {
    name: "reconcile-conversations.sh",
    skip: bash && hasNode ? false : "bash 또는 node 없음",
    run: (install, url) => runHook(
      bash,
      [shellPath(path.join(install.hooks, "reconcile-conversations.sh"))],
      hookEnv(install, url, WIN ? shellPath : (p) => p),
      { hook_event_name: "SessionStart", cwd: install.project },
    ),
  },
];

test("record-repo-root.js stores this checkout in the Olympus state dir", () => {
  const state = fs.mkdtempSync(path.join(os.tmpdir(), "olympus-record-root-"));
  try {
    const result = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "record-repo-root.js")], {
      env: { ...process.env, OLYMPUS_STATE_DIR: state },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(state, "repo-root"), "utf8").trim(), repoRoot);
  } finally {
    fs.rmSync(state, { recursive: true, force: true });
  }
});

for (const runner of RUNNERS) {
  test(`installed ${runner.name} shows a newer version as one systemMessage JSON`, { skip: runner.skip }, async () => {
    const install = makeInstall();
    try {
      const result = await withRemote("99.0.0", (url) => runner.run(install, url));
      assert.equal(result.code, 0, result.stderr);
      // BOM이나 다른 글자가 앞에 붙으면 Claude Code가 JSON으로 읽지 못한다
      assert.equal(result.stdout[0], 0x7b, `stdout must start with "{": ${JSON.stringify(result.stdout.toString("utf8"))}`);
      const output = JSON.parse(result.stdout.toString("utf8"));
      assert.deepEqual(Object.keys(output), ["systemMessage"]);
      assert.match(output.systemMessage, /새 버전 v99\.0\.0 사용 가능/);
      assert.match(output.systemMessage, new RegExp(`현재 v${repoVersion.replaceAll(".", "\\.")}`));
    } finally {
      fs.rmSync(install.dir, { recursive: true, force: true });
    }
  });

  test(`installed ${runner.name} prints nothing when up to date`, { skip: runner.skip }, async () => {
    const install = makeInstall();
    try {
      const result = await withRemote(repoVersion, (url) => runner.run(install, url));
      assert.equal(result.code, 0, result.stderr);
      assert.equal(result.stdout.toString("utf8"), "");
    } finally {
      fs.rmSync(install.dir, { recursive: true, force: true });
    }
  });
}

test("installed reconcile-conversations.ps1 joins the mnemo error notice into the same message", { skip: RUNNERS[0].skip }, async () => {
  const install = makeInstall();
  try {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    fs.mkdirSync(path.join(install.project, ".claude"));
    fs.writeFileSync(path.join(install.project, ".claude", "mnemo-errors.log"), `[${stamp}] [test] [ctx] boom\n`);
    const result = await withRemote("99.0.0", (url) => RUNNERS[0].run(install, url));
    const lines = JSON.parse(result.stdout.toString("utf8")).systemMessage.split("\n");
    assert.equal(lines.length, 2, result.stdout.toString("utf8"));
    assert.match(lines[0], /^\[skill-olympus\] 새 버전 v99\.0\.0/);
    assert.match(lines[1], /^\[mnemo\] 최근 24시간 내 mnemo 에러 1건/);
  } finally {
    fs.rmSync(install.dir, { recursive: true, force: true });
  }
});
