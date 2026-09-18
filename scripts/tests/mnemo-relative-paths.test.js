const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repo = path.resolve(__dirname, "..", "..");
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";

// 도구 관찰 훅은 file_path 같은 경로 필드를 프로젝트 루트 기준 상대경로로 기록한다.
// 절대경로를 그대로 남기면 프로젝트를 옮기거나 다른 컴퓨터에서 열었을 때 기록이 옛 위치를
// 가리킨다. 루트 밖 경로(다른 곳을 건드렸다는 사실 자체가 정보)는 절대경로로 남긴다.
// 자동 루트 판별기는 임시 폴더를 거부하므로 shipped 블록만 잘라 실행한다.
function block(file) {
  const text = fs.readFileSync(path.join(repo, file), "utf8");
  const body = text.split("# MNEMO_RELPATH_START")[1]?.split("# MNEMO_RELPATH_END")[0];
  assert.ok(body, `${file}에서 MNEMO_RELPATH 블록을 찾지 못했습니다`);
  return body;
}

const CASES = [
  // [루트, tool_input, 기대 결과]
  ["D:\\proj\\app", { file_path: "D:\\proj\\app\\src\\a.ts", command: "cat D:\\proj\\app\\x" },
    { file_path: "src/a.ts", command: "cat D:\\proj\\app\\x" }],
  ["D:\\proj\\app", { file_path: "d:/proj/app/src/a.ts" }, { file_path: "src/a.ts" }],
  ["D:/proj/app/", { file_path: "D:\\proj\\app\\src\\a.ts" }, { file_path: "src/a.ts" }],
  ["D:\\proj\\app", { file_path: "C:\\Users\\me\\.claude\\settings.json" },
    { file_path: "C:\\Users\\me\\.claude\\settings.json" }],
  ["D:\\proj\\app", { file_path: "D:\\proj\\app2\\x" }, { file_path: "D:\\proj\\app2\\x" }],
  ["D:\\proj\\app", { file_path: "D:\\proj\\app" }, { file_path: "." }],
  ["/home/u/app", { notebook_path: "/home/u/app/nb.ipynb", path: "/home/u/App/x" },
    { notebook_path: "nb.ipynb", path: "/home/u/App/x" }],
  ["/home/u/app", { file_path: 7 }, { file_path: 7 }],
];

test("bash: 경로 필드만 루트 기준 상대경로로 바꾼다", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mnemo-relpath-"));
  try {
    const script = path.join(dir, "relpath.sh");
    // 루트는 인수가 아니라 stdin JSON으로 넘긴다. Windows의 Git Bash는 /home/u/app 같은 인수를
    // MSYS 경로 변환으로 C:/Program Files/Git/home/... 으로 바꿔 버린다. 실제 훅은 Windows에서
    // D:\... 형태의 루트만 --arg 로 넘기므로 변환 대상이 아니다.
    fs.writeFileSync(script, block("hooks/save-tool-use.sh") +
      '\nINPUT=$(cat)\nprintf \'%s\' "$INPUT" | jq -c "$(mnemo_relpath_defs)"\' .root as $root | (.tool_input // {}) | mnemo_relativize($root)\'\n');
    const run = (root, tool_input) => spawnSync(bash, [script],
      { input: JSON.stringify({ root, tool_input }), encoding: "utf8" });
    for (const [root, input, expected] of CASES) {
      const result = run(root, input);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), expected, `root=${root} input=${JSON.stringify(input)}`);
    }
    const missing = run("/home/u/app", undefined);
    assert.deepEqual(JSON.parse(missing.stdout), {});
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("pwsh: 경로 필드만 루트 기준 상대경로로 바꾼다", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mnemo-relpath-"));
  try {
    const script = path.join(dir, "relpath.ps1");
    fs.writeFileSync(script, "param([string]$Root)\n" + block("hooks/save-tool-use.ps1") +
      "\n$json = [Console]::In.ReadToEnd() | ConvertFrom-Json\n" +
      "$out = ConvertTo-MnemoRelativeInput -ToolInput $json.tool_input -Root $Root\n" +
      "if ($null -eq $out) { 'null' } else { $out | ConvertTo-Json -Compress }\n");
    for (const [root, input, expected] of CASES) {
      const run = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", script, root],
        { input: JSON.stringify({ tool_input: input }), encoding: "utf8" });
      assert.equal(run.status, 0, run.stderr);
      assert.deepEqual(JSON.parse(run.stdout), expected, `root=${root} input=${JSON.stringify(input)}`);
    }
    const missing = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", script, "/home/u/app"], { input: "{}", encoding: "utf8" });
    assert.equal(JSON.parse(missing.stdout), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("훅은 상대화한 사본으로 toollog와 관찰 로그를 쓴다", () => {
  const sh = fs.readFileSync(path.join(repo, "hooks/save-tool-use.sh"), "utf8");
  assert.match(sh, /TOOL_INPUT_JSON=\$\(echo "\$INPUT" \| jq -c --arg root "\$PROJECT_ROOT"/,
    "save-tool-use.sh가 루트 확정 직후 tool_input을 상대화하지 않습니다");
  assert.ok(!sh.includes("jq -r '.tool_input."), "toollog 상세가 원본 tool_input(절대경로)을 읽습니다");
  assert.match(sh, /TOOL_INPUT_STR=\$\(printf '%s' "\$TOOL_INPUT_JSON"/, "관찰 로그 input이 상대화 사본을 쓰지 않습니다");
  const ps = fs.readFileSync(path.join(repo, "hooks/save-tool-use.ps1"), "utf8");
  assert.match(ps, /\$toolInput = ConvertTo-MnemoRelativeInput -ToolInput \$toolInput -Root \$ProjectRoot/,
    "save-tool-use.ps1가 루트 확정 직후 tool_input을 상대화하지 않습니다");
  const handoff = fs.readFileSync(path.join(repo, "skills/mnemo/scripts/create_handoff.py"), "utf8");
  assert.ok(handoff.includes("- Project: {project_root.name}") && !handoff.includes("- Project: {project_path}"),
    "핸드오프 Project: 헤더가 절대경로로 되돌아갔습니다");
});
