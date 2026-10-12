const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Codex save-turn 회귀 테스트:
// - legacy notify는 하위 에이전트 턴에도 실행되고 입력에 표시가 없다. thread-id의 세션 파일
//   session_meta로 하위 에이전트를 알아보고 대화 기록에 저장하지 않는다
// - AGENTS.md·<environment_context> 같은 주입 메시지는 User 턴으로 쓰지 않는다
// - 세션 파일이 없는 실행(임시 codex exec)은 지금처럼 저장한다
const repo = path.resolve(__dirname, '../..');
const hooksDir = path.join(repo, 'skills', 'codex-mnemo', 'hooks');
const ps = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
const bash = process.env.BASH_PATH || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash');
const hasBashJson = spawnSync(bash, ['-c', 'command -v jq >/dev/null || command -v python3 >/dev/null'], { windowsHide: true }).status === 0;
const hasPowerShell = spawnSync(ps, ['-NoProfile', '-Command', 'exit 0'], { windowsHide: true }).status === 0;

const AGENTS_TEXT = '# AGENTS.md instructions for D:\\example\n\n<INSTRUCTIONS>\n## 규칙\n- 답변은 한국어로\n</INSTRUCTIONS>';
const ENV_TEXT = '<environment_context>\n  <cwd>D:\\example</cwd>\n</environment_context>';

function pad(n) { return String(n).padStart(2, '0'); }

function uuidv7(ms) {
  const hex = ms.toString(16).padStart(12, '0');
  const rand = crypto.randomBytes(10).toString('hex');
  const variant = ((parseInt(rand[3], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7${rand.slice(0, 3)}-${variant}${rand.slice(4, 7)}-${rand.slice(7, 19)}`;
}

function fixture(t) {
  // 런타임 훅은 임시 폴더를 저장 위치로 받지 않는다. 이 레포의 Git 경계 밖(형제 폴더)에 만든다.
  const base = fs.mkdtempSync(path.join(path.dirname(repo), '.codex-save-turn-test-'));
  t.after(() => {
    assert.equal(path.dirname(base), path.dirname(repo));
    assert.ok(path.basename(base).startsWith('.codex-save-turn-test-'));
    fs.rmSync(base, { recursive: true, force: true });
  });
  const project = path.join(base, 'project');
  const codexHome = path.join(base, 'codex-home');
  fs.mkdirSync(project);
  // Codex notify는 cwd만 준다. Git 루트나 .mnemo-root 표식이 있어야 저장 위치로 인정된다.
  fs.writeFileSync(path.join(project, '.mnemo-root'), '');
  fs.mkdirSync(path.join(codexHome, 'sessions'), { recursive: true });
  return { base, project, codexHome };
}

function userLine(text) {
  return { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } };
}

function assistantLine(text) {
  return { type: 'response_item', payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] } };
}

// 실제 Codex처럼 sessions/yyyy/MM/dd/rollout-…-<thread-id>.jsonl 에 첫 줄 session_meta를 둔다
// subagent: 'spawn'은 요즘 형태(agent_path·thread_source 포함), 'source-only'는 source 객체만 있는 옛 형태
function writeSession(codexHome, { id, cwd, subagent = false, lines = [], ms = Date.now(), mtime }) {
  const d = new Date(ms);
  const dir = path.join(codexHome, 'sessions', String(d.getFullYear()), pad(d.getMonth() + 1), pad(d.getDate()));
  fs.mkdirSync(dir, { recursive: true });
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  const file = path.join(dir, `rollout-${stamp}-${id}.jsonl`);
  const payload = subagent === 'source-only'
    ? { id, cwd, source: { subagent: { other: {} } } }
    : subagent
      ? { id, cwd, source: { subagent: { thread_spawn: { parent_thread_id: uuidv7(ms - 1000), depth: 1, agent_path: '/root/worker' } } }, agent_path: '/root/worker', thread_source: 'subagent' }
      : { id, cwd, source: 'cli', thread_source: 'user' };
  const all = [{ timestamp: d.toISOString(), type: 'session_meta', payload }, ...lines];
  fs.writeFileSync(file, all.map(o => JSON.stringify(o)).join('\n') + '\n');
  if (mtime) fs.utimesSync(file, mtime, mtime);
  return file;
}

function history(project) {
  const dir = path.join(project, 'conversations');
  if (!fs.existsSync(dir)) return '';
  return fs.readdirSync(dir).filter(name => name.endsWith('-codex.md'))
    .map(name => fs.readFileSync(path.join(dir, name), 'utf8')).join('\n');
}

function debugLog(codexHome) {
  const file = path.join(codexHome, 'hooks', 'save-turn-debug.log');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

for (const shell of ['PowerShell', 'Bash']) {
  const isBash = shell === 'Bash';
  const skip = isBash ? (!hasBashJson && 'Bash or a JSON parser is unavailable') : (!hasPowerShell && 'PowerShell is unavailable');
  const slash = value => (isBash ? value.replaceAll('\\', '/') : value);

  // Codex는 notify 입력 JSON을 마지막 인수로 넘긴다. 따옴표 이스케이프를 피하려고 파일 경로로 넘긴다(훅이 지원).
  function run(fx, payload, { viaStdin = false } = {}) {
    const payloadFile = path.join(fx.base, `payload-${crypto.randomUUID()}.json`);
    const payloadText = JSON.stringify({ type: 'agent-turn-complete', cwd: fx.project, ...payload });
    fs.writeFileSync(payloadFile, payloadText);
    const script = path.join(hooksDir, `save-turn.${isBash ? 'sh' : 'ps1'}`);
    const args = isBash ? [slash(script), slash(payloadFile)] : ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, payloadFile];
    if (viaStdin) args.pop();
    const env = { ...process.env, CODEX_HOME: isBash ? slash(fx.codexHome) : fx.codexHome, MNEMO_DISABLE: '0', CODEX_HOOK_BRIDGE_HOOKS: 'none' };
    for (const key of ['CODEX_WORKSPACE_ROOT', 'MNEMO_STRICT']) delete env[key];
    const result = spawnSync(isBash ? bash : ps, args, { env, input: viaStdin ? payloadText : undefined, encoding: 'utf8', timeout: 60000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr || String(result.error));
  }

  test(`${shell} save-turn accepts stdin payloads with Unicode, private redaction and replay deduplication`, { skip }, t => {
    const fx = fixture(t);
    const payload = {
      'thread-id': uuidv7(Date.now()), 'turn-id': uuidv7(Date.now()),
      'input-messages': ['사용자 질문 <private>user-hidden</private>'],
      'last-assistant-message': '한글 답변 <private>assistant-hidden</private>',
    };
    run(fx, payload, { viaStdin: true });
    const saved = history(fx.project);
    assert.ok(saved.includes('사용자 질문 [PRIVATE]'));
    assert.ok(saved.includes('한글 답변 [PRIVATE]'));
    assert.ok(!saved.includes('user-hidden'));
    assert.ok(!saved.includes('assistant-hidden'));
    run(fx, payload, { viaStdin: true });
    assert.equal(history(fx.project), saved);
  });

  test(`${shell} save-turn preserves every actual user input in the completed turn`, { skip }, t => {
    const fx = fixture(t);
    const payload = {
      'thread-id': uuidv7(Date.now()), 'turn-id': uuidv7(Date.now()),
      'input-messages': [AGENTS_TEXT, '첫 요청: 터널 설정 확인', ENV_TEXT,
        { content: [{ type: 'input_text', text: '추가 질문 <private>hidden-follow-up</private>' }] },
        '<subagent_notification>internal worker report</subagent_notification>', '마지막 수정 요청'],
      'last-assistant-message': '전체 요청을 반영한 최종 답변',
    };
    run(fx, payload);
    const saved = history(fx.project);
    for (const message of ['첫 요청: 터널 설정 확인', '추가 질문 [PRIVATE]', '마지막 수정 요청']) {
      assert.ok(saved.includes(message), `Missing user input: ${message}`);
    }
    assert.ok(saved.indexOf('첫 요청:') < saved.indexOf('추가 질문'));
    assert.ok(saved.indexOf('추가 질문') < saved.indexOf('마지막 수정 요청'));
    assert.ok(!saved.includes('internal worker report'));
    assert.ok(!saved.includes('hidden-follow-up'));
    run(fx, payload);
    assert.equal(history(fx.project), saved);
  });

  test(`${shell} save-turn preserves short answers and literal backslashes`, { skip }, t => {
    const fx = fixture(t);
    run(fx, {
      'thread-id': uuidv7(Date.now()), 'turn-id': uuidv7(Date.now()),
      'input-messages': ['Keep C:\\new\\test and literal \\n text'],
      'last-assistant-message': 'OK',
    });
    const saved = history(fx.project);
    assert.ok(saved.includes('C:\\new\\test and literal \\n text'));
    assert.match(saved, /Assistant\s+OK\s+<!-- turn:/);
  });

  test(`${shell} save-turn skips subagent turns found through the notify thread-id`, { skip }, t => {
    const fx = fixture(t);
    const v7 = uuidv7(Date.now());
    writeSession(fx.codexHome, { id: v7, cwd: fx.project, subagent: true, lines: [userLine(AGENTS_TEXT)] });
    run(fx, { 'thread-id': v7, 'turn-id': uuidv7(Date.now()), 'input-messages': [], 'last-assistant-message': 'Subagent report for the parent thread' });

    // UUIDv7이 아닌 thread id도 전체 검색으로 찾아 거른다
    const v4 = crypto.randomUUID();
    writeSession(fx.codexHome, { id: v4, cwd: fx.project, subagent: true, lines: [userLine(AGENTS_TEXT)] });
    run(fx, { 'thread-id': v4, 'turn-id': crypto.randomUUID(), 'input-messages': [], 'last-assistant-message': 'Second subagent report' });

    // source 객체만 있고 agent_path·thread_source가 없는 형태도 하위 에이전트다 (복구 도구 is_subagent와 같은 규칙)
    const bare = uuidv7(Date.now());
    writeSession(fx.codexHome, { id: bare, cwd: fx.project, subagent: 'source-only' });
    run(fx, { 'thread-id': bare, 'turn-id': uuidv7(Date.now()), 'input-messages': [], 'last-assistant-message': 'Third subagent report' });

    const saved = history(fx.project);
    assert.ok(!saved.includes('Subagent report for the parent thread'));
    assert.ok(!saved.includes('Second subagent report'));
    assert.ok(!saved.includes('Third subagent report'));
    assert.ok(!saved.includes('AGENTS.md instructions'));
    assert.equal((debugLog(fx.codexHome).match(/skip: subagent turn/g) || []).length, 3);
  });

  test(`${shell} save-turn drops injected context from input-messages`, { skip }, t => {
    const fx = fixture(t);
    const id = uuidv7(Date.now());
    writeSession(fx.codexHome, { id, cwd: fx.project });
    run(fx, {
      'thread-id': id, 'turn-id': uuidv7(Date.now()),
      'input-messages': ['Real question from the user', ENV_TEXT],
      'last-assistant-message': 'Answer to the real question',
    });
    const saved = history(fx.project);
    assert.ok(saved.includes('Real question from the user'));
    assert.ok(saved.includes('Answer to the real question'));
    assert.ok(!saved.includes('<environment_context>'));
  });

  // UUIDv7은 id 시각의 날짜 폴더(앞뒤 하루)만 본다. 멀리 떨어진 폴더의 파일까지 찾았다면 전체 검색으로 빠진 것이다.
  test(`${shell} save-turn looks only in the UUIDv7 date folders`, { skip }, t => {
    const fx = fixture(t);
    const now = Date.now();
    const id = uuidv7(now);
    writeSession(fx.codexHome, { id, cwd: fx.project, subagent: true, ms: now + 5 * 86400000 });
    run(fx, { 'thread-id': id, 'turn-id': uuidv7(now), 'input-messages': ['Prompt whose session sits five days away'], 'last-assistant-message': 'Answer saved because the date folder lookup missed it' });
    assert.ok(history(fx.project).includes('Answer saved because the date folder lookup missed it'));
    assert.ok(!debugLog(fx.codexHome).includes('skip: subagent turn'));
  });

  test(`${shell} save-turn still saves turns whose session file does not exist`, { skip }, t => {
    const fx = fixture(t);
    run(fx, {
      'thread-id': uuidv7(Date.now()), 'turn-id': uuidv7(Date.now()),
      'input-messages': ['Prompt from an ephemeral exec run'], 'last-assistant-message': 'Answer from the ephemeral run',
    });
    const saved = history(fx.project);
    assert.ok(saved.includes('Prompt from an ephemeral exec run'));
    assert.ok(saved.includes('Answer from the ephemeral run'));
  });
}

// thread-id가 없는 옛 PowerShell 알림은 같은 cwd의 root 세션을 대체 원천으로 읽는다
test('PowerShell save-turn fallback reads the thread session and skips injected and subagent sessions', { skip: !hasPowerShell && 'PowerShell is unavailable' }, t => {
  const fx = fixture(t);
  const now = Date.now();
  const mainId = uuidv7(now - 60000);
  writeSession(fx.codexHome, {
    id: mainId, cwd: fx.project, ms: now - 60000, mtime: new Date(now - 30000),
    lines: [userLine(AGENTS_TEXT), userLine(ENV_TEXT), userLine('Prompt the user actually typed'), assistantLine('Answer recorded in the main session')],
  });
  // 같은 폴더의 더 최근 세션은 하위 에이전트 세션이다 (예전 대체 경로는 이것을 골라 AGENTS.md를 User로 썼다)
  writeSession(fx.codexHome, { id: uuidv7(now - 20000), cwd: fx.project, subagent: true, ms: now - 20000, lines: [userLine(AGENTS_TEXT), assistantLine('Subagent answer')] });

  const payloadFile = path.join(fx.base, 'payload-fallback.json');
  const runFallback = payload => {
    fs.writeFileSync(payloadFile, JSON.stringify({ type: 'agent-turn-complete', cwd: fx.project, 'input-messages': [], 'last-assistant-message': '', ...payload }));
    const env = { ...process.env, CODEX_HOME: fx.codexHome, MNEMO_DISABLE: '0', CODEX_HOOK_BRIDGE_HOOKS: 'none' };
    delete env.CODEX_WORKSPACE_ROOT;
    const result = spawnSync(ps, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(hooksDir, 'save-turn.ps1'), payloadFile], { env, encoding: 'utf8', timeout: 60000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr || String(result.error));
  };

  // thread-id가 있으면 그 세션을, 없으면 cwd의 최신 세션 중 하위 에이전트가 아닌 것을 읽는다
  runFallback({ 'thread-id': mainId, 'turn-id': uuidv7(now) });
  runFallback({ 'turn-id': uuidv7(now + 1) });

  const saved = history(fx.project);
  assert.equal((saved.match(/Prompt the user actually typed/g) || []).length, 2);
  assert.equal((saved.match(/Answer recorded in the main session/g) || []).length, 2);
  assert.ok(!saved.includes('AGENTS.md instructions'));
  assert.ok(!saved.includes('<environment_context>'));
  assert.ok(!saved.includes('Subagent answer'));
});
