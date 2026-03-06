#!/usr/bin/env node
// install-select.js
// LLM 대상만 선택 (스킬/에이전트/훅/MCP는 전부 코어 설치)
// stdout: line1 = LLMs, line2 = Bundles (항상 전체)
// UI는 stderr로 출력 (stdout은 결과 전용)

const ALL_LLMS = ["claude", "codex", "gemini"];

// 모든 번들은 코어 설치 (선택 불필요)
const ALL_BUNDLES = [
  "zephermine",
  "agent-team",
  "mnemo",
  "orchestrator",
  "mcp",
];

const LLM_ITEMS = [
  { id: "all", desc: "전체 (Claude + Codex + Gemini)" },
  { id: "claude", desc: "Claude Code" },
  { id: "codex", desc: "Codex CLI" },
  { id: "gemini", desc: "Gemini CLI" },
];

// install.bat/sh가 %*로 전달하므로 무관한 플래그 무시
const IGNORE_FLAGS = ["--link", "--unlink", "--copy"];

// --- CLI 파싱 ---
function parseArgs() {
  const raw = process.argv.slice(2);
  const args = raw.filter((a) => !IGNORE_FLAGS.includes(a));

  let llms = null;
  let isAll = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--all":
        isAll = true;
        break;
      case "--llm":
        llms = args[++i]
          ?.split(",")
          .map((s) => s.trim().toLowerCase());
        break;
      // --only, --skip은 하위 호환용으로 파싱하되 무시
      case "--only":
      case "--skip":
        i++; // 값 건너뜀
        break;
    }
  }

  if (isAll) return { llms: ALL_LLMS, bundles: ALL_BUNDLES };
  if (llms?.includes("all")) llms = [...ALL_LLMS];
  if (llms) return { llms, bundles: ALL_BUNDLES };
  return null; // 인터랙티브 모드
}

// --- 인터랙티브 메뉴 ---
function selectMenu(title, items, allIds) {
  const write = (s) => process.stderr.write(s);

  // non-TTY: 전체 선택
  if (!process.stdin.isTTY) {
    return Promise.resolve([...allIds]);
  }

  return new Promise((resolve) => {
    let cursor = 0;
    const selected = new Set();
    let firstRender = true;
    const totalLines = items.length + 6;

    function render() {
      if (!firstRender) write(`\x1b[${totalLines}A`);
      firstRender = false;
      write("\x1b[?25l"); // 커서 숨김
      write("\x1b[2K\n");
      write(`\x1b[2K  ${title}\n`);
      write(`\x1b[2K  ${"─".repeat(44)}\n`);
      write("\x1b[2K\n");
      for (let i = 0; i < items.length; i++) {
        const arrow = i === cursor ? ">" : " ";
        const check = selected.has(items[i].id) ? "*" : " ";
        const id = items[i].id.padEnd(14);
        write(`\x1b[2K  ${arrow} [${check}] ${id} ${items[i].desc}\n`);
      }
      write("\x1b[2K\n");
      write("\x1b[2K  ↑↓ 이동  Space 토글  a 전체  Enter 확인\n");
    }

    function cleanup() {
      write(`\x1b[${totalLines}A`);
      for (let i = 0; i < totalLines; i++) write("\x1b[2K\n");
      write(`\x1b[${totalLines}A`);
      write("\x1b[?25h"); // 커서 표시
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners("data");
    }

    function toggleAll() {
      if (selected.has("all")) {
        selected.clear();
      } else {
        selected.clear();
        selected.add("all");
        allIds.forEach((id) => selected.add(id));
      }
    }

    function toggleItem(id) {
      if (id === "all") {
        toggleAll();
        return;
      }
      if (selected.has(id)) {
        selected.delete(id);
        selected.delete("all");
      } else {
        selected.add(id);
        if (allIds.every((aid) => selected.has(aid))) selected.add("all");
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    render();

    process.stdin.on("data", (key) => {
      // Ctrl+C
      if (key === "\x03") {
        cleanup();
        process.exit(0);
      }
      // Enter: 확인
      if (key === "\r" || key === "\n") {
        const result = [...selected].filter((id) => id !== "all");
        if (result.length === 0) {
          render();
          return;
        } // 최소 1개 필수
        cleanup();
        resolve(result);
        return;
      }
      // Space: 토글
      if (key === " ") toggleItem(items[cursor].id);
      // a/A: 전체 토글
      if (key === "a" || key === "A") toggleAll();
      // 위 화살표
      if (key === "\x1b[A" || key === "\x1bOA")
        cursor = (cursor - 1 + items.length) % items.length;
      // 아래 화살표
      if (key === "\x1b[B" || key === "\x1bOB")
        cursor = (cursor + 1) % items.length;
      render();
    });
  });
}

// --- 메인 ---
async function main() {
  const parsed = parseArgs();

  if (parsed) {
    console.log(parsed.llms.join(","));
    console.log(parsed.bundles.join(","));
    return;
  }

  // 인터랙티브 모드: LLM 선택만 (번들은 전부 코어 설치)
  const llms = await selectMenu(
    "대상 AI CLI를 선택하세요",
    LLM_ITEMS,
    ALL_LLMS
  );
  if (!llms || llms.length === 0) process.exit(0);

  console.log(llms.join(","));
  console.log(ALL_BUNDLES.join(","));
}

main().catch((err) => {
  process.stderr.write(`오류: ${err.message}\n`);
  process.exit(1);
});
