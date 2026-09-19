// Antigravity 앵커 조회 두 단 배선.
//
// Claude는 PostToolUse 하나로 끝난다 — 도구 인자를 받고 additionalContext로 주입한다.
// Antigravity는 그 둘이 다른 이벤트에 나뉘어 있다: PostToolUse는 toolCall.args를 받지만
// 출력이 빈 객체라 주입할 수 없고, PostInvocation은 injectSteps로 주입할 수 있지만
// 어떤 도구였는지 모른다. 그래서 앞단이 경로를 적고 뒷단이 읽어 넘긴다.
//
// 앞단은 새 프로세스를 띄우지 않는다 — 이미 편집 도구에만 걸려 도는 safety 훅에 얹는다.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const HOOK = path.join(__dirname, "..", "..", "hooks", "antigravity-hook.js");
const INDEX = ["# 앵커 역색인", "", "## hooks/save-turn.sh",
  "- [[054-x]] (architecture) ✅ CURRENT — 기록 경로 상대화",
  "- [[057-y]] (architecture) ✅ CURRENT — 훅 예산", "",
  "## hooks/other.sh", "- [[001-z]] (architecture) — 다른 것", ""].join("\n");

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agy-anchor-"));
  fs.mkdirSync(path.join(root, "memory"), { recursive: true });
  fs.writeFileSync(path.join(root, "memory", ".mnemo-anchor-index.md"), INDEX, "utf8");
  return root;
}

function run(operation, payload) {
  const out = execFileSync(process.execPath, [HOOK, operation], {
    input: JSON.stringify(payload), encoding: "utf8",
  });
  return JSON.parse(out || "{}");
}

function edit(root, file) {
  return run("safety", {
    workspacePaths: [root],
    conversationId: "c1",
    toolCall: { name: "replace_file_content", args: { TargetFile: file } },
  });
}

function invoke(root, conversationId = "c1") {
  return run("anchor", { workspacePaths: [root], conversationId, invocationNum: 1 });
}

test("편집이 경로를 적고 다음 호출이 결정을 주입한다", () => {
  const root = project();
  const decision = edit(root, "hooks/save-turn.sh");
  assert.strictEqual(decision.decision, "allow", "안전 판정이 바뀌면 안 된다");
  assert.ok(fs.existsSync(path.join(root, "memory", ".mnemo-anchor-pending")));

  const injected = invoke(root);
  assert.ok(Array.isArray(injected.injectSteps), "injectSteps가 없습니다");
  const message = injected.injectSteps[0].ephemeralMessage;
  assert.match(message, /054-x/);
  assert.match(message, /057-y/);
  assert.doesNotMatch(message, /001-z/, "다른 파일의 결정이 섞였습니다");
  // 앞단이 남긴 목록은 소비되어야 한다 — 같은 것을 매 호출 다시 내밀지 않는다.
  assert.ok(!fs.existsSync(path.join(root, "memory", ".mnemo-anchor-pending")));
});

test("같은 파일은 한 대화에서 한 번만 알린다", () => {
  const root = project();
  edit(root, "hooks/save-turn.sh");
  assert.ok(invoke(root).injectSteps);
  edit(root, "hooks/save-turn.sh");
  assert.deepStrictEqual(invoke(root), {}, "같은 파일을 반복 주입했습니다");
});

test("대화가 바뀌면 다시 알린다", () => {
  const root = project();
  edit(root, "hooks/save-turn.sh");
  assert.ok(invoke(root, "c1").injectSteps);
  edit(root, "hooks/save-turn.sh");
  assert.ok(invoke(root, "c2").injectSteps, "새 대화에서는 다시 알려야 합니다");
});

test("색인에 없는 파일은 조용하다", () => {
  const root = project();
  edit(root, "hooks/unknown.sh");
  assert.deepStrictEqual(invoke(root), {});
});

test("기억·대화·핸드오프 자신은 앵커가 아니다", () => {
  const root = project();
  edit(root, "memory/architecture/054-x.md");
  assert.ok(!fs.existsSync(path.join(root, "memory", ".mnemo-anchor-pending")));
  assert.deepStrictEqual(invoke(root), {});
});

test("색인이 없으면 아무것도 적지 않는다", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agy-noindex-"));
  fs.mkdirSync(path.join(root, "memory"), { recursive: true });
  const decision = edit(root, "hooks/save-turn.sh");
  assert.strictEqual(decision.decision, "allow");
  assert.ok(!fs.existsSync(path.join(root, "memory", ".mnemo-anchor-pending")));
});

test("보호 파일 판정은 앵커 기록보다 우선한다", () => {
  const root = project();
  const decision = edit(root, ".env");
  assert.strictEqual(decision.decision, "deny");
  assert.ok(!fs.existsSync(path.join(root, "memory", ".mnemo-anchor-pending")),
    "거부된 편집을 기록했습니다");
});

test("주입 단계는 실패해도 실행을 막지 않는다", () => {
  // pending이 디렉터리면 읽기가 실패한다 — 그래도 빈 객체여야 한다.
  const root = project();
  fs.mkdirSync(path.join(root, "memory", ".mnemo-anchor-pending"));
  assert.deepStrictEqual(invoke(root), {});
});

test("설치기가 PostInvocation에 앵커 훅을 등록한다", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "..", "install-hooks-config.js"), "utf8");
  assert.match(source, /group\.PostInvocation\s*=/, "PostInvocation 등록이 없습니다");
  assert.match(source, /anchor/, "anchor 모드를 가리키지 않습니다");
});
