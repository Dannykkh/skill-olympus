const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const repo = path.resolve(__dirname, '../..');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const categories = ['architecture', 'patterns', 'tools', 'gotchas'];
const hooks = ['hooks/save-conversation', 'hooks/save-response',
  'skills/codex-mnemo/hooks/save-turn', 'skills/grok-mnemo/hooks/save-turn']
  .flatMap(file => ['ps1', 'sh'].map(ext => `${file}.${ext}`));
hooks.push('skills/antigravity-mnemo/hooks/save-turn.js');

// Run the shipped scaffold functions, isolating them from log writes and project
// resolution (which deliberately excludes temporary folders).
function execute(file, root) {
  const source = fs.readFileSync(path.join(repo, file), 'utf8').replace(/\r\n/g, '\n');
  const env = { ...process.env, MNEMO_TEST_ROOT: root };
  if (file.endsWith('.js')) {
    const functions = ['ensureFile', 'ensureScaffold'].map(name => {
      const match = source.match(new RegExp(`function ${name}\\([^]*?^}`, 'm'));
      assert.ok(match, name);
      return match[0];
    }).join('\n');
    vm.runInNewContext(`${functions}\nensureScaffold(root, '2026-09-17');`, { fs, path, root });
    return;
  }
  const powershell = file.endsWith('.ps1');
  const match = source.match(powershell
    ? /function Ensure-MemoryScaffold[^]*?^}/m
    : /ensure_memory_scaffold\(\) \{[^]*?^}/m);
  assert.ok(match, file);
  const command = powershell
    ? '$ErrorActionPreference="Stop"; $Utf8NoBom=New-Object System.Text.UTF8Encoding $false;\n' + match[0] + '\nEnsure-MemoryScaffold -BaseDir $env:MNEMO_TEST_ROOT'
    : match[0] + '\nensure_memory_scaffold "$MNEMO_TEST_ROOT"';
  const result = powershell
    ? spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64')], { env, encoding: 'utf8' })
    : spawnSync(bash, ['-c', command], { env, encoding: 'utf8' });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
}

for (const file of hooks) {
  test(`${file}: preserve split memory and route fresh index to canonical files`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mnemo-scaffold-'));
    try {
      for (const category of categories) {
        fs.mkdirSync(path.join(root, 'memory', category), { recursive: true });
        fs.writeFileSync(path.join(root, 'memory', category, 'index.md'), `# ${category}\n\n[결정](decision.md)\n`);
        fs.writeFileSync(path.join(root, 'memory', category, 'decision.md'), '# 보존할 기억\n실제 결정입니다.\n');
      }
      execute(file, root);
      const index = fs.readFileSync(path.join(root, 'MEMORY.md'), 'utf8');
      for (const category of categories) {
        assert.ok(index.includes(`](memory/${category}/index.md)`));
        assert.equal(fs.existsSync(path.join(root, 'memory', `${category}.md`)), false);
        assert.equal(fs.readFileSync(path.join(root, 'memory', category, 'index.md'), 'utf8'), `# ${category}\n\n[결정](decision.md)\n`);
        assert.equal(fs.readFileSync(path.join(root, 'memory', category, 'decision.md'), 'utf8'), '# 보존할 기억\n실제 결정입니다.\n');
      }
      // Existing user-authored index and flat memory must never be rewritten.
      fs.writeFileSync(path.join(root, 'MEMORY.md'), '# 사용자 인덱스\n');
      fs.writeFileSync(path.join(root, 'memory/tools.md'), '# 기존 도구 기억\n');
      execute(file, root);
      assert.equal(fs.readFileSync(path.join(root, 'MEMORY.md'), 'utf8'), '# 사용자 인덱스\n');
      assert.equal(fs.readFileSync(path.join(root, 'memory/tools.md'), 'utf8'), '# 기존 도구 기억\n');
      // An observation-only directory is not a split canonical category.
      fs.unlinkSync(path.join(root, 'memory/patterns/index.md'));
      fs.unlinkSync(path.join(root, 'MEMORY.md'));
      execute(file, root);
      assert.ok(fs.existsSync(path.join(root, 'memory/patterns.md')));
      const mixedIndex = fs.readFileSync(path.join(root, 'MEMORY.md'), 'utf8');
      assert.ok(mixedIndex.includes('](memory/patterns.md)'));
      assert.ok(mixedIndex.includes('](memory/architecture/index.md)'));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
