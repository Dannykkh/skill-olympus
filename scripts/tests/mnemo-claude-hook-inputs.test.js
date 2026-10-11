const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Claude Code 훅 입력 필드 회귀 테스트:
// - Stop의 last_assistant_message를 기록 파일(JSONL)보다 먼저 쓴다 (기록 파일이 늦게 쓰이는 경쟁 상태)
// - UserPromptSubmit의 source=system·작업 알림은 User 턴으로 저장하지 않는다
const repo = path.resolve(__dirname, '../..');
const ps = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
const bash = process.env.BASH_PATH || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash');
const hasBashJq = spawnSync(bash, ['-c', 'command -v jq >/dev/null'], { windowsHide: true }).status === 0;
const hasPowerShell = spawnSync(ps, ['-NoProfile', '-Command', 'exit 0'], { windowsHide: true }).status === 0;

function fixture(t) {
  // 런타임 훅은 임시 폴더를 저장 위치로 받지 않는다. 이 레포의 Git 경계 밖(형제 폴더)에 만든다.
  const base = fs.mkdtempSync(path.join(path.dirname(repo), '.mnemo-hook-input-test-'));
  t.after(() => {
    assert.equal(path.dirname(base), path.dirname(repo));
    assert.ok(path.basename(base).startsWith('.mnemo-hook-input-test-'));
    fs.rmSync(base, { recursive: true, force: true });
  });
  const project = path.join(base, 'project');
  fs.mkdirSync(project);
  return { base, project };
}

function assistantLine(uuid, text) {
  return JSON.stringify({ type: 'assistant', uuid, message: { role: 'assistant', content: [{ type: 'text', text }] } });
}

function history(project) {
  const dir = path.join(project, 'conversations');
  if (!fs.existsSync(dir)) return '';
  return fs.readdirSync(dir).filter(name => name.endsWith('-claude.md'))
    .map(name => fs.readFileSync(path.join(dir, name), 'utf8')).join('\n');
}

function indexedUuids(project) {
  const file = path.join(project, 'conversations', '.mnemo-index.json');
  if (!fs.existsSync(file)) return [];
  return Object.values(JSON.parse(fs.readFileSync(file, 'utf8')).claude || {}).flat();
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

for (const shell of ['PowerShell', 'Bash']) {
  const isBash = shell === 'Bash';
  const skip = isBash ? (!hasBashJq && 'Bash or jq is unavailable') : (!hasPowerShell && 'PowerShell is unavailable');
  const slash = value => (isBash ? value.replaceAll('\\', '/') : value);

  function run(hook, payload) {
    const script = path.join(repo, 'hooks', `${hook}.${isBash ? 'sh' : 'ps1'}`);
    const args = isBash ? [slash(script)] : ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script];
    const env = { ...process.env, MNEMO_DISABLE: '0', MNEMO_STRICT: '1' };
    for (const key of ['CLAUDE_PROJECT_DIR', 'GROK_HOOK_EVENT', 'DEVIN_PROJECT_DIR']) delete env[key];
    const result = spawnSync(isBash ? bash : ps, args, {
      input: JSON.stringify(payload), env, encoding: 'utf8', timeout: 30000, windowsHide: true,
    });
    assert.equal(result.status, 0, result.stderr || String(result.error));
  }

  test(`${shell} Stop hook prefers last_assistant_message over a transcript that has not caught up`, { skip }, t => {
    const { base, project } = fixture(t);
    const transcript = path.join(base, 'session.jsonl');
    fs.writeFileSync(transcript, assistantLine('uuid-progress', 'Progress note written before the final answer') + '\n');
    const payload = {
      session_id: 'hook-input-test', project_root: project, cwd: project, transcript_path: slash(transcript),
      last_assistant_message: 'Final answer the transcript has not flushed yet',
    };
    run('save-response', payload);
    const saved = history(project);
    assert.ok(saved.includes('Final answer the transcript has not flushed yet'));
    assert.ok(!saved.includes('Progress note written before the final answer'));
    assert.ok(!indexedUuids(project).includes('uuid-progress'), 'an older line uuid must not mark the final answer');

    // 같은 답으로 다시 불려도(기록 파일이 따라잡은 뒤) 두 번 쓰지 않고 그 줄 uuid를 등록한다
    fs.appendFileSync(transcript, assistantLine('uuid-final', 'Final answer the transcript has not flushed yet') + '\n');
    run('save-response', payload);
    const again = history(project);
    assert.equal(count(again, 'Final answer the transcript has not flushed yet'), 1);
    assert.ok(indexedUuids(project).includes('uuid-final'));
  });

  test(`${shell} Stop hook falls back to the transcript when last_assistant_message is absent`, { skip }, t => {
    const { base, project } = fixture(t);
    const transcript = path.join(base, 'session.jsonl');
    fs.writeFileSync(transcript, [
      assistantLine('uuid-old', 'Earlier answer from the same session'),
      assistantLine('uuid-last', 'Last answer read from the transcript'),
    ].join('\n') + '\n');
    run('save-response', { session_id: 'hook-input-test', project_root: project, cwd: project, transcript_path: slash(transcript) });
    const saved = history(project);
    assert.ok(saved.includes('Last answer read from the transcript'));
    assert.ok(!saved.includes('Earlier answer from the same session'));
    assert.ok(indexedUuids(project).includes('uuid-last'));
  });

  test(`${shell} UserPromptSubmit hook skips machine-injected prompts`, { skip }, t => {
    const { project } = fixture(t);
    const base = { session_id: 'hook-input-test', project_root: project, cwd: project };
    run('save-conversation', { ...base, source: 'system', prompt: 'Peer message injected by the host' });
    run('save-conversation', { ...base, prompt: '<task-notification>\n<task-id>abc</task-id>\n<status>completed</status>\n</task-notification>' });
    run('save-conversation', { ...base, source: 'user', prompt: 'Prompt typed by the user' });
    const saved = history(project);
    assert.ok(saved.includes('Prompt typed by the user'));
    assert.ok(!saved.includes('Peer message injected by the host'));
    assert.ok(!saved.includes('task-notification'));
  });

  // 색인은 Codex 복구 도구와 같이 쓴다. claude 구역만 고치고 다른 구역은 그대로 둬야 한다.
  test(`${shell} Stop hook keeps the other CLI sections of the shared index`, { skip }, t => {
    const { base, project } = fixture(t);
    const conv = path.join(project, 'conversations');
    fs.mkdirSync(conv);
    const others = {
      codex: { '2026-03-07': ['codex-turn-1'], '2026-03-08': ['codex-turn-2', 'codex-turn-3'] },
      codex_aborted: {},
      future_cli: { nested: { ids: [] } },
    };
    fs.writeFileSync(path.join(conv, '.mnemo-index.json'),
      JSON.stringify({ claude: { '2026-01-01': ['uuid-earlier'] }, ...others, version: 1 }, null, 2) + '\n');
    const transcript = path.join(base, 'session.jsonl');
    fs.writeFileSync(transcript, assistantLine('uuid-new', 'Answer saved next to Codex records') + '\n');
    run('save-response', { session_id: 'hook-input-test', project_root: project, cwd: project, transcript_path: slash(transcript) });
    const index = JSON.parse(fs.readFileSync(path.join(conv, '.mnemo-index.json'), 'utf8'));
    for (const [key, value] of Object.entries(others)) assert.deepEqual(index[key], value, `${key} must survive`);
    assert.equal(index.version, 1);
    assert.ok(indexedUuids(project).includes('uuid-earlier'));
    assert.ok(indexedUuids(project).includes('uuid-new'));
  });

  test(`${shell} Stop hook leaves an unreadable index untouched`, { skip }, t => {
    const { base, project } = fixture(t);
    const conv = path.join(project, 'conversations');
    fs.mkdirSync(conv);
    const broken = '{"codex": {"2026-03-07": ["codex-turn-1"]'; // 쓰다 끊긴 파일
    fs.writeFileSync(path.join(conv, '.mnemo-index.json'), broken);
    const transcript = path.join(base, 'session.jsonl');
    fs.writeFileSync(transcript, assistantLine('uuid-new', 'Answer saved while the index is broken') + '\n');
    run('save-response', { session_id: 'hook-input-test', project_root: project, cwd: project, transcript_path: slash(transcript) });
    assert.ok(history(project).includes('Answer saved while the index is broken'));
    assert.equal(fs.readFileSync(path.join(conv, '.mnemo-index.json'), 'utf8'), broken);
    assert.match(fs.readFileSync(path.join(project, '.claude', 'mnemo-errors.log'), 'utf8'), /\[index-(read|write)\]/);
  });
}
