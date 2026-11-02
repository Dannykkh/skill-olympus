// 아프로디테의 한글 줄바꿈 검사기(skills/design-plan/scripts/wrapcheck.mjs) 회귀 테스트.
// 크롬 계열 브라우저가 없는 환경에서는 실행 검사를 건너뛴다(끝 코드 2 + 안내 문구).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { execFile } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const scriptsDir = path.join(repoRoot, "skills", "design-plan", "scripts");
const checker = path.join(scriptsDir, "wrapcheck.mjs");
const fixture = (name) => path.join(scriptsDir, "fixtures", "wrapcheck", name);

// 서버를 같은 프로세스에서 띄우므로 동기 실행(spawnSync)을 쓰면 서버가 멈춘다. 비동기로 돌린다.
function runChecker(args, timeoutMs = 90000) {
  return new Promise((resolve) => {
    execFile(process.execPath, [checker, ...args], { timeout: timeoutMs, encoding: "utf8" }, (error, stdout, stderr) => {
      resolve({ code: error ? (typeof error.code === "number" ? error.code : -1) : 0, killed: Boolean(error && error.killed), stdout, stderr });
    });
  });
}

function skipWithoutBrowser(t, result) {
  if (result.code === 2 && /브라우저를 못 찾았다|Node 22/.test(result.stderr)) {
    t.skip("크롬 계열 브라우저 또는 Node 22가 없어 실측을 건너뜀");
    return true;
  }
  return false;
}

test("vendored checker keeps the upstream MIT notice and its documented changes", () => {
  const source = fs.readFileSync(checker, "utf8");
  const license = fs.readFileSync(path.join(scriptsDir, "LICENSE-hangul-wrap.txt"), "utf8");
  assert.match(license, /^MIT License/);
  assert.match(license, /Copyright \(c\) 2026 Giting \(hanmariyang\)/);
  assert.match(source, /hangul-wrap v0\.2\.2/);
  assert.match(source, /LICENSE-hangul-wrap\.txt/);
  const skill = fs.readFileSync(path.join(repoRoot, "skills", "design-plan", "SKILL.md"), "utf8");
  assert.match(skill, /references\/korean-line-break\.md/);
  assert.match(skill, /scripts\/wrapcheck\.mjs/);
});

test("checker flags split words on the unfixed fixture and passes the fixed one", async (t) => {
  const before = await runChecker([fixture("before.html"), "390", "--json"]);
  if (skipWithoutBrowser(t, before)) return;
  assert.equal(before.code, 1, before.stderr);
  assert.ok(JSON.parse(before.stdout).summary.split > 0);

  const after = await runChecker([fixture("after.html"), "390", "--json"]);
  assert.equal(after.code, 0, after.stderr);
  const summary = JSON.parse(after.stdout).summary;
  assert.equal(summary.split, 0);
  assert.equal(summary.overflow, 0);
});

test("checker does not hang when a web font never finishes loading", async (t) => {
  // load 이벤트 뒤에 응답 없는 폰트를 document.fonts 에 넣어 fonts.ready 가 끝나지 않게 만든다 (gotcha 056).
  const page = `<!doctype html><html lang="ko"><head><meta charset="utf-8"></head>
<body style="font:17px/1.6 sans-serif;word-break:keep-all"><p>한 번 연결하면 지난 기록까지 자동으로 모아 드립니다.</p>
<script>addEventListener('load',()=>{const f=new FontFace('Hang','url(/never.woff2)');document.fonts.add(f);f.load().catch(()=>{});});</script></body></html>`;
  const pending = [];
  const server = http.createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(page);
    } else {
      pending.push(res); // 응답하지 않는다
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    for (const res of pending) res.destroy();
    server.close();
  });
  const url = `http://127.0.0.1:${server.address().port}/`;

  const started = Date.now();
  const result = await runChecker([url, "390", "--wait", "200", "--font-timeout", "500", "--json"], 60000);
  if (skipWithoutBrowser(t, result)) return;
  assert.equal(result.killed, false, "checker was killed by the test timeout");
  assert.equal(result.code, 0, result.stderr);
  assert.ok(Date.now() - started < 30000, `took ${Date.now() - started}ms`);
});
