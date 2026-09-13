const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolveRoot, resolveClaude, resolveCodex, resolveGrok, resolveAntigravity } = require('../../hooks/mnemo-project-root');

const repo = path.resolve(__dirname, '../..');
const installedMode = process.env.MNEMO_TEST_INSTALLED === '1';
const installedClaude = path.join(os.homedir(), '.claude', 'hooks', 'save-conversation.ps1');
const installedCodex = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'hooks', 'save-turn.ps1');
const ps = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
const bash = process.env.BASH_PATH || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash');
const hasBashJq = spawnSync(bash, ['-c', 'command -v jq >/dev/null'], { windowsHide: true }).status === 0;
const hasPowerShell = spawnSync(ps, ['-NoProfile', '-Command', 'exit 0'], { windowsHide: true }).status === 0;

function fixture(t) {
  // Runtime hooks intentionally refuse temp directories. Keep fixtures outside
  // this repository as its Git boundary would absorb a non-Git child fixture.
  const base = fs.mkdtempSync(path.join(path.dirname(repo), '.mnemo-root-test-'));
  t.after(() => {
    assert.equal(path.dirname(base), path.dirname(repo));
    assert.ok(path.basename(base).startsWith('.mnemo-root-test-'));
    fs.rmSync(base, { recursive: true, force: true });
  });
  const project = path.join(base, 'project');
  const launcher = path.join(base, 'launcher');
  fs.mkdirSync(project);
  fs.mkdirSync(launcher);
  fs.mkdirSync(path.join(base, 'conversations'));
  fs.writeFileSync(path.join(base, 'MEMORY.md'), 'Unrelated ancestor memory');
  return { base, project, launcher };
}

function withEnv(values, body) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    return body();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

function assertScaffold(project, cli, text) {
  for (const entry of ['MEMORY.md', 'memory', 'conversations', '.mnemo-root']) {
    assert.ok(fs.existsSync(path.join(project, entry)), `missing project scaffold: ${entry}`);
  }
  const files = fs.readdirSync(path.join(project, 'conversations')).filter(name => name.endsWith(`-${cli}.md`));
  assert.ok(files.length > 0, `missing ${cli} history`);
  assert.ok(files.some(name => fs.readFileSync(path.join(project, 'conversations', name), 'utf8').includes(text)));
  assert.ok(!fs.readFileSync(path.join(project, '.mnemo-root'), 'utf8').includes(project), 'marker must be portable');
}

function assertNoPollution(base, launcher) {
  assert.equal(fs.readFileSync(path.join(base, 'MEMORY.md'), 'utf8'), 'Unrelated ancestor memory');
  assert.deepEqual(fs.readdirSync(path.join(base, 'conversations')), []);
  assert.ok(!fs.existsSync(path.join(base, 'memory')));
  for (const entry of ['MEMORY.md', 'memory', 'conversations', '.mnemo-root']) {
    assert.ok(!fs.existsSync(path.join(launcher, entry)), `unexpected launcher storage: ${entry}`);
  }
}

test('root selection ignores ancestor outputs, follows moved markers, and respects explicit and Git boundaries', t => {
  const { base, project } = fixture(t);
  assert.equal(resolveRoot(project), null, 'an unmarked cwd is not a project declaration');
  assert.equal(resolveRoot(project, true), project);
  fs.writeFileSync(path.join(base, '.mnemo-root'), '');
  assert.equal(resolveRoot(project, true), project);
  fs.writeFileSync(path.join(project, '.mnemo-root'), '');
  const moved = path.join(base, 'moved');
  fs.renameSync(project, moved);
  const subdir = path.join(moved, 'src');
  fs.mkdirSync(subdir);
  assert.equal(resolveRoot(subdir), moved);
  assert.equal(spawnSync('git', ['init', '--quiet', subdir], { windowsHide: true }).status, 0);
  const deep = path.join(subdir, 'nested');
  fs.mkdirSync(deep);
  fs.writeFileSync(path.join(deep, '.mnemo-root'), '');
  assert.equal(resolveRoot(deep), subdir);
  assert.equal(resolveRoot(deep, true), subdir);
});

test('root selection rejects host and runtime storage including custom configuration paths', t => {
  const { base } = fixture(t);
  assert.equal(resolveRoot(os.homedir()), null);
  assert.equal(resolveRoot(os.tmpdir(), true), null);
  assert.equal(resolveRoot(path.parse(base).root), null);
  assert.equal(resolveRoot('relative-project'), null);
  for (const name of ['.claude', '.codex', '.gemini', '.grok']) {
    const internal = path.join(base, name, 'projects');
    fs.mkdirSync(internal, { recursive: true });
    assert.equal(resolveRoot(internal), null);
  }
  const configured = path.join(base, 'custom-runtime', 'sessions');
  fs.mkdirSync(configured, { recursive: true });
  for (const key of ['CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'ANTIGRAVITY_HOME', 'GROK_HOME']) {
    withEnv({ [key]: path.dirname(configured) }, () => assert.equal(resolveRoot(configured, true), null));
  }
});

test('Claude payload cwd wins stale transcript metadata and missing metadata never uses process cwd', t => {
  const { base, project, launcher } = fixture(t);
  const transcript = path.join(base, 'transcript.jsonl');
  fs.writeFileSync(path.join(project, '.mnemo-root'), '');
  fs.writeFileSync(path.join(launcher, '.mnemo-root'), '');
  fs.writeFileSync(transcript, JSON.stringify({ cwd: launcher }) + '\n');
  withEnv({ CLAUDE_PROJECT_DIR: undefined }, () => {
    assert.equal(resolveClaude({ cwd: project, transcript_path: transcript }), project);
    assert.equal(resolveClaude({ transcript_path: transcript }), launcher);
    assert.equal(resolveClaude({}), null);
    assert.equal(resolveClaude({ cwd: os.homedir(), transcript_path: transcript }), null);
    const childEnv = { ...process.env };
    delete childEnv.CLAUDE_PROJECT_DIR;
    const encoded = spawnSync(process.execPath, [path.join(repo, 'hooks/mnemo-project-root.js'), '--claude'], {
      input: '\uFEFF\uFEFF' + JSON.stringify({ cwd: project }), env: childEnv, encoding: 'utf8', windowsHide: true,
    });
    assert.equal(encoded.status, 0, 'Windows PowerShell may pipe multiple leading BOM characters');
    assert.equal(encoded.stdout, project);
  });
});

for (const [cli, shell] of [['claude', 'PowerShell'], ['codex', 'PowerShell'], ['claude', 'Bash'], ['codex', 'Bash']]) {
  const isBash = shell === 'Bash';
  const useInstalled = installedMode && !isBash;
  const extension = isBash ? 'sh' : 'ps1';
  test(`${cli} ${useInstalled ? "installed" : "source"} ${shell} hook stores history only inside project and continues after project move`, { skip: isBash ? (!hasBashJq && 'Bash or jq is unavailable') : (!hasPowerShell && 'PowerShell is unavailable') }, t => {
    const { base, project, launcher } = fixture(t);
    const runtime = path.join(base, 'custom-runtime');
    const installed = path.join(runtime, 'hooks');
    fs.mkdirSync(installed, { recursive: true });
    let script = useInstalled ? installedClaude : path.join(repo, 'hooks', `save-conversation.${extension}`);
    if (cli === 'codex' && useInstalled) script = installedCodex;
    if (cli === 'codex' && !useInstalled) {
      fs.cpSync(path.join(repo, 'skills/codex-mnemo/hooks'), installed, { recursive: true });
      fs.copyFileSync(path.join(repo, 'hooks/mnemo-project-root.js'), path.join(installed, 'mnemo-project-root.js'));
      script = path.join(installed, `save-turn.${extension}`);
    }
    assert.ok(fs.existsSync(script), `hook does not exist: ${script}`);
    const env = { ...process.env, CODEX_HOME: isBash ? runtime.replaceAll('\\', '/') : runtime, MNEMO_DISABLE: '0', MNEMO_STRICT: '1' };
    for (const key of ['CLAUDE_PROJECT_DIR', 'CODEX_WORKSPACE_ROOT', 'GROK_HOOK_EVENT']) delete env[key];
    let sequence = 0;
    const invoke = (metadata, text, extraEnv = {}) => {
      const payload = cli === 'claude'
        ? { prompt: text, session_id: 'project-root-test', ...metadata }
        : { 'turn-id': `project-root-test-${++sequence}`, 'input-messages': [text], 'last-assistant-message': 'Project root test response', ...metadata };
      const args = isBash ? [script.replaceAll('\\', '/')] : ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script];
      if (cli === 'codex') {
        const payloadFile = path.join(base, 'payload.json');
        fs.writeFileSync(payloadFile, JSON.stringify(payload));
        args.push(isBash ? payloadFile.replaceAll('\\', '/') : payloadFile);
      }
      const result = spawnSync(isBash ? bash : ps, args, { cwd: launcher, env: { ...env, ...extraEnv }, input: JSON.stringify(payload), encoding: 'utf8', timeout: 30000, windowsHide: true });
      assert.equal(result.status, 0, result.stderr || String(result.error));
    };
    const staleTranscript = path.join(base, 'stale.jsonl');
    fs.writeFileSync(staleTranscript, JSON.stringify({ cwd: launcher }) + '\n');
    invoke({ cwd: launcher }, 'unmarked launcher must not be saved');
    invoke({ project_root: project, cwd: project, transcript_path: staleTranscript }, 'history before move');
    assertScaffold(project, cli, 'history before move');
    assertNoPollution(base, launcher);
    const moved = path.join(base, 'moved-project');
    fs.renameSync(project, moved);
    const subdir = path.join(moved, 'src');
    fs.mkdirSync(subdir);
    invoke({ cwd: subdir }, 'history after move');
    assertScaffold(moved, cli, 'history before move');
    assertScaffold(moved, cli, 'history after move');
    assert.ok(!fs.existsSync(path.join(subdir, 'conversations')));
    invoke({}, 'missing workspace must not be saved');
    invoke({ cwd: runtime }, 'runtime workspace must not be saved');
    assertNoPollution(base, launcher);
    assert.ok(!fs.existsSync(path.join(runtime, 'MEMORY.md')));
    assert.ok(!fs.existsSync(path.join(runtime, 'conversations')));
    const foreign = path.join(base, 'foreign'); fs.mkdirSync(foreign);
    assert.equal(spawnSync('git', ['init', '--quiet', foreign], { windowsHide: true }).status, 0);
    assert.equal(spawnSync('git', ['init', '--quiet', moved], { windowsHide: true }).status, 0);
    invoke({ cwd: subdir }, 'history with inherited Git settings', {
      GIT_DIR: path.join(foreign, '.git'), GIT_WORK_TREE: foreign,
      CLAUDE_PROJECT_DIR: foreign, CODEX_WORKSPACE_ROOT: foreign,
    });
    assertScaffold(moved, cli, 'history with inherited Git settings');
    assert.ok(!fs.existsSync(path.join(foreign, 'conversations')));
  });
}

test('all adapters reject unconfirmed cwd, invalid explicit workspaces and inherited Git redirection', t => {
  const { base, project, launcher } = fixture(t);
  const subdir = path.join(project, 'src'); fs.mkdirSync(subdir);
  assert.equal(spawnSync('git', ['init', '--quiet', project], { windowsHide: true }).status, 0);
  fs.writeFileSync(path.join(subdir, '.mnemo-root'), '');
  const resolvers = [resolveClaude, resolveCodex, resolveGrok, resolveAntigravity];
  withEnv({ GIT_DIR: path.join(launcher, '.git'), GIT_WORK_TREE: launcher, CLAUDE_PROJECT_DIR: undefined, CODEX_WORKSPACE_ROOT: undefined }, () => {
    for (const resolve of resolvers) {
      assert.equal(resolve({ cwd: subdir }), project);
      assert.equal(resolve({ cwd: launcher }), null);
    }
    withEnv({ PATH: '' }, () => assert.equal(resolveRoot(subdir), project, 'Git executable is not required for the filesystem boundary'));
  });
  assert.equal(resolveGrok({ workspaceRoot: os.homedir(), cwd: project }), null);
  assert.equal(resolveAntigravity({ workspacePath: os.homedir(), cwd: project }), null);
  withEnv({ CLAUDE_PROJECT_DIR: launcher, CODEX_WORKSPACE_ROOT: launcher }, () => {
    assert.equal(resolveClaude({ cwd: subdir }), project);
    assert.equal(resolveCodex({ cwd: subdir }), project);
    assert.equal(resolveClaude({}), null);
    assert.equal(resolveCodex({}), null);
  });
  const second = path.join(base, 'second'); fs.mkdirSync(second);
  assert.equal(resolveAntigravity({ workspacePaths: [second, project], cwd: subdir }), project);
  assert.equal(resolveAntigravity({ workspacePaths: [project, second] }), null, 'ambiguous multi-root workspace must not pick the first entry');
});

test('root resolution rejects junctions that take managed storage outside the project', t => {
  const { project, launcher } = fixture(t);
  fs.writeFileSync(path.join(project, '.mnemo-root'), '');
  const link = path.join(project, 'memory');
  fs.symlinkSync(launcher, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(resolveRoot(project), null);
  fs.unlinkSync(link);
  fs.mkdirSync(path.join(project, 'docs'));
  fs.symlinkSync(launcher, path.join(project, 'docs', 'handoffs'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(resolveRoot(project), null);
  assert.deepEqual(fs.readdirSync(launcher), []);
});
