"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const scriptPath = path.resolve(__dirname, "select-diverse-palettes.js");

test("default selection excludes the named orange playbook lane", () => {
  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--type",
      "Developer Tools",
      "--seed",
      "coder-interface-check",
    ],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  const namedSignalLane = output.selection.find((candidate) =>
    /\b(?:green|orange)\b/i.test(candidate.lane || ""),
  );

  assert.equal(
    namedSignalLane,
    undefined,
    `unexpected signal lane: ${JSON.stringify(namedSignalLane)}`,
  );
});
