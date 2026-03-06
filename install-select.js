#!/usr/bin/env node
// install-select.js
// Select target LLMs only (skills/agents/hooks/MCP are all core-installed)
// stdout: line1 = LLMs, line2 = Bundles (always all)
// UI is written to stderr (stdout is for results only)

const ALL_LLMS = ["claude", "codex", "gemini"];

// All bundles are core-installed (no selection needed)
const ALL_BUNDLES = [
  "zephermine",
  "agent-team",
  "mnemo",
  "orchestrator",
  "mcp",
];

const LLM_ITEMS = [
  { id: "all", desc: "All (Claude + Codex + Gemini)" },
  { id: "claude", desc: "Claude Code" },
  { id: "codex", desc: "Codex CLI" },
  { id: "gemini", desc: "Gemini CLI" },
];

// Ignore irrelevant flags passed through from install.bat/sh via %*
const IGNORE_FLAGS = ["--link", "--unlink", "--copy"];

// --- CLI Parsing ---
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
      // --only, --skip are parsed for backward compat but ignored
      case "--only":
      case "--skip":
        i++; // skip value
        break;
    }
  }

  if (isAll) return { llms: ALL_LLMS, bundles: ALL_BUNDLES };
  if (llms?.includes("all")) llms = [...ALL_LLMS];
  if (llms) return { llms, bundles: ALL_BUNDLES };
  return null; // interactive mode
}

// --- Interactive Menu ---
function selectMenu(title, items, allIds) {
  const write = (s) => process.stderr.write(s);

  // non-TTY: select all
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
      write("\x1b[?25l"); // hide cursor
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
      write("\x1b[2K  Up/Down Move  Space Toggle  a All  Enter Confirm\n");
    }

    function cleanup() {
      write(`\x1b[${totalLines}A`);
      for (let i = 0; i < totalLines; i++) write("\x1b[2K\n");
      write(`\x1b[${totalLines}A`);
      write("\x1b[?25h"); // show cursor
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
      // Enter: confirm
      if (key === "\r" || key === "\n") {
        const result = [...selected].filter((id) => id !== "all");
        if (result.length === 0) {
          render();
          return;
        } // at least 1 required
        cleanup();
        resolve(result);
        return;
      }
      // Space: toggle
      if (key === " ") toggleItem(items[cursor].id);
      // a/A: toggle all
      if (key === "a" || key === "A") toggleAll();
      // Up arrow
      if (key === "\x1b[A" || key === "\x1bOA")
        cursor = (cursor - 1 + items.length) % items.length;
      // Down arrow
      if (key === "\x1b[B" || key === "\x1bOB")
        cursor = (cursor + 1) % items.length;
      render();
    });
  });
}

// --- Main ---
async function main() {
  const parsed = parseArgs();

  if (parsed) {
    console.log(parsed.llms.join(","));
    console.log(parsed.bundles.join(","));
    return;
  }

  // Interactive mode: LLM selection only (bundles are all core-installed)
  const llms = await selectMenu(
    "Select target AI CLI",
    LLM_ITEMS,
    ALL_LLMS
  );
  if (!llms || llms.length === 0) process.exit(0);

  console.log(llms.join(","));
  console.log(ALL_BUNDLES.join(","));
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
