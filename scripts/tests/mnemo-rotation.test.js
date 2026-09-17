const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repo = path.resolve(__dirname, '../..');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const runtimes = [
  ['claude', 'hooks/save-tool-use', 'hooks/save-response'],
  ['codex', 'skills/codex-mnemo/hooks/save-turn', 'skills/codex-mnemo/hooks/save-turn'],
  ['grok', 'skills/grok-mnemo/hooks/save-turn', 'skills/grok-mnemo/hooks/save-turn'],
];

function execute(source, ext, root, category) {
  const env = { ...process.env, MNEMO_TEST_ROOT: root, MNEMO_TEST_CATEGORY: category };
  const setup = ext === 'ps1'
    ? '$ErrorActionPreference="Stop"; $Root=$env:MNEMO_TEST_ROOT; $targetDir=Join-Path (Join-Path $Root "memory") $env:MNEMO_TEST_CATEGORY; $obsTargetDir=$targetDir; $obsFile=Join-Path $targetDir "observations.jsonl"; $Utf8NoBom=New-Object System.Text.UTF8Encoding $false;\n'
    : 'root="$MNEMO_TEST_ROOT"; TARGET_DIR="$root/memory/$MNEMO_TEST_CATEGORY"; OBS_TARGET_DIR="$TARGET_DIR"; OBS_FILE="$TARGET_DIR/observations.jsonl";\n';
  const result = ext === 'ps1'
    ? spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(setup + source, 'utf16le').toString('base64')], { env, encoding: 'utf8' })
    : spawnSync(bash, ['-c', setup + source], { env, encoding: 'utf8' });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
}

// Execute shipped blocks without running unrelated conversation writes or Chronos.
// The automatic project resolver deliberately rejects temp directories.
for (const [cli, rotationFile, statusFile] of runtimes) {
  for (const ext of ['ps1', 'sh']) {
    const rotation = fs.readFileSync(path.join(repo, `${rotationFile}.${ext}`), 'utf8')
      .split('# MNEMO_ROTATION_START')[1]?.split('# MNEMO_ROTATION_END')[0];
    const statusText = fs.readFileSync(path.join(repo, `${statusFile}.${ext}`), 'utf8');
    const status = ext === 'ps1'
      ? statusText.match(/function Notify-MnemoStatus \{[\s\S]*?^\}/m)?.[0] + '\nNotify-MnemoStatus -Root $Root'
      : statusText.match(/notify_mnemo_status\(\) \{[\s\S]*?^\}/m)?.[0] + '\nnotify_mnemo_status "$root"';

    test(`${cli}/${ext}: rotation preserves backlog and status accepts negative offsets`, () => {
      assert.ok(rotation);
      assert.ok(!status.startsWith('undefined'));
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mnemo-rotation-'));
      const marker = path.join(root, 'memory/.mnemo-distill-offset');
      try {
        for (const category of ['gotchas', 'learned']) fs.mkdirSync(path.join(root, 'memory', category), { recursive: true });
        fs.writeFileSync(marker, '1 2 0');
        let expected = [1, 2, 0];
        for (const category of ['gotchas', 'learned', 'gotchas']) {
          const file = path.join(root, 'memory', category, 'observations.jsonl');
          // 250 records, >10 MiB: warning must survive rotation and a second rotation.
          const payload = (JSON.stringify({ output: 'x'.repeat(44000) }) + '\n').repeat(250);
          fs.writeFileSync(file, payload);
          execute(rotation, ext, root, category);
          expected[category === 'gotchas' ? 0 : 1] -= 250;
          assert.equal(fs.existsSync(file), false);
          assert.deepEqual(fs.readFileSync(marker, 'utf8').trim().split(/\s+/).map(Number), expected);
          const archives = fs.readdirSync(path.join(root, 'memory', category, 'archive'));
          assert.equal(archives.length, category === 'gotchas' && expected[0] < -250 ? 2 : 1);
          assert.ok(archives.every(name => name.endsWith('.jsonl')));
          assert.equal(fs.readFileSync(path.join(root, 'memory', category, 'archive', archives.at(-1)), 'utf8'), payload);
          execute(status, ext, root, category);
          assert.deepEqual(fs.readFileSync(marker, 'utf8').trim().split(/\s+/).map(Number), expected);
          assert.match(fs.readFileSync(path.join(root, 'memory/.mnemo-status.md'), 'utf8'), new RegExp(`\\*\\*${-expected[0] - expected[1]}\\*\\*`));
        }
        // Below the byte threshold, neither log nor baseline changes.
        const small = path.join(root, 'memory/gotchas/observations.jsonl');
        fs.writeFileSync(small, '{}\n');
        execute(rotation, ext, root, 'gotchas');
        assert.equal(fs.readFileSync(small, 'utf8'), '{}\n');
        assert.deepEqual(fs.readFileSync(marker, 'utf8').trim().split(/\s+/).map(Number), expected);
        // Invalid/missing baseline postpones rotation, then status initializes it.
        fs.writeFileSync(small, 'x'.repeat(10485760) + '\n');
        for (const value of ['invalid', null]) {
          if (value === null) fs.unlinkSync(marker); else fs.writeFileSync(marker, value);
          execute(rotation, ext, root, 'gotchas');
          assert.ok(fs.existsSync(small));
          execute(status, ext, root, 'gotchas');
          assert.equal(fs.readFileSync(marker, 'utf8').trim(), '1 0 0');
        }
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
}
