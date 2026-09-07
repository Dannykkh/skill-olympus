const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync, spawn } = require("node:child_process");
const { appendEvent } = require("../../skills/grok-mnemo/hooks/append-event");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "olympus-grok-events-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const user = (extra = {}) => ({ hookEventName: "user_prompt_submit", sessionId: "session-one", prompt: "same prompt", ...extra });
const stop = (extra = {}) => ({ hookEventName: "stop", reason: "end_turn", sessionId: "session-one", lastAssistantMessage: "same response", ...extra });
const at = (day) => new Date(2026, 8, day, 12);

test("Grok stable IDs deduplicate delayed whole-turn replays across dates", async (t) => {
  const root = fixture(t);
  for (const payload of [user({ turnId: "turn-1" }), stop({ turnId: "turn-1" })]) assert.equal(await appendEvent(root, payload, at(7)), true);
  for (const payload of [user({ turnId: "turn-1" }), stop({ turnId: "turn-1" })]) assert.equal(await appendEvent(root, payload, at(8)), false);
  assert.equal(fs.existsSync(path.join(root, "conversations/2026-09-08-grok.md")), false);
});

test("Grok fallback deduplicates consecutive delivery but preserves identical new turns", async (t) => {
  const root = fixture(t);
  assert.equal(await appendEvent(root, user(), at(7)), true);
  assert.equal(await appendEvent(root, user(), at(8)), false);
  assert.equal(await appendEvent(root, stop(), at(7)), true);
  assert.equal(await appendEvent(root, stop(), at(8)), false);
  assert.equal(await appendEvent(root, user(), at(8)), true);
  assert.equal(await appendEvent(root, stop(), at(8)), true);
});

test("Grok distinct IDs and sessions preserve repeated text, including mixed ID payloads", async (t) => {
  const root = fixture(t);
  assert.equal(await appendEvent(root, user({ eventId: "a" })), true);
  assert.equal(await appendEvent(root, stop()), true);
  assert.equal(await appendEvent(root, user({ eventId: "b" })), true);
  assert.equal(await appendEvent(root, stop()), true);
  assert.equal(await appendEvent(root, user({ eventId: "a", sessionId: "another-session" })), true);
});

test("Grok concurrent duplicate delivery writes exactly one conversation entry", async (t) => {
  const root = fixture(t);
  const helper = path.resolve(__dirname, "../../skills/grok-mnemo/hooks/append-event.js");
  const results = await Promise.all(Array.from({ length: 12 }, () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [helper, root], { env: { ...process.env, MNEMO_DISABLE: "0" }, windowsHide: true });
    let output = "", error = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output) : reject(new Error(error)));
    child.stdin.end(JSON.stringify(user({ eventId: "concurrent" })));
  })));
  assert.equal(results.filter((result) => result === "saved").length, 1);
  const file = fs.readdirSync(path.join(root, "conversations")).find((name) => name.endsWith("-grok.md"));
  assert.equal((fs.readFileSync(path.join(root, "conversations", file), "utf8").match(/## \[.*\] User/g) || []).length, 1);
  assert.equal(fs.existsSync(path.join(root, "conversations/.grok-events.lock")), false);
});

test("Grok private text stays out of both conversation and identity index; shutdown is ignored", async (t) => {
  const root = fixture(t);
  assert.equal(await appendEvent(root, stop({ reason: "channel_closed" })), false);
  assert.equal(await appendEvent(root, user({ prompt: "<user_query>hello <private>secret-value</private></user_query>" }), at(7)), true);
  for (const name of fs.readdirSync(path.join(root, "conversations"))) assert.doesNotMatch(fs.readFileSync(path.join(root, "conversations", name), "utf8"), /secret-value|user_query/);
  assert.match(fs.readFileSync(path.join(root, "conversations/2026-09-07-grok.md"), "utf8"), /hello \[PRIVATE\]/);
});

test("Grok recovers a lock left by a terminated process", async (t) => {
  const root = fixture(t);
  const child = spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" });
  assert.equal(child.status, 0);
  fs.mkdirSync(path.join(root, "conversations"));
  fs.writeFileSync(path.join(root, "conversations/.grok-events.lock"), child.stdout);
  assert.equal(await appendEvent(root, user()), true);
});

test("Grok installer deploys and validates the shared event helper", (t) => {
  const root = fixture(t);
  const grok = path.join(root, ".grok");
  fs.mkdirSync(grok);
  const installer = path.resolve(__dirname, "../../skills/grok-mnemo/install.js");
  const env = { ...process.env, GROK_HOME: grok, HOME: root, USERPROFILE: root };
  const run = (...args) => spawnSync(process.execPath, [installer, ...args], { env, encoding: "utf8" });
  assert.equal(run().status, 0);
  assert.equal(run("--check").status, 0);
  const helper = path.join(grok, "hooks/grok-mnemo-append-event.js");
  fs.appendFileSync(helper, "\n// stale fixture\n");
  assert.notEqual(run("--check").status, 0);
  assert.equal(run("--uninstall").status, 0);
  assert.equal(fs.existsSync(helper), false);
});

test("Grok event helper accepts PowerShell UTF-8 BOMs without corrupting Korean text", (t) => {
  const root = fixture(t);
  const helper = path.resolve(__dirname, "../../skills/grok-mnemo/hooks/append-event.js");
  const payload = user({ prompt: "한글 질문 <private>비밀</private>" });
  const result = spawnSync(process.execPath, [helper, root], {
    input: "\uFEFF\uFEFF" + JSON.stringify(payload), encoding: "utf8", env: { ...process.env, MNEMO_DISABLE: "0" },
  });
  assert.equal(result.status, 0, result.stderr);
  const file = fs.readdirSync(path.join(root, "conversations")).find((name) => name.endsWith("-grok.md"));
  const saved = fs.readFileSync(path.join(root, "conversations", file), "utf8");
  assert.match(saved, /한글 질문 \[PRIVATE\]/);
  assert.doesNotMatch(saved, /비밀/);
});

const bash = process.env.BASH_PATH || (process.platform === "win32" ? path.join(process.env.ProgramFiles || "C:/Program Files", "Git/bin/bash.exe") : "/bin/bash");
test("Grok Bash adapter saves Unicode, deduplicates replay, and keeps Stop stdout empty", { skip: !fs.existsSync(bash) }, (t) => {
  const root = fixture(t);
  assert.equal(spawnSync("git", ["init", "--quiet", root]).status, 0);
  const script = path.resolve(__dirname, "../../skills/grok-mnemo/hooks/save-turn.sh").replaceAll("\\", "/");
  const invoke = (payload, disabled = false) => {
    const result = spawnSync(bash, [script], {
      cwd: root, input: JSON.stringify({ cwd: root, workspaceRoot: root, ...payload }), encoding: "utf8", timeout: 30000,
      env: { ...process.env, MNEMO_STRICT: "1", MNEMO_DISABLE: disabled ? "1" : "0" },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  };
  const payloads = [user({ prompt: "한국어 질문 <private>비밀</private>", turnId: "bash-turn" }), stop({ lastAssistantMessage: "한국어 응답입니다", turnId: "bash-turn" })];
  for (const payload of payloads) invoke(payload);
  const file = fs.readdirSync(path.join(root, "conversations")).find((name) => name.endsWith("-grok.md"));
  const saved = fs.readFileSync(path.join(root, "conversations", file), "utf8");
  assert.match(saved, /한국어 질문 \[PRIVATE\]/);
  assert.match(saved, /한국어 응답입니다/);
  for (const payload of payloads) invoke(payload);
  invoke(user({ prompt: "must not save", turnId: "disabled" }), true);
  assert.equal(fs.readFileSync(path.join(root, "conversations", file), "utf8"), saved);
});
