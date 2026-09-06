"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { reconcileCodexSkillDuplicates } = require("../codex-skill-dedup");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccc-skill-dedup-"));
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 });
  });
  const userHome = path.join(root, "user");
  const codexHome = path.join(root, "custom-codex");
  const config = path.join(codexHome, "config.toml");
  fs.mkdirSync(codexHome, { recursive: true });
  const warnings = [];
  const run = (options = {}) => reconcileCodexSkillDuplicates({
    userHome, codexHome, log: () => {}, warn: (message) => warnings.push(message), ...options,
  });
  const skill = (base, folder, name = folder, resource = "same helper") => {
    const dir = path.join(base, folder);
    fs.mkdirSync(path.join(dir, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), `---\nname: '${name}'\ndescription: fixture\n---\nUse the helper.\n`);
    fs.writeFileSync(path.join(dir, "scripts", "helper.js"), resource);
    return path.join(dir, "SKILL.md");
  };
  const pair = (name = "external-tool", otherFolder = name) => [
    skill(path.join(codexHome, "skills"), name),
    skill(path.join(userHome, ".agents", "skills"), otherFolder, name),
  ];
  const read = () => fs.existsSync(config) ? fs.readFileSync(config, "utf8") : "";
  return { root, userHome, codexHome, config, warnings, run, pair, read };
}

test("identical named skills disable only the shared copy, preserve resources, and converge", (t) => {
  const f = fixture(t);
  const [retained, duplicate] = f.pair("external-tool", "different-folder-name");
  const original = '\uFEFFmodel = "fixture"\r\n[features]\r\nmulti_agent = true\r\n';
  fs.writeFileSync(f.config, original);
  const result = f.run();
  assert.equal(result.disabled, 1);
  assert.equal(result.changed, true);
  assert.ok(f.read().startsWith(original));
  assert.ok(f.read().includes(JSON.stringify(duplicate.replace(/\\/g, "/"))));
  assert.ok(!f.read().includes(JSON.stringify(retained.replace(/\\/g, "/"))));
  const backups = path.join(f.codexHome, ".olympus", "backups");
  assert.equal(fs.readFileSync(path.join(backups, fs.readdirSync(backups)[0]), "utf8"), original);
  const once = f.read();
  assert.equal(f.run().changed, false);
  assert.equal(f.read(), once);
  assert.equal(fs.readdirSync(backups).length, 1);
  assert.equal(fs.readFileSync(retained, "utf8"), fs.readFileSync(duplicate, "utf8"));
  assert.equal(fs.readFileSync(path.join(path.dirname(duplicate), "scripts", "helper.js"), "utf8"), "same helper");
  assert.deepEqual(f.warnings, []);
});

test("same SKILL.md with different helper bytes is reported and preserved", (t) => {
  const f = fixture(t);
  const [retained, duplicate] = f.pair();
  fs.writeFileSync(path.join(path.dirname(duplicate), "scripts", "helper.js"), "DIFF helper");
  const result = f.run();
  assert.equal(result.disabled, 0);
  assert.equal(result.conflicts, 1);
  assert.equal(fs.existsSync(f.config), false);
  assert.ok(f.warnings[0].includes(retained));
  assert.ok(f.warnings[0].includes(duplicate));
});

test("a changed copy or a missing retained copy releases installer-owned disables", (t) => {
  const f = fixture(t);
  const [retained, duplicate] = f.pair();
  assert.equal(f.run().disabled, 1);
  fs.writeFileSync(path.join(path.dirname(duplicate), "new-resource.txt"), "new capability");
  assert.equal(f.run().disabled, 0);
  assert.ok(!f.read().includes("enabled = false"));
  fs.unlinkSync(path.join(path.dirname(duplicate), "new-resource.txt"));
  assert.equal(f.run().disabled, 1);
  fs.unlinkSync(retained);
  assert.equal(f.run().disabled, 0);
  assert.ok(!f.read().includes("enabled = false"));
  assert.ok(fs.existsSync(duplicate));
});

test("explicit user enable and disable choices survive while other duplicates are handled", (t) => {
  const f = fixture(t);
  const [, explicitlyEnabled] = f.pair("enabled-tool");
  const [explicitlyDisabled] = f.pair("disabled-tool");
  f.pair("automatic-tool");
  const config = `# User choices\n[["skills".'config']]\n'path' = '${explicitlyEnabled}'\nenabled = true\n\n[[skills.config]]\npath = ${JSON.stringify(explicitlyDisabled)}\nenabled = false\n`;
  fs.writeFileSync(f.config, config);
  const result = f.run();
  assert.equal(result.userOverrides, 2);
  assert.equal(result.disabled, 1);
  assert.ok(f.read().startsWith(config));
  assert.equal(f.run().changed, false);
});

test("comments and multiline prompt examples are not read as skill overrides", (t) => {
  const f = fixture(t);
  const [, duplicate] = f.pair();
  const config = `instructions = '''\n[[skills.config]]\npath = '${duplicate}'\nenabled = true\n'''\n# [[skills.config]]\n[features]\nflag = true\n`;
  fs.writeFileSync(f.config, config);
  assert.equal(f.run().disabled, 1);
  assert.ok(f.read().startsWith(config));
});

test("unsupported inline overrides and malformed strings cause a visible no-write result", (t) => {
  const f = fixture(t);
  f.pair();
  for (const config of [
    'skills = { config = [] }\n',
    'skills.config = []\n',
    '[skills]\nconfig = []\n',
    'instructions = """unterminated\n',
    '[[skills.config]]\npath = """/multiline/path"""\nenabled = true\n',
  ]) {
    fs.writeFileSync(f.config, config);
    assert.equal(f.run().changed, false);
    assert.equal(f.read(), config);
  }
  assert.equal(f.warnings.length, 5);
});

test("unlink removes only an unedited managed fragment and respects later sections", (t) => {
  const f = fixture(t);
  f.pair();
  fs.writeFileSync(f.config, 'model = "fixture"\n');
  f.run();
  fs.appendFileSync(f.config, '\n[mcp_servers.custom]\ncommand = "custom"\n');
  assert.equal(f.run({ unlink: true }).disabled, 0);
  assert.ok(!f.read().includes("OLYMPUS-CODEX-SKILL-DEDUP"));
  assert.ok(f.read().includes('[mcp_servers.custom]\ncommand = "custom"'));
  assert.ok(f.read().startsWith('model = "fixture"'));
});

test("manual changes inside or attached to a managed table are not discarded", (t) => {
  const f = fixture(t);
  f.pair();
  f.run();
  const generated = f.read();
  for (const edited of [generated.replace("enabled = false", "enabled = true"), generated + 'custom = "keep"\n']) {
    fs.writeFileSync(f.config, edited);
    assert.equal(f.run({ unlink: true }).changed, false);
    assert.equal(f.read(), edited);
  }
  assert.equal(f.warnings.length, 2);
});

test("native TOML formatting and MCP insertion before the end marker preserve ownership", (t) => {
  const f = fixture(t);
  const [, duplicate] = f.pair();
  f.run();
  const foreign = '[mcp_servers.fixture]\ncommand = "node"\nargs = ["--version"]\n';
  const formatted = f.read()
    .replace('enabled = false\n', 'enabled=false\n\n' + foreign)
    .replace(/\n/g, '\r\n');
  fs.writeFileSync(f.config, formatted);
  const result = f.run();
  assert.equal(result.disabled, 1);
  assert.deepEqual(f.warnings, []);
  assert.ok(f.read().includes(foreign.replace(/\n/g, '\r\n')));
  fs.writeFileSync(path.join(path.dirname(duplicate), 'new-resource'), 'changed');
  f.run();
  assert.ok(!f.read().includes('enabled = false'));
  assert.ok(f.read().includes(foreign.replace(/\n/g, '\r\n')));
});

test("shared directory aliases are never disabled along with their target", (t) => {
  const f = fixture(t);
  const [retained] = f.pair();
  const aliasedUser = path.join(f.root, "alias-user");
  fs.mkdirSync(path.join(aliasedUser, ".agents"), { recursive: true });
  fs.symlinkSync(path.join(f.codexHome, "skills"), path.join(aliasedUser, ".agents", "skills"), process.platform === "win32" ? "junction" : "dir");
  assert.equal(f.run({ userHome: aliasedUser }).disabled, 0);
  assert.ok(fs.existsSync(retained));
  assert.equal(f.read(), "");
});

test("user overrides through a directory alias apply to the same physical skill", (t) => {
  const f = fixture(t);
  const [retained] = f.pair();
  const alias = path.join(f.root, "skill-alias");
  fs.symlinkSync(path.dirname(retained), alias, process.platform === "win32" ? "junction" : "dir");
  const original = `[[skills.config]]\npath = ${JSON.stringify(path.join(alias, "SKILL.md"))}\nenabled = false\n`;
  fs.writeFileSync(f.config, original);
  assert.equal(f.run().userOverrides, 1);
  assert.equal(f.read(), original);
});

test("linked resources cannot be mistaken for a self-contained identical tree", (t) => {
  const f = fixture(t);
  const copies = f.pair();
  const external = path.join(f.root, "external-assets");
  fs.mkdirSync(external);
  fs.writeFileSync(path.join(external, "asset.txt"), "shared outside resource");
  for (const skillPath of copies) {
    fs.symlinkSync(external, path.join(path.dirname(skillPath), "assets"), process.platform === "win32" ? "junction" : "dir");
  }
  assert.equal(f.run().conflicts, 1);
  assert.equal(f.read(), "");
  assert.match(f.warnings[0], /comparison incomplete/);
});

test("Codex sync integrates dedup for custom CODEX_HOME and unlink without needing the CLI", (t) => {
  const f = fixture(t);
  const repository = path.join(f.root, "repository");
  const scripts = path.join(repository, "scripts");
  fs.mkdirSync(scripts, { recursive: true });
  for (const name of ['agent-catalog.js', 'agent-files.js', 'agent-install-policy.js', 'prune-stale-assets.js', 'skill-catalog.js', 'skill-install-policy.js', 'codex-skill-dedup.js', 'sync-codex-assets.js']) {
    fs.copyFileSync(path.join(__dirname, "..", name), path.join(scripts, name));
  }
  fs.mkdirSync(path.join(repository, "skills", "design-plan"), { recursive: true });
  fs.writeFileSync(path.join(repository, "skills", "design-plan", "SKILL.md"), '---\nname: design-plan\ndescription: fixture\n---\n');
  const [retained, duplicate] = f.pair();
  const run = (...args) => spawnSync(process.execPath, [path.join(scripts, "sync-codex-assets.js"), ...args], {
    env: { ...process.env, HOME: f.userHome, USERPROFILE: f.userHome, CODEX_HOME: f.codexHome },
    encoding: "utf8", windowsHide: true,
  });
  const installed = run();
  assert.equal(installed.status, 0, installed.stderr || installed.stdout);
  assert.match(installed.stdout, /\[codex-dedup\] disabled=1/);
  assert.equal(fs.existsSync(path.join(f.userHome, ".codex", "config.toml")), false);
  assert.match(f.read(), /enabled = false/);
  const removed = run("--unlink");
  assert.equal(removed.status, 0, removed.stderr || removed.stdout);
  assert.ok(!f.read().includes("enabled = false"));
  assert.ok(fs.existsSync(retained));
  assert.ok(fs.existsSync(duplicate));
});
