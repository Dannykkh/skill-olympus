"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const script = path.resolve(__dirname, "../../skills/systematic-debugging/find-polluter.sh");
const fixturePrefix = "olympus-debug-polluter-";

function findBash() {
  const candidates = [process.env.BASH_PATH];
  if (process.platform === "win32") {
    for (const base of [process.env.ProgramFiles, process.env.ProgramW6432]) {
      if (base) candidates.push(path.join(base, "Git/bin/bash.exe"));
    }
  } else {
    candidates.push("/bin/bash", "/usr/bin/bash");
  }
  return candidates.find((candidate) => candidate && spawnSync(candidate, [
    "-c", "(( BASH_VERSINFO[0] >= 4 )) && command -v npm >/dev/null && command -v node >/dev/null",
  ], { stdio: "ignore", timeout: 5000 }).status === 0);
}

function shellPath(value) {
  return value.replaceAll("\\", "/").replace(/^([A-Za-z]):\//, (_, drive) => `/${drive.toLowerCase()}/`);
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const bash = findBash();
const runtime = { skip: bash ? false : "Bash 4+, Node.js, and npm are required" };

function runFixture(files, pattern, { existingPollution = false } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), fixturePrefix));
  try {
    fs.writeFileSync(path.join(directory, "package.json"), JSON.stringify({
      private: true, scripts: { test: "node runner.cjs" },
    }));
    fs.writeFileSync(path.join(directory, "runner.cjs"), [
      'const fs = require("node:fs");',
      'fs.appendFileSync("calls.jsonl", JSON.stringify(process.argv.slice(2)) + "\\n");',
      'require(require("node:path").resolve(process.argv[2]));',
    ].join("\n"));
    fs.writeFileSync(path.join(directory, ".npmrc"), "");
    for (const [name, content] of Object.entries(files)) {
      const file = path.join(directory, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
    if (existingPollution) fs.writeFileSync(path.join(directory, "pollution"), "preserve me");

    // Preserve the caller's quoted glob across Git Bash's Windows argv startup.
    const command = [shellPath(script), "pollution", pattern].map(shellQuote).join(" ");
    const result = spawnSync(bash, ["-c", `exec bash ${command}`], {
      cwd: directory,
      env: {
        ...process.env,
        npm_config_cache: path.join(directory, "npm-cache"),
        npm_config_userconfig: path.join(directory, ".npmrc"),
        npm_config_update_notifier: "false",
      },
      encoding: "utf8", timeout: 20000,
    });
    assert.ifError(result.error);
    const callsFile = path.join(directory, "calls.jsonl");
    const calls = fs.existsSync(callsFile)
      ? fs.readFileSync(callsFile, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse)
      : [];
    const pollutionFile = path.join(directory, "pollution");
    return {
      status: result.status,
      output: `${result.stdout}\n${result.stderr}`,
      calls,
      pollution: fs.existsSync(pollutionFile) ? fs.readFileSync(pollutionFile, "utf8") : null,
    };
  } finally {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith(fixturePrefix));
    fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

const pass = 'require("node:assert/strict").equal(1 + 1, 2);';

test("polluter search runs direct and nested matches, preserving spaces", runtime, () => {
  const result = runFixture({
    "src/direct.test.cjs": pass,
    "src/nested/space name.test.cjs": pass,
    "src/ignored.txt": "not executable",
  }, "src/**/*.test.cjs");
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(result.calls, [["src/direct.test.cjs"], ["src/nested/space name.test.cjs"]]);
  assert.match(result.output, /2 selected test files passed/);
  assert.equal(result.pollution, null);
});

test("polluter search accepts a dot-prefixed pattern containing spaces", runtime, () => {
  const result = runFixture({ "test cases/one.test.cjs": pass }, "./test cases/**/*.test.cjs");
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(result.calls, [["./test cases/one.test.cjs"]]);
});

test("polluter search reports no matches as unexecuted, never clean", runtime, () => {
  const result = runFixture({ "src/one.test.cjs": pass }, "missing/**/*.test.cjs");
  assert.equal(result.status, 2, result.output);
  assert.deepEqual(result.calls, []);
  assert.match(result.output, /No test files matched/);
  assert.doesNotMatch(result.output, /CLEAN:/);
});

test("polluter search stops on runner failure and reports its exit code", runtime, () => {
  const result = runFixture({
    "src/a.test.cjs": "process.exit(7);",
    "src/b.test.cjs": pass,
  }, "src/*.test.cjs");
  assert.equal(result.status, 2, result.output);
  assert.deepEqual(result.calls, [["src/a.test.cjs"]]);
  assert.match(result.output, /runner failed.*exit 7/i);
  assert.doesNotMatch(result.output, /CLEAN:/);
});

test("polluter search stops at the responsible test and preserves the evidence", runtime, () => {
  const result = runFixture({
    "src/a.test.cjs": 'require("node:fs").writeFileSync("pollution", "created by a");',
    "src/b.test.cjs": pass,
  }, "src/*.test.cjs");
  assert.equal(result.status, 1, result.output);
  assert.deepEqual(result.calls, [["src/a.test.cjs"]]);
  assert.equal(result.pollution, "created by a");
  assert.match(result.output, /POLLUTER: src\/a\.test\.cjs/);
  assert.doesNotMatch(result.output, /CLEAN:/);
});

test("polluter search never removes a pre-existing target or attributes it to a test", runtime, () => {
  const result = runFixture({ "src/a.test.cjs": pass }, "src/*.test.cjs", { existingPollution: true });
  assert.equal(result.status, 2, result.output);
  assert.deepEqual(result.calls, []);
  assert.equal(result.pollution, "preserve me");
  assert.match(result.output, /already exists/);
  assert.doesNotMatch(result.output, /CLEAN:|POLLUTER:/);
});
