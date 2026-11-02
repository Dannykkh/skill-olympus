// 업데이트 확인(scripts/update-check.ps1·.sh)이 원격 VERSION이 로컬보다 높을 때만 안내하는지 본다 (gotcha 126).
// 원격은 같은 프로세스의 HTTP 서버로 흉내 낸다. 그래서 스크립트는 비동기(execFile)로 돌린다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const http = require("node:http");
const path = require("node:path");
const { execFile, spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const WIN = process.platform === "win32";

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

function findPowerShell() {
  // install.bat·세션 시작 훅은 Windows PowerShell(powershell)로 부른다. 다른 OS는 pwsh가 있을 때만.
  const name = WIN ? "powershell" : "pwsh";
  return spawnSync(name, ["-NoProfile", "-Command", "exit 0"], { stdio: "ignore" }).status === 0 ? name : null;
}

// Git Bash에는 C:\ 경로 대신 /c/ 경로를 준다.
function shellPath(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  const drive = normalized.match(/^([A-Za-z]):\/(.*)$/);
  return drive ? `/${drive[1].toLowerCase()}/${drive[2]}` : normalized;
}

const bash = findBash();
const powershell = findPowerShell();
const RUNNERS = [
  {
    name: "update-check.ps1",
    skip: powershell ? false : "PowerShell 없음",
    command: powershell,
    args: () => ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(repoRoot, "scripts", "update-check.ps1")],
    toPath: (p) => p,
  },
  {
    name: "update-check.sh",
    skip: bash ? false : "bash 없음",
    command: bash,
    args: () => [shellPath(path.join(repoRoot, "scripts", "update-check.sh"))],
    toPath: (p) => (WIN ? shellPath(p) : p),
  },
];

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

function makeRepo(local, cache) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "olympus-update-check-"));
  const repo = path.join(dir, "repo");
  const state = path.join(dir, "state");
  fs.mkdirSync(repo);
  fs.mkdirSync(state);
  fs.writeFileSync(path.join(repo, "VERSION"), `${local}\n`);
  if (cache) fs.writeFileSync(path.join(state, "last-update-check"), cache);
  return { dir, repo, state };
}

function run(runner, repo, state, url) {
  const env = {
    ...process.env,
    OLYMPUS_DIR: runner.toPath(repo),
    OLYMPUS_STATE_DIR: runner.toPath(state),
    OLYMPUS_REMOTE_URL: url,
  };
  delete env.OLYMPUS_UPDATE_CHECK_DISABLE;
  return new Promise((resolve) => {
    execFile(runner.command, runner.args(), { env, encoding: "utf8", timeout: 60000 }, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout: stdout.trim(), stderr });
    });
  });
}

const readCache = (state) => fs.readFileSync(path.join(state, "last-update-check"), "utf8").trim();

for (const runner of RUNNERS) {
  test(`${runner.name} announces a remote version that is numerically higher`, { skip: runner.skip }, async () => {
    // 7.10.0은 글자 순서로는 7.6.0보다 작다. 숫자로 비교해야 업그레이드로 잡힌다.
    const { dir, repo, state } = makeRepo("7.6.0");
    try {
      const result = await withRemote("7.10.0", (url) => run(runner, repo, state, url));
      assert.equal(result.stdout, "UPGRADE_AVAILABLE 7.6.0 7.10.0", result.stderr);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`${runner.name} stays quiet when the remote is older than local`, { skip: runner.skip }, async () => {
    // 릴리즈를 푸시한 직후 원격 파일 캐시가 옛 VERSION을 주는 경우다 (gotcha 126).
    const { dir, repo, state } = makeRepo("7.6.0");
    try {
      const result = await withRemote("7.5.6", (url) => run(runner, repo, state, url));
      assert.equal(result.stdout, "", result.stderr);
      assert.equal(readCache(state), "UP_TO_DATE 7.6.0");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`${runner.name} ignores a cached notice that points to an older version`, { skip: runner.skip }, async () => {
    // 고치기 전 코드가 남긴 캐시는 12시간 동안 다시 읽힌다. 그 안내를 그대로 내보내지 않는다.
    const { dir, repo, state } = makeRepo("7.6.0", "UPGRADE_AVAILABLE 7.6.0 7.5.6");
    try {
      const result = await withRemote("7.6.0", (url) => run(runner, repo, state, url));
      assert.equal(result.stdout, "", result.stderr);
      assert.equal(readCache(state), "UP_TO_DATE 7.6.0");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`${runner.name} stays quiet when versions are equal`, { skip: runner.skip }, async () => {
    const { dir, repo, state } = makeRepo("7.6.0");
    try {
      const result = await withRemote("7.6.0", (url) => run(runner, repo, state, url));
      assert.equal(result.stdout, "", result.stderr);
      assert.equal(readCache(state), "UP_TO_DATE 7.6.0");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}
