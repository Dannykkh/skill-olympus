#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const cp = require("child_process");
const EMPTY_SUMMARY = {
  warnings: 0,
  errors: 0,
  touchedFiles: [],
  newFiles: [],
  messages: [],
};
function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}
function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function extractText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => extractText(item))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    return extractText(value.text ?? value.content ?? "");
  }
  return String(value);
}
function normalizePathSafe(targetPath) {
  if (!targetPath) return "";
  try {
    return path
      .resolve(targetPath)
      .replace(/[\\/]+$/, "")
      .toLowerCase();
  } catch {
    return String(targetPath)
      .replace(/[\\/]+$/, "")
      .toLowerCase();
  }
}
function toAbsolutePath(baseDir, targetPath) {
  if (!targetPath) return "";
  try {
    return path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(baseDir, targetPath);
  } catch {
    return targetPath;
  }
}
function relativePath(baseDir, targetPath) {
  try {
    const rel = path.relative(baseDir, targetPath);
    return rel && !rel.startsWith("..") ? rel.replace(/\\/g, "/") : targetPath;
  } catch {
    return targetPath;
  }
}

function selectSessionFile(preferredCwd) {
  const sessionRoot = path.join(os.homedir(), ".codex", "sessions");
  if (!fs.existsSync(sessionRoot)) return "";

  const files = [];
  const stack = [sessionRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        try {
          const stat = fs.statSync(fullPath);
          files.push({ fullPath, mtimeMs: stat.mtimeMs });
        } catch {}
      }
    }
  }

  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const recentFiles = files.slice(0, 20);
  if (recentFiles.length === 0) return "";

  const preferred = normalizePathSafe(preferredCwd);
  if (!preferred) return recentFiles[0].fullPath;

  for (const file of recentFiles) {
    try {
      const head = fs.readFileSync(file.fullPath, "utf8").split(/\r?\n/, 3);
      for (const line of head) {
        const parsed = parseJsonSafe(line);
        if (
          parsed &&
          parsed.type === "session_meta" &&
          normalizePathSafe(parsed.payload?.cwd) === preferred
        ) {
          return file.fullPath;
        }
      }
    } catch {}
  }

  return recentFiles[0].fullPath;
}

function readSessionTail(filePath, maxBytes = 4 * 1024 * 1024) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  try {
    const stat = fs.statSync(filePath);
    const readBytes = Math.min(maxBytes, stat.size);
    const fd = fs.openSync(filePath, "r");
    try {
      const buffer = Buffer.alloc(readBytes);
      fs.readSync(fd, buffer, 0, readBytes, stat.size - readBytes);
      return buffer.toString("utf8").split(/\r?\n/);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return [];
  }
}

function isUserMessage(entry) {
  return (
    entry?.type === "response_item" &&
    entry.payload?.type === "message" &&
    entry.payload?.role === "user"
  );
}

function getCurrentTurnEntries(sessionFile) {
  const lines = readSessionTail(sessionFile);
  const parsed = [];
  for (const line of lines) {
    if (!line) continue;
    const entry = parseJsonSafe(line);
    if (entry) parsed.push(entry);
  }

  let startIndex = -1;
  for (let i = parsed.length - 1; i >= 0; i -= 1) {
    if (isUserMessage(parsed[i])) {
      startIndex = i;
      break;
    }
  }

  return {
    entries: startIndex >= 0 ? parsed.slice(startIndex + 1) : parsed,
    userText:
      startIndex >= 0
        ? extractText(parsed[startIndex].payload?.content).trim()
        : "",
  };
}

function addTouchedFile(map, filePath, isNew) {
  if (!filePath) return;
  const key = normalizePathSafe(filePath);
  if (!key) return;
  const existing = map.get(key);
  if (existing) {
    if (isNew) existing.isNew = true;
    return;
  }
  map.set(key, { filePath, isNew: Boolean(isNew) });
}

function extractFilesFromPatch(baseDir, patchText, files) {
  if (!patchText) return;
  const lines = patchText.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith("*** Add File: ")) {
      addTouchedFile(
        files,
        toAbsolutePath(baseDir, line.slice(14).trim()),
        true,
      );
      continue;
    }
    if (line.startsWith("*** Update File: ")) {
      addTouchedFile(
        files,
        toAbsolutePath(baseDir, line.slice(17).trim()),
        false,
      );
      continue;
    }
    if (line.startsWith("*** Delete File: ")) {
      addTouchedFile(
        files,
        toAbsolutePath(baseDir, line.slice(17).trim()),
        false,
      );
      continue;
    }
    if (line.startsWith("*** Move to: ")) {
      addTouchedFile(
        files,
        toAbsolutePath(baseDir, line.slice(13).trim()),
        false,
      );
    }
  }
}

function collectTouchedFiles(baseDir, turnEntries) {
  const files = new Map();
  for (const entry of turnEntries) {
    if (entry?.type !== "response_item") continue;
    const payload = entry.payload || {};
    if (payload.type !== "custom_tool_call" || payload.name !== "apply_patch")
      continue;
    extractFilesFromPatch(baseDir, payload.input || "", files);
  }
  return [...files.values()].sort((a, b) =>
    a.filePath.localeCompare(b.filePath),
  );
}

function findCommand(candidates) {
  const pathDirs = (process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean);
  for (const candidate of candidates) {
    for (const dir of pathDirs) {
      const fullPath = path.join(dir, candidate);
      if (fs.existsSync(fullPath)) return fullPath;
    }
  }
  return "";
}

function getHookCommand(scriptPath) {
  if (scriptPath.endsWith(".js")) {
    return { command: process.execPath, args: [scriptPath] };
  }

  if (process.platform === "win32") {
    const shell = findCommand([
      "pwsh.exe",
      "pwsh",
      "powershell.exe",
      "powershell",
    ]);
    if (!shell) return null;
    return {
      command: shell,
      args: ["-ExecutionPolicy", "Bypass", "-File", scriptPath],
    };
  }

  return { command: "bash", args: [scriptPath] };
}

function resolveHookScript(scriptBase) {
  const ext = process.platform === "win32" ? "ps1" : "sh";
  const candidates = [
    path.join(__dirname, `${scriptBase}.${ext}`),
    path.join(os.homedir(), ".codex", "hooks", `${scriptBase}.${ext}`),
    path.resolve(__dirname, "..", "..", "..", "hooks", `${scriptBase}.${ext}`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return "";
}

function classifyHookOutput(output, exitCode) {
  const text = String(output || "").trim();
  if (!text) return "info";
  if (exitCode !== 0) return "error";
  if (/BLOCKED|ERROR|❌|\[X\]/i.test(text)) {
    return "error";
  }
  if (/WARNING|WARNINGS|⚠|\[!\]|HUMANIZER|REDUCING ENTROPY/i.test(text)) {
    return "warning";
  }
  return "info";
}

function trimOutput(text, maxLength = 320) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized;
}

function runHook(baseDir, scriptBase, filePath, mode, userText) {
  const scriptPath = resolveHookScript(scriptBase);
  if (!scriptPath) return null;

  const command = getHookCommand(scriptPath);
  if (!command) return null;

  const stdinPayload = JSON.stringify({
    tool_input: { file_path: filePath },
    prompt: userText,
  });
  const argPayload = JSON.stringify({ file_path: filePath });
  const spawnArgs =
    mode === "arg" ? [...command.args, argPayload] : command.args;
  const result = cp.spawnSync(command.command, spawnArgs, {
    cwd: baseDir,
    input: mode === "stdin" ? stdinPayload : "",
    encoding: "utf8",
    windowsHide: true,
  });

  return {
    hook: scriptBase,
    file: relativePath(baseDir, filePath),
    exitCode: result.status ?? 0,
    severity: classifyHookOutput(
      `${result.stdout || ""}\n${result.stderr || ""}`,
      result.status ?? 0,
    ),
    output: trimOutput(`${result.stdout || ""}\n${result.stderr || ""}`),
  };
}

function shouldFormat(filePath) {
  return /\.(py|ts|tsx|js|jsx|json|css|scss|java)$/i.test(filePath);
}

function shouldValidateCode(filePath) {
  return /\.(py|ts|tsx|jsx|java|js)$/i.test(filePath);
}

function shouldValidateDocs(filePath) {
  return /\.(md|mdx)$/i.test(filePath);
}

function shouldValidateApi(filePath) {
  return /[\\/](api|routes)[\\/]/i.test(filePath);
}

async function main() {
  const baseDirArg = process.argv.find((arg) => arg.startsWith("--base-dir="));
  const payload = parseJsonSafe(readStdin()) || {};
  const baseDir =
    (baseDirArg ? baseDirArg.slice("--base-dir=".length) : "") ||
    payload.cwd ||
    payload["working-directory"] ||
    payload.working_directory ||
    payload["project-root"] ||
    payload.project_root ||
    process.cwd();

  const sessionFile = selectSessionFile(baseDir);
  const { entries, userText: sessionUserText } =
    getCurrentTurnEntries(sessionFile);
  const userText =
    extractText(payload["input-messages"] || payload.input_messages).trim() ||
    sessionUserText;
  const touchedFiles = collectTouchedFiles(baseDir, entries);

  const summary = {
    warnings: 0,
    errors: 0,
    touchedFiles: touchedFiles.map((item) =>
      relativePath(baseDir, item.filePath),
    ),
    newFiles: touchedFiles
      .filter((item) => item.isNew)
      .map((item) => relativePath(baseDir, item.filePath)),
    messages: [],
  };

  for (const item of touchedFiles) {
    const filePath = item.filePath;

    if (item.isNew) {
      const result = runHook(
        baseDir,
        "check-new-file",
        filePath,
        "stdin",
        userText,
      );
      if (result?.output)
        summary.messages.push(
          `[check-new-file] ${result.file}: ${result.output}`,
        );
      if (result?.severity === "warning") summary.warnings += 1;
      if (result?.severity === "error") summary.errors += 1;
    }

    const protect = runHook(
      baseDir,
      "protect-files",
      filePath,
      "stdin",
      userText,
    );
    if (protect?.output)
      summary.messages.push(
        `[protect-files] ${protect.file}: ${protect.output}`,
      );
    if (protect?.severity === "warning") summary.warnings += 1;
    if (protect?.severity === "error") summary.errors += 1;

    if (!fs.existsSync(filePath)) {
      continue;
    }

    if (shouldFormat(filePath)) {
      const format = runHook(baseDir, "format-code", filePath, "arg", userText);
      if (format?.output)
        summary.messages.push(`[format-code] ${format.file}: ${format.output}`);
      if (format?.severity === "warning") summary.warnings += 1;
      if (format?.severity === "error") summary.errors += 1;
    }

    if (shouldValidateCode(filePath)) {
      const validateCode = runHook(
        baseDir,
        "validate-code",
        filePath,
        "stdin",
        userText,
      );
      if (validateCode?.output)
        summary.messages.push(
          `[validate-code] ${validateCode.file}: ${validateCode.output}`,
        );
      if (validateCode?.severity === "warning") summary.warnings += 1;
      if (validateCode?.severity === "error") summary.errors += 1;
    }

    if (shouldValidateDocs(filePath)) {
      const validateDocs = runHook(
        baseDir,
        "validate-docs",
        filePath,
        "stdin",
        userText,
      );
      if (validateDocs?.output)
        summary.messages.push(
          `[validate-docs] ${validateDocs.file}: ${validateDocs.output}`,
        );
      if (validateDocs?.severity === "warning") summary.warnings += 1;
      if (validateDocs?.severity === "error") summary.errors += 1;
    }

    if (shouldValidateApi(filePath)) {
      const validateApi = runHook(
        baseDir,
        "validate-api",
        filePath,
        "stdin",
        userText,
      );
      if (validateApi?.output)
        summary.messages.push(
          `[validate-api] ${validateApi.file}: ${validateApi.output}`,
        );
      if (validateApi?.severity === "warning") summary.warnings += 1;
      if (validateApi?.severity === "error") summary.errors += 1;
    }
  }

  process.stdout.write(JSON.stringify(summary));
}

main().catch(() => {
  process.stdout.write(JSON.stringify(EMPTY_SUMMARY));
  process.exit(0);
});
