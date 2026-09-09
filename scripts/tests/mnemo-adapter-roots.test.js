const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const agy = require('../../skills/antigravity-mnemo/hooks/save-turn');

const bash = process.env.BASH_PATH || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash');
const ps = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
function fixture(t) {
  // Outside temp: the Windows and Antigravity adapters intentionally reject temp workspaces.
  const base = fs.mkdtempSync(path.join(os.homedir(), 'mnemo-root-test-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const project = path.join(base, 'project');
  fs.mkdirSync(project);
  fs.mkdirSync(path.join(base, 'conversations'));
  fs.writeFileSync(path.join(base, 'MEMORY.md'), 'Unrelated ancestor');
  return { base, project };
}

test('Antigravity stays with payload workspace, preserves a moved boundary, rejects internal and absent workspace', (t) => {
  const { base, project } = fixture(t);
  assert.equal(agy.resolveProjectRoot({ workspacePath: project, cwd: base }), project);
  fs.writeFileSync(path.join(base, '.mnemo-root'), '');
  assert.equal(agy.resolveProjectRoot({ workspacePath: project }), project);
  assert.equal(agy.resolveProjectRoot({ workspacePaths: [project] }), project);
  assert.equal(agy.resolveProjectRoot({ cwd: 'project' }), null);
  agy.appendTurn(project, {}, { userText: 'root test', assistantText: '', order: 0 });
  const moved = path.join(base, 'moved');
  fs.renameSync(project, moved);
  const subdir = path.join(moved, 'src'); fs.mkdirSync(subdir);
  assert.equal(agy.resolveProjectRoot({ cwd: subdir }), moved);
  assert.equal(spawnSync('git', ['init', '--quiet', subdir]).status, 0);
  assert.equal(agy.resolveProjectRoot({ cwd: subdir }), subdir);
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = moved;
  try { assert.equal(agy.resolveProjectRoot({ cwd: subdir }), null); }
  finally { if (previous === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previous; }
  for (const name of ['.claude', '.codex', '.gemini', '.grok']) {
    const internal = path.join(base, name, 'projects'); fs.mkdirSync(internal, { recursive: true });
    assert.equal(agy.resolveProjectRoot({ cwd: internal }), null);
  }
  assert.equal(agy.resolveProjectRoot({ cwd: os.homedir() }), null);
  assert.equal(agy.resolveProjectRoot({}), null);
});

for (const adapter of ['ps1', 'sh']) {
  test(`Grok ${adapter} persists only in payload project and follows portable boundary after move`, { skip: adapter === 'sh' && !fs.existsSync(bash) }, (t) => {
    const { base, project } = fixture(t);
    const script = path.resolve(__dirname, `../../skills/grok-mnemo/hooks/save-turn.${adapter}`);
    let event = 0;
    const invoke = (workspace, env = {}) => {
      const result = spawnSync(adapter === 'sh' ? bash : ps, adapter === 'sh' ? [script.replaceAll('\\', '/')] : ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], {
        cwd: base, input: JSON.stringify({ hookEventName: 'user_prompt_submit', sessionId: 'root-test', eventId: String(++event), prompt: 'project history', ...workspace }), encoding: 'utf8', timeout: 30000,
        env: { ...process.env, MNEMO_DISABLE: '0', MNEMO_STRICT: '1', ...env }, windowsHide: true,
      });
      assert.equal(result.status, 0, result.stderr);
    };
    fs.writeFileSync(path.join(base, '.mnemo-root'), '');
    invoke({ cwd: 'project' });
    assert.equal(fs.existsSync(path.join(project, 'MEMORY.md')), false);
    invoke({ workspaceRoot: project, cwd: base });
    assert.ok(fs.existsSync(path.join(project, 'MEMORY.md')));
    assert.ok(fs.existsSync(path.join(project, '.mnemo-root')));
    assert.equal(fs.readdirSync(path.join(base, 'conversations')).length, 0);
    const moved = path.join(base, 'moved'); fs.renameSync(project, moved);
    const subdir = path.join(moved, 'src'); fs.mkdirSync(subdir);
    invoke({ cwd: subdir });
    assert.equal(fs.existsSync(path.join(subdir, 'MEMORY.md')), false);
    const files = fs.readdirSync(path.join(moved, 'conversations')).filter((f) => f.endsWith('-grok.md'));
    assert.match(fs.readFileSync(path.join(moved, 'conversations', files[0]), 'utf8'), /project history/);
    const internal = path.join(base, '.claude', 'projects'); fs.mkdirSync(internal, { recursive: true });
    invoke({ cwd: internal });
    invoke({});
    assert.equal(fs.existsSync(path.join(internal, 'MEMORY.md')), false);
    assert.equal(fs.readdirSync(path.join(base, 'conversations')).length, 0);
    const override = path.join(base, 'custom-config'); fs.mkdirSync(override);
    invoke({ cwd: override }, { CODEX_HOME: override });
    assert.equal(fs.existsSync(path.join(override, 'MEMORY.md')), false);
    assert.equal(spawnSync('git', ['init', '--quiet', subdir]).status, 0);
    invoke({ cwd: subdir });
    assert.ok(fs.existsSync(path.join(subdir, 'MEMORY.md')));
  });
}
