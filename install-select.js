#!/usr/bin/env node
// install-select.js
// 2단계 컴포넌트 선택: LLM 대상 → 기능 번들
// stdout: line1 = LLMs, line2 = Bundles (comma-separated)
// UI는 stderr로 출력 (stdout은 결과 전용)

const ALL_LLMS = ["claude", "codex", "gemini"];
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

const BUNDLE_ITEMS = [
  { id: "all", desc: "전체 기능" },
  { id: "zephermine", desc: "설계 워크플로우" },
  { id: "agent-team", desc: "병렬 실행 (Agent Teams)" },
  { id: "mnemo", desc: "장기기억" },
  { id: "orchestrator", desc: "PM-Worker 병렬 작업" },
  { id: "mcp", desc: "무료 MCP 서버" },
];

// install.bat/sh가 %*로 전달하므로 무관한 플래그 무시
const IGNORE_FLAGS = ["--link", "--unlink", "--copy"];

// --- CLI 파싱 ---
function parseArgs() {
  const raw = process.argv.slice(2);
  const args = raw.filter((a) => !IGNORE_FLAGS.includes(a));

  let llms = null;
  let bundles = null;
  let skipBundles = null;
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
      case "--only":
        bundles = args[++i]
          ?.split(",")
          .map((s) => s.trim().toLowerCase());
        break;
      case "--skip":
        skipBundles = args[++i]
          ?.split(",")
          .map((s) => s.trim().toLowerCase());
        break;
    }
  }

  if (isAll) return { llms: ALL_LLMS, bundles: ALL_BUNDLES };
  if (llms?.includes("all")) llms = [...ALL_LLMS];
  if (bundles?.includes("all")) bundles = [...ALL_BUNDLES];
  if (skipBundles) bundles = ALL_BUNDLES.filter((b) => !skipBundles.includes(b));

  if (llms || bundles) {
    return { llms: llms || ALL_LLMS, bundles: bundles || ALL_BUNDLES };
  }
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
      write("\x1b[2K  \u2191\u2193 \uc774\ub3d9  Space \ud1a0\uae00  a \uc804\uccb4  Enter \ud655\uc778\n");
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

  // 인터랙티브 모드: 2단계 순차 선택
  const llms = await selectMenu(
    "대상 AI CLI를 선택하세요",
    LLM_ITEMS,
    ALL_LLMS
  );
  if (!llms || llms.length === 0) process.exit(0);

  const bundles = await selectMenu(
    "설치할 컴포넌트를 선택하세요",
    BUNDLE_ITEMS,
    ALL_BUNDLES
  );
  if (!bundles || bundles.length === 0) process.exit(0);

  console.log(llms.join(","));
  console.log(bundles.join(","));
}

main().catch((err) => {
  process.stderr.write(`오류: ${err.message}\n`);
  process.exit(1);
});
