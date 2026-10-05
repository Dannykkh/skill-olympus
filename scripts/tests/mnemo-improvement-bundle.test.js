const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { bundleImprovement } = require('../../skills/mnemo/scripts/bundle-improvement');

const repo = path.resolve(__dirname, '../..');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mnemo-improvement-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('mnemo-improvement-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}

test('Devin uses shared Claude Mnemo to upgrade and recall its installed producer output', async t => {
  const root = fixture(t);
  const claude = path.join(root, 'claude');
  const devin = path.join(root, 'devin');
  const env = { ...process.env, HOME: root, USERPROFILE: root,
    CLAUDE_CONFIG_DIR: claude, DEVIN_CONFIG_DIR: devin,
    GROK_HOME: path.join(root, 'grok') };
  for (const name of ['mnemo', 'devin-mnemo']) {
    const run = spawnSync(process.execPath, [path.join(repo, 'skills', name, 'install.js'), '--force'],
      { env, cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(run.status, 0, run.stderr + run.stdout);
  }
  const project = path.join(root, 'devin-chat');
  fs.mkdirSync(path.join(project, '.git'), { recursive: true });
  const db = path.join(project, 'sessions.db');
  function python(args) {
    const run = spawnSync('python', ['-B', '-X', 'utf8', ...args],
      { env, cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(run.status, 0, run.stderr + run.stdout);
    return run.stdout;
  }
  python(['-c', "import sqlite3,sys; db=sqlite3.connect(sys.argv[1]); db.execute('create table message_nodes (row_id integer primary key, session_id text, chat_message text, created_at integer)'); db.commit()", db]);
  const { saveEvent } = require(path.join(devin, 'hooks/devin-mnemo-save-turn.js'));
  const payload = { session_id: 'fixture-devin', prompt_id: 'turn-1' };
  assert.equal(await saveEvent({ ...payload, hook_event_name: 'UserPromptSubmit',
    prompt: '왜 기차로 가기로 했지? <private>private-fixture</private>' }, { root: project, db }), true);
  python(['-c', "import sqlite3,json,sys,time; db=sqlite3.connect(sys.argv[1]); db.execute('insert into message_nodes values (1,?,?,?)',(sys.argv[2],json.dumps({'role':'assistant','message_id':'answer-1','content':sys.argv[3]}),int(time.time()))); db.commit()",
    db, payload.session_id, '아이의 멀미 때문이에요.\n#tags: 가족여행']);
  assert.equal(await saveEvent({ ...payload, hook_event_name: 'Stop' }, { root: project, db }), true);
  const filename = fs.readdirSync(path.join(project, 'conversations')).find(name => name.endsWith('-devin.md'));
  assert.ok(filename, 'the installed Devin producer must create its conversation');
  const text = fs.readFileSync(path.join(project, 'conversations', filename), 'utf8');
  const userLine = text.split('\n').findIndex(line => /^## \[.*?\] User/.test(line)) + 1;
  assert.ok(userLine > 0);
  const memory = path.join(project, 'memory/architecture/001-travel.md');
  fs.writeFileSync(memory, '# 여행 조건\ntags: 가족여행, 기차, 멀미\ndate: 2026-01-01\nsource: codex\n\n' +
    `- **참조**: [대화](conversations/${filename}#L${userLine})\n`);
  const scripts = path.join(claude, 'skills/mnemo/scripts');
  python([path.join(scripts, 'mnemo_doctor.py'), '--project-root', project, '--upgrade-memory']);
  assert.ok(fs.readFileSync(memory, 'utf8').includes(`evidence: conversations/${filename}#L${userLine}`));
  const recalled = JSON.parse(python([path.join(scripts, 'recall.py'), '--project-root', project,
    '--term', 'arch:001', '--scope', 'memory']));
  const actual = recalled.results.find(result => result.path.endsWith('-devin.md') && result.via === 'evidence');
  assert.ok(actual, 'the shared recall tool must follow the upgraded Devin evidence');
  assert.match(actual.content, /왜 기차로/);
  assert.match(actual.content, /아이의 멀미/);
  assert.doesNotMatch(actual.content, /private-fixture/);
});

for (const name of ['mnemo', 'codex-mnemo', 'antigravity-mnemo', 'grok-mnemo']) {
  test(`${name}: standalone installer includes project improvement without library sync`, t => {
    const root = fixture(t);
    const claude = path.join(root, 'claude');
    const codex = path.join(root, 'codex');
    const google = path.join(root, 'google');
    const destinations = {
      mnemo: path.join(claude, 'skills/mnemo'),
      'codex-mnemo': path.join(codex, 'skills/codex-mnemo'),
      'antigravity-mnemo': path.join(google, 'antigravity-cli/skills/antigravity-mnemo'),
      'grok-mnemo': path.join(claude, 'skills/grok-mnemo'),
    };
    const env = { ...process.env, HOME: root, USERPROFILE: root,
      CLAUDE_CONFIG_DIR: claude, CODEX_HOME: codex, ANTIGRAVITY_HOME: google,
      GROK_HOME: path.join(root, 'grok') };
    const run = spawnSync(process.execPath, [path.join(repo, 'skills', name, 'install.js'), '--force'],
      { env, cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(run.status, 0, run.stderr + run.stdout);
    const dest = destinations[name];
    for (const relative of ['references/self-improvement.md', 'references/project-skill-improvement.md',
      'references/project-storage.md', 'references/session-learning.md',
      'references/project-skill-evaluation.md', 'references/recall.md',
      'scripts/recall.py', 'scripts/mnemo_markdown.py', 'scripts/mnemo_project_root.py',
      'scripts/mnemo_doctor.py', 'scripts/check_memory_anchors.py', 'scripts/harvest_lineage.py',
      'scripts/reclassify_observations.py', 'docs/memory-hygiene.md',
      'hooks/mnemo-project-root.js']) {
      assert.ok(fs.existsSync(path.join(dest, relative)), `${name}: ${relative}`);
    }
    assert.equal(fs.existsSync(path.join(dest, 'internal')), false);
    const project = path.join(root, 'chat-project');
    fs.mkdirSync(path.join(project, 'conversations'), { recursive: true });
    fs.writeFileSync(path.join(project, '.mnemo-root'), '');
    fs.writeFileSync(path.join(project, 'conversations/2026-01-01-codex.md'),
      '## [09:00:00] User\n왜 기차로 가기로 했지?\n## [09:01:00] Assistant\n아이의 멀미 때문이에요.\n#tags: 가족여행\n');
    if (name === 'grok-mnemo') {
      // Use the installed producer's real prefix markers and consecutive replies.
      const payloads = [
        { hookEventName: 'user_prompt_submit', prompt: '아이도 함께 가는 이유를 기억해 줘.' },
        { hookEventName: 'stop', reason: 'end_turn', lastAssistantMessage: '처음 조건입니다.\n#tags: 예전조건' },
        { hookEventName: 'stop', reason: 'end_turn', lastAssistantMessage: '멀미 때문에 기차로 갑니다.\n#tags: 가족여행' },
      ];
      for (const [i, payload] of payloads.entries()) {
        const saved = spawnSync(process.execPath, [path.join(env.GROK_HOME, 'hooks/grok-mnemo-append-event.js'), project],
          { env: { ...env, MNEMO_DISABLE: '0' }, cwd: root, encoding: 'utf8', timeout: 30000,
            windowsHide: true, input: JSON.stringify({ ...payload, sessionId: 'fixture', eventId: `event-${i}` }) });
        assert.equal(saved.status, 0, saved.stderr);
        assert.equal(saved.stdout, 'saved');
      }
    }
    const recall = spawnSync('python', ['-B', path.join(dest, 'scripts/recall.py'),
      '--project-root', project, '--term', '가족여행'],
      { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(recall.status, 0, `${name}: ${recall.stderr}`);
    const parsed = JSON.parse(recall.stdout);
    const result = parsed.results.find(r => r.path === 'conversations/2026-01-01-codex.md');
    assert.ok(result, 'fixture conversation should be recalled');
    assert.match(result.content, /왜 기차로/);
    assert.match(result.content, /아이의 멀미/);
    if (name === 'grok-mnemo') {
      const actual = parsed.results.find(r => r.path.endsWith('-grok.md'));
      assert.ok(actual, 'installed Grok conversation should be recalled');
      assert.match(actual.content, /아이도 함께/);
      assert.match(actual.content, /처음 조건/);
      assert.match(actual.content, /멀미 때문에/);
    }
    assert.equal(fs.existsSync(path.join(project, 'MEMORY.md')), false);
    const memory = path.join(project, 'memory/architecture/001-travel.md');
    fs.mkdirSync(path.dirname(memory), { recursive: true });
    fs.writeFileSync(memory, '# 여행 조건\ntags: 가족여행, 기차, 멀미\ndate: 2026-01-01\nsource: codex\n\n' +
      '- **참조**: [대화](conversations/2026-01-01-codex.md#L1)\n');
    const doctor = spawnSync('python', ['-B', path.join(dest, 'scripts/mnemo_doctor.py'),
      '--project-root', project, '--upgrade-memory'],
      { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(doctor.status, 0, `${name}: ${doctor.stderr}\n${doctor.stdout}`);
    assert.match(fs.readFileSync(memory, 'utf8'), /evidence: conversations\/2026-01-01-codex.md#L1/);
    const linked = spawnSync('python', ['-B', path.join(dest, 'scripts/recall.py'),
      '--project-root', project, '--term', 'arch:001', '--scope', 'memory'],
      { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(linked.status, 0, linked.stderr);
    assert.ok(JSON.parse(linked.stdout).results.some(r => r.via === 'evidence' && /아이의 멀미/.test(r.content)),
      `${name}: upgraded legacy evidence must be followed by the installed recall tool`);
  });
  test(`${name}: isolated package can rebundle without other skills or catalog`, t => {
    const root = fixture(t);
    const installed = path.join(root, name);
    bundleImprovement(path.join(repo, 'skills', name), installed);
    const required = [
      'SKILL.md', 'references/self-improvement.md', 'references/project-skill-improvement.md',
      'references/session-learning.md', 
      'references/project-skill-evaluation.md',
      'references/recall.md', 'scripts/recall.py', 'scripts/mnemo_markdown.py',
      'scripts/mnemo_project_root.py', 'hooks/mnemo-project-root.js',
      'scripts/mnemo_doctor.py', 'docs/memory-hygiene.md',
    ];
    const before = required.map(f => fs.readFileSync(path.join(installed, f)));
    // Run the copied helper in a new process: no repository module imports.
    const second = path.join(root, 'second');
    const run = spawnSync(process.execPath, ['-e',
      'require(process.argv[1]).bundleImprovement(process.argv[2],process.argv[3])',
      path.join(installed, 'scripts/bundle-improvement.js'), installed, second],
      { encoding: 'utf8', windowsHide: true });
    assert.equal(run.status, 0, run.stderr);
    for (const [i, file] of required.entries()) {
      assert.deepEqual(fs.readFileSync(path.join(second, file)), before[i]);
    }
    assert.equal(fs.existsSync(path.join(installed, 'internal')), false);
    bundleImprovement(installed, installed); // in-place reinstall
    for (const [i, file] of required.entries()) {
      assert.deepEqual(fs.readFileSync(path.join(installed, file)), before[i]);
    }
    // A partial package must not silently fall back to the user's global skills.
    fs.unlinkSync(path.join(installed, 'references/project-skill-evaluation.md'));
    const broken = path.join(root, 'broken');
    assert.throws(() => bundleImprovement(installed, broken));
    assert.equal(fs.existsSync(broken), false);
  });
}
