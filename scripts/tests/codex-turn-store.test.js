const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { prepareTurn, storeTurn } = require('../../skills/codex-mnemo/hooks/store-turn.js');
const repo = path.resolve(__dirname, '../..');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(path.dirname(repo), '.codex-turn-store-test-'));
  fs.writeFileSync(path.join(dir, '.mnemo-root'), '');
  t.after(() => {
    assert.equal(path.dirname(dir), path.dirname(repo));
    assert.ok(path.basename(dir).startsWith('.codex-turn-store-test-'));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
function payload(id, prompt = '사용자 요청') {
  return { 'turn-id': id, 'input-messages': [prompt], 'last-assistant-message': 'OK' };
}
function history(root) {
  return fs.readdirSync(path.join(root, 'conversations')).filter(n => n.endsWith('-codex.md'))
    .map(n => fs.readFileSync(path.join(root, 'conversations', n), 'utf8')).join('\n');
}
function pending(root) {
  return fs.readdirSync(path.join(root, 'conversations', '.mnemo-pending')).filter(n => n.endsWith('.json'));
}

test('concurrent Codex processes store complete records and deduplicate replayed turns', async t => {
  const root = fixture(t);
  const helper = path.join(repo, 'skills/codex-mnemo/hooks/store-turn.js');
  const ids = [...Array(10)].map((_, i) => `concurrent-${i}`);
  const runs = [...ids, ...ids.slice(0, 3)].map(id => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [helper, root], { windowsHide: true });
    let output = '', error = '';
    child.stdout.on('data', b => { output += b; });
    child.stderr.on('data', b => { error += b; });
    child.on('error', reject);
    child.on('close', code => {
      try { assert.equal(code, 0, error || output); resolve(JSON.parse(output)); } catch (e) { reject(e); }
    });
    child.stdin.end(JSON.stringify(payload(id, `Prompt ${id}`)));
  }));
  const results = await Promise.all(runs);
  assert.ok(results.every(r => ['saved', 'duplicate'].includes(r.status)), JSON.stringify(results));
  const saved = history(root);
  assert.equal((saved.match(/^date: /gm) || []).length, 1);
  for (const id of ids) {
    assert.equal(saved.split(`<!-- turn:${id} -->`).length - 1, 1);
    assert.ok(saved.includes(`Prompt ${id}\n\n## [`));
  }
  assert.equal(pending(root).length, 0);
});

test('storage validation tolerates a pending file disappearing during a concurrent flush', t => {
  const root = fixture(t);
  const target = path.join(root, 'conversations', 'disappearing.json');
  fs.mkdirSync(path.dirname(target)); fs.writeFileSync(target, '{}');
  const original = fs.statSync;
  let removed = false;
  fs.statSync = function(file, ...args) {
    if (!removed && file === target) { removed = true; fs.unlinkSync(target); }
    return original(file, ...args);
  };
  try { assert.equal(require('../../hooks/mnemo-project-root.js').resolveRoot(root), root); }
  finally { fs.statSync = original; }
  assert.equal(removed, true);
});

test('storage validation rechecks an unlinked Windows file resolved into NTFS deleted storage', t => {
  const root = fixture(t),target=path.join(root,'conversations','deleted.json');
  fs.mkdirSync(path.dirname(target)); fs.writeFileSync(target,'{}');
  const original=fs.realpathSync.native;
  let removed=false;
  fs.realpathSync.native=function(file,...args) {
    if (!removed && file===target) {
      removed=true; fs.unlinkSync(target);
      return path.join(path.parse(root).root,'$Extend','$Deleted','removed-test-object');
    }
    return original(file,...args);
  };
  try {assert.equal(require('../../hooks/mnemo-project-root.js').resolveRoot(root),root);}
  finally {fs.realpathSync.native=original;}
  assert.equal(removed,true);
});

// Windows는 삭제·이름 변경 중인 항목에 ENOENT 대신 EBADF(realpath)·EPERM(readdir)을 돌려준다.
for (const [label, owner, name, code, make, remove] of [
  ['a pending file that reports EBADF', fs.realpathSync, 'native', 'EBADF',
    t => { fs.mkdirSync(path.dirname(t), { recursive: true }); fs.writeFileSync(t, '{}'); }, t => fs.unlinkSync(t)],
  ['a lock folder that reports EPERM', fs, 'readdirSync', 'EPERM',
    t => { fs.mkdirSync(t, { recursive: true }); fs.writeFileSync(path.join(t, 'owner.json'), '{}'); }, t => fs.rmSync(t, { recursive: true })],
]) {
  test(`storage validation rechecks ${label} while another process deletes it`, t => {
    const root = fixture(t);
    const target = path.join(root, 'conversations', code === 'EBADF' ? '.mnemo-pending/queued.json' : '.mnemo-write.lock');
    make(target);
    const original = owner[name];
    let removed = false;
    owner[name] = function(file, ...args) {
      if (!removed && file === target) { removed = true; remove(target); throw Object.assign(new Error(`${code}: injected`), { code }); }
      return original.call(this, file, ...args);
    };
    try { assert.equal(require('../../hooks/mnemo-project-root.js').resolveRoot(root), root); }
    finally { owner[name] = original; }
    assert.equal(removed, true);
  });
}

test('storage validation still rejects an entry that keeps reporting EPERM', t => {
  const root = fixture(t);
  const target = path.join(root, 'conversations', 'unreadable');
  fs.mkdirSync(target, { recursive: true });
  const original = fs.readdirSync;
  fs.readdirSync = function(file, ...args) {
    if (file === target) throw Object.assign(new Error('EPERM: injected'), { code: 'EPERM' });
    return original.call(this, file, ...args);
  };
  try { assert.equal(require('../../hooks/mnemo-project-root.js').resolveRoot(root), null); }
  finally { fs.readdirSync = original; }
});

test('partial write failure rolls back before retrying the complete record', async t => {
  const root = fixture(t);
  const original = fs.writeSync;
  let failed = false;
  fs.writeSync = function(fd, buffer, ...args) {
    if (!failed && Buffer.isBuffer(buffer) && buffer.toString().startsWith('---\ndate:')) {
      failed = true;
      original(fd, buffer, 0, Math.floor(buffer.length / 2));
      throw Object.assign(new Error('injected partial write failure'), { code: 'EIO' });
    }
    return original(fd, buffer, ...args);
  };
  let result;
  try { result = await storeTurn(root, payload('partial-write')); }
  finally { fs.writeSync = original; }
  assert.equal(failed, true);
  assert.equal(result.status, 'saved');
  assert.equal(history(root).split('<!-- turn:partial-write -->').length - 1, 1);
  assert.equal((history(root).match(/^date: /gm) || []).length, 1);
  assert.equal(pending(root).length, 0);
});

test('a Windows file lock keeps a private-redacted pending turn and the next notify flushes it', { skip: process.platform !== 'win32' }, async t => {
  const root = fixture(t);
  await storeTurn(root, payload('existing'));
  const file = fs.readdirSync(path.join(root, 'conversations')).find(n => n.endsWith('-codex.md'));
  const target = path.join(root, 'conversations', file);
  const script = path.join(root, 'hold-lock.ps1');
  fs.writeFileSync(script, '$f=[IO.File]::Open($args[0],"Open","ReadWrite","None"); [Console]::WriteLine("LOCKED"); [Console]::Out.Flush(); [Console]::In.ReadLine() | Out-Null; $f.Dispose()');
  const child = spawn('powershell.exe', ['-NoProfile', '-File', script, target], { windowsHide: true });
  const closed = once(child, 'close');
  await once(child.stdout, 'data');
  let result;
  try {
    result = await storeTurn(root, payload('locked-turn', '질문 <private>never-persist</private>'));
    assert.equal(result.status, 'pending');
    assert.match(result.error, /EPERM|EACCES|EBUSY/);
    assert.equal(pending(root).length, 1);
    const queued = fs.readFileSync(result.pendingFile, 'utf8');
    assert.ok(queued.includes('[PRIVATE]'));
    assert.ok(!queued.includes('never-persist'));
  } finally { child.stdin.end('\n'); await closed; }
  assert.ok(!history(root).includes('<!-- turn:locked-turn -->'));
  const resumed = await storeTurn(root, payload('next-turn'));
  assert.equal(resumed.status, 'saved');
  assert.equal(resumed.savedCount, 2);
  assert.ok(history(root).includes('<!-- turn:locked-turn -->'));
  assert.equal(pending(root).length, 0);
  const replay = await storeTurn(root, payload('locked-turn', '질문 <private>never-persist</private>'));
  assert.equal(replay.status, 'duplicate');
  assert.equal(history(root).split('<!-- turn:locked-turn -->').length - 1, 1);
});

test('rollout fallback reads only the notified turn and preserves all its user messages', t => {
  const root = fixture(t);
  const file = path.join(root, 'rollout.jsonl');
  const event = (type, fields) => ({ type: 'event_msg', payload: { type, ...fields } });
  fs.writeFileSync(file, [
    { type: 'session_meta', payload: { source: 'cli' } },
    event('task_started', { turn_id: 'earlier' }),
    event('user_message', { message: 'unrelated earlier request' }),
    event('task_complete', { turn_id: 'earlier', last_agent_message: 'old answer' }),
    event('task_started', { turn_id: 'wanted' }),
    event('user_message', { message: '첫 질문' }),
    event('user_message', { message: '추가 질문' }),
    event('user_message', { message: '<subagent_notification>ignore</subagent_notification>' }),
    event('task_complete', { turn_id: 'wanted', last_agent_message: '새 답변' }),
    event('task_started', { turn_id: 'later' }),
    event('user_message', { message: 'unrelated later request' }),
  ].map(v => JSON.stringify(v)).join('\n'));
  const prepared = prepareTurn({ 'turn-id': 'wanted' }, file);
  assert.equal(prepared.userCount, 2);
  assert.ok(prepared.userText.includes('첫 질문'));
  assert.ok(prepared.userText.includes('추가 질문'));
  assert.ok(!prepared.userText.includes('unrelated'));
  assert.equal(prepared.response, '새 답변');
  assert.equal(prepareTurn({ 'turn-id': 'missing' }, file).userCount, 0);
});
