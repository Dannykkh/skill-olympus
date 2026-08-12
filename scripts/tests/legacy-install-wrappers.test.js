const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");

test("legacy Windows wrappers map to supported install modes", () => {
  const installWrapper = fs.readFileSync(
    path.join(repoRoot, "install-link.bat"),
    "utf8",
  );
  const uninstallWrapper = fs.readFileSync(
    path.join(repoRoot, "install-unlink.bat"),
    "utf8",
  );

  assert.match(installWrapper, /call\s+"%~dp0install\.bat"\s+%\*/i);
  assert.doesNotMatch(installWrapper, /--link\b/i);
  assert.match(
    uninstallWrapper,
    /call\s+"%~dp0install\.bat"\s+--uninstall\s+%\*/i,
  );
  assert.doesNotMatch(uninstallWrapper, /--unlink\b/i);
});

test("Windows installer stops when stale-asset quarantine fails", () => {
  const installer = fs.readFileSync(path.join(repoRoot, "install.bat"), "utf8");

  assert.match(
    installer,
    /prune-stale-assets\.js" "%CLAUDE_DIR%" --label claude[\s\S]*?Stale asset quarantine failed[\s\S]*?exit \/b 1/i,
  );
  assert.match(
    installer,
    /prune-stale-assets\.js" "%CLAUDE_DIR%" --label grok-compat[\s\S]*?Grok compatibility stale asset quarantine failed[\s\S]*?exit \/b 1/i,
  );
});

test("installers preserve the stable Codex multi-agent setting", () => {
  const windowsInstaller = fs.readFileSync(
    path.join(repoRoot, "install.bat"),
    "utf8",
  );
  const unixInstaller = fs.readFileSync(path.join(repoRoot, "install.sh"), "utf8");

  for (const installer of [windowsInstaller, unixInstaller]) {
    assert.doesNotMatch(installer, /codex\s+features\s+enable\s+multi_agent/i);
    assert.match(installer, /settings unchanged|설정 변경 없음/i);
  }
});
