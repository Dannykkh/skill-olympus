const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { copyMnemoSupportFiles } = require('../skill-catalog');

const repo = path.resolve(__dirname, '../..');
const installer = path.join(repo, 'skills/mnemo/install.js');
const extension = process.platform === 'win32' ? 'ps1' : 'sh';

function fixture(t, initialSettings) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mnemo-storage-install-'));
  t.after(() => {
    assert.equal(path.dirname(home), path.resolve(os.tmpdir()));
    assert.ok(path.basename(home).startsWith('mnemo-storage-install-'));
    fs.rmSync(home, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });
  const claude = path.join(home, '.claude');
  fs.mkdirSync(claude);
  const settingsPath = path.join(claude, 'settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify(initialSettings));
  const nativeMemory = path.join(claude, 'projects', 'legacy-project', 'memory', 'MEMORY.md');
  fs.mkdirSync(path.dirname(nativeMemory), { recursive: true });
  fs.writeFileSync(nativeMemory, 'Preserve existing native memory.\n');
  const originalMemory = fs.readFileSync(nativeMemory);
  const statePath = path.join(claude, '.mnemo-native-memory.json');
  const env = {
    ...process.env, HOME: home, USERPROFILE: home,
    CLAUDE_CONFIG_DIR: claude, CODEX_HOME: path.join(home, '.codex'),
    ANTIGRAVITY_HOME: path.join(home, '.gemini'), GROK_HOME: path.join(home, '.grok'),
  };
  // Verify the spawned Node runtime sees our isolated home before an installer
  // can touch settings; never depend on the real profile's current environment.
  const probe = spawnSync(process.execPath, ['-e', 'process.stdout.write(require("node:os").homedir())'], { env, encoding: 'utf8', windowsHide: true });
  assert.equal(probe.status, 0, probe.stderr);
  assert.equal(path.resolve(probe.stdout), path.resolve(home));
  const invoke = (...args) => {
    const result = spawnSync(process.execPath, [installer, ...args], { cwd: home, env, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.deepEqual(fs.readFileSync(nativeMemory), originalMemory, 'installation must preserve existing native memory');
  };
  return { claude, statePath, invoke, readSettings: () => JSON.parse(fs.readFileSync(settingsPath, 'utf8')) };
}

for (const initialPreference of [true, undefined]) {
  test(`Mnemo install restores ${initialPreference === undefined ? 'absent' : 'enabled'} native-memory preference after repeat install and uninstall`, t => {
    const unrelatedHook = { matcher: '', hooks: [{ type: 'command', command: 'echo unrelated-startup', timeout: 15 }] };
    const initial = { theme: 'dark', permissions: { allow: ['Read'] }, hooks: { SessionStart: [unrelatedHook] } };
    if (initialPreference !== undefined) initial.autoMemoryEnabled = initialPreference;
    const { claude, statePath, invoke, readSettings } = fixture(t, initial);
    invoke();
    const installed = readSettings();
    assert.equal(installed.autoMemoryEnabled, false);
    assert.equal(installed.theme, initial.theme);
    assert.deepEqual(installed.permissions, initial.permissions);
    assert.deepEqual(installed.hooks.SessionStart[0], unrelatedHook);
    const startup = installed.hooks.SessionStart.filter(entry => entry.hooks?.some(hook => hook.command.includes('reconcile-conversations')));
    assert.equal(startup.length, 1);
    assert.ok(startup[0].hooks[0].command.includes(`reconcile-conversations.${extension}`));
    assert.ok(startup[0].hooks[0].command.includes(claude.replaceAll('\\', '/')));
    for (const [source, destination] of [
      ['hooks/mnemo-project-root.js', 'hooks/mnemo-project-root.js'],
      [`hooks/reconcile-conversations.${extension}`, `hooks/reconcile-conversations.${extension}`],
      ['skills/mnemo/scripts/reconcile_conversations.py', 'scripts/reconcile_conversations.py'],
      ['skills/mnemo/scripts/mnemo_project_root.py', 'scripts/mnemo_project_root.py'],
    ]) {
      assert.deepEqual(fs.readFileSync(path.join(claude, destination)), fs.readFileSync(path.join(repo, source)), `installed ${destination} must match canonical source`);
    }
    const originalBackup = fs.readFileSync(statePath);
    const backup = JSON.parse(originalBackup.toString('utf8'));
    assert.equal(backup.present, initialPreference !== undefined);
    if (initialPreference !== undefined) assert.equal(backup.value, initialPreference);
    invoke();
    assert.deepEqual(fs.readFileSync(statePath), originalBackup, 'repeat install must not replace original preference with managed false');
    assert.deepEqual(readSettings(), installed, 'repeat install must not duplicate hooks or change unrelated settings');
    invoke('--uninstall');
    assert.deepEqual(readSettings(), initial, 'uninstall must restore preference and preserve unrelated settings and hooks');
    assert.ok(!fs.existsSync(statePath));
    assert.ok(!fs.existsSync(path.join(claude, 'hooks/mnemo-project-root.js')));
    assert.ok(!fs.existsSync(path.join(claude, `hooks/reconcile-conversations.${extension}`)));
  });
}

const installedMode = process.env.MNEMO_TEST_INSTALLED === '1';
test('Claude skill refresh retains bundled root helpers and handoff tools after pruning', t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mnemo-bundle-sync-'));
  t.after(() => {
    assert.equal(path.dirname(home), path.resolve(os.tmpdir()));
    assert.ok(path.basename(home).startsWith('mnemo-bundle-sync-'));
    fs.rmSync(home, { recursive: true, force: true });
  });
  const sync = path.join(repo, 'scripts/sync-claude-skills.js');
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = spawnSync(process.execPath, [sync, home], { encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    for (const name of ['mnemo', 'grok-mnemo']) {
      for (const relative of ['hooks/mnemo-project-root.js', 'scripts/mnemo_project_root.py', 'scripts/create_handoff.py', 'references/project-storage.md']) {
        assert.ok(fs.existsSync(path.join(home, 'skills', name, relative)), `missing ${name}/${relative} after refresh`);
      }
    }
  }
});

test(`all ${installedMode ? 'installed' : 'packaged'} Mnemo adapters can create handoffs without the source checkout`, t => {
  const base = fs.mkdtempSync(path.join(path.dirname(repo), '.mnemo-package-test-'));
  t.after(() => {
    assert.equal(path.dirname(base), path.dirname(repo));
    assert.ok(path.basename(base).startsWith('.mnemo-package-test-'));
    fs.rmSync(base, { recursive: true, force: true });
  });
  const project = path.join(base, 'project');
  const child = path.join(project, 'src'); fs.mkdirSync(child, { recursive: true });
  assert.equal(spawnSync('git', ['init', '--quiet', project], { windowsHide: true }).status, 0);
  const installedRoots = {
    mnemo: path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'skills/mnemo'),
    'codex-mnemo': path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'skills/codex-mnemo'),
    'antigravity-mnemo': path.join(process.env.ANTIGRAVITY_HOME || path.join(os.homedir(), '.gemini'), 'antigravity-cli/skills/antigravity-mnemo'),
    'grok-mnemo': path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'skills/grok-mnemo'),
  };
  for (const name of ['mnemo', 'codex-mnemo', 'antigravity-mnemo', 'grok-mnemo']) {
    const source = path.join(repo, 'skills', name);
    const installed = installedMode ? installedRoots[name] : path.join(base, 'packages', name);
    if (!installedMode) {
      fs.cpSync(source, installed, { recursive: true, filter: p => !p.includes('node_modules') && !p.includes('__pycache__') });
      copyMnemoSupportFiles(source, installed);
    }
    assert.deepEqual(fs.readFileSync(path.join(installed, 'hooks/mnemo-project-root.js')), fs.readFileSync(path.join(repo, 'hooks/mnemo-project-root.js')));
    const result = spawnSync('python', [path.join(installed, 'scripts/create_handoff.py'), name], { cwd: child, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.readdirSync(path.join(project, 'docs/handoffs')).some(file => file.endsWith(`-${name}.md`)));
    assert.ok(!fs.existsSync(path.join(child, 'docs')));
  }
});
