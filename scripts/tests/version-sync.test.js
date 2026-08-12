const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");

test("public release and Claude plugin versions stay synchronized", () => {
  const version = fs.readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
  const marketplace = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, ".claude-plugin", "marketplace.json"),
      "utf8",
    ),
  );
  const plugin = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, ".claude-plugin", "plugin.json"),
      "utf8",
    ),
  );
  const olympusEntry = marketplace.plugins.find(
    (entry) => entry.name === "skill-olympus",
  );

  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(marketplace.metadata.version, version);
  assert.equal(olympusEntry?.version, version);
  assert.equal(plugin.version, version);
});
