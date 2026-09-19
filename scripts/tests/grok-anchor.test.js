// Grok 앵커 조회 — Claude 훅을 그대로 타되 저장은 하지 않는다.
//
// Grok은 ~/.claude/settings.json의 훅 5종을 직접 로드하고 post_tool_use도 포함한다
// (learned/018 실측). 봉투가 camelCase라 저장 경로가 오동작하므로 GROK_HOOK_EVENT 가드가
// 있었는데, 그 가드가 앵커 조회까지 함께 껐다. 출력 스키마는 Claude와 같으므로
// (~/.grok/docs/user-guide/10-hooks.md "PostToolUse Output") 조회만 통과시킨다.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO = path.join(__dirname, "..", "..");
const SH = path.join(REPO, "hooks", "save-tool-use.sh");
const PS1 = path.join(REPO, "hooks", "save-tool-use.ps1");
const INDEX = ["# anchor", "", "## hooks/save-turn.sh",
  "- [[054-x]] (architecture) ✅ CURRENT — 기록 경로 상대화", "",
  "## hooks/other.sh", "- [[001-z]] (architecture) — 다른 것", ""].join("\n");

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "grok-anchor-"));
  fs.mkdirSync(path.join(root, "memory"), { recursive: true });
  fs.writeFileSync(path.join(root, "memory", ".mnemo-anchor-index.md"), INDEX, "utf8");
  return root;
}

function hasBash() {
  try { execFileSync("bash", ["--version"], { stdio: "ignore" }); return true; } catch { return false; }
}

function runSh(root, { session = "g1", file = "hooks/save-turn.sh", event = "post_tool_use" } = {}) {
  const payload = JSON.stringify({
    hookEventName: event, hook_event_name: "PostToolUse", sessionId: session,
    workspaceRoot: root, toolName: "str_replace_editor", toolInput: { file_path: file },
  });
  return execFileSync("bash", [SH], {
    input: payload, encoding: "utf8",
    env: { ...process.env, GROK_HOOK_EVENT: event },
  }).trim();
}

const skip = !hasBash();

test("Grok post_tool_use는 그 파일에 기대는 결정을 주입한다", { skip }, () => {
  const root = project();
  const out = JSON.parse(runSh(root));
  assert.strictEqual(out.hookSpecificOutput.hookEventName, "PostToolUse");
  assert.match(out.hookSpecificOutput.additionalContext, /054-x/);
  assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /001-z/);
});

test("같은 파일은 한 세션에서 한 번만", { skip }, () => {
  const root = project();
  assert.ok(runSh(root).length > 0);
  assert.strictEqual(runSh(root), "", "같은 파일을 반복 주입했습니다");
});

test("세션이 바뀌면 다시 알린다", { skip }, () => {
  const root = project();
  assert.ok(runSh(root, { session: "g1" }).length > 0);
  assert.ok(runSh(root, { session: "g2" }).length > 0);
});

test("색인에 없는 파일은 조용하다", { skip }, () => {
  assert.strictEqual(runSh(project(), { file: "hooks/unknown.sh" }), "");
});

test("Grok에서는 대화·관찰을 저장하지 않는다 (grok-mnemo가 전담)", { skip }, () => {
  const root = project();
  runSh(root);
  assert.ok(!fs.existsSync(path.join(root, "conversations")), "Grok 경로에서 대화 로그를 만들었습니다");
  assert.ok(!fs.existsSync(path.join(root, "memory", "gotchas", "observations.jsonl")));
});

test("post_tool_use가 아닌 Grok 이벤트는 즉시 끝난다", { skip }, () => {
  const root = project();
  const out = execFileSync("bash", [SH], {
    input: JSON.stringify({ hookEventName: "stop", workspaceRoot: root }),
    encoding: "utf8", env: { ...process.env, GROK_HOOK_EVENT: "stop" },
  });
  assert.strictEqual(out.trim(), "");
});

test("색인이 없으면 아무 일도 하지 않는다", { skip }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "grok-noindex-"));
  fs.mkdirSync(path.join(root, "memory"), { recursive: true });
  assert.strictEqual(runSh(root), "");
  assert.ok(!fs.existsSync(path.join(root, "memory", ".mnemo-anchor-seen")));
});

test("두 훅 모두 post_tool_use만 통과시킨다", () => {
  for (const file of [SH, PS1]) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /GROK_HOOK_EVENT/, `${path.basename(file)}: Grok 가드가 없습니다`);
    assert.match(source, /post_tool_use/,
      `${path.basename(file)}: post_tool_use 예외가 없습니다 — 가드가 조회까지 끕니다`);
  }
});
