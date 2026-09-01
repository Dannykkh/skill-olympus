import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const powershell = readFileSync(join(process.cwd(), 'scripts', 'spawn-worker.ps1'), 'utf8');
const shell = readFileSync(join(process.cwd(), 'scripts', 'spawn-worker.sh'), 'utf8');
const launcher = readFileSync(join(process.cwd(), 'scripts', 'launch.ps1'), 'utf8');
const serverSource = readFileSync(join(process.cwd(), 'src', 'index.ts'), 'utf8');
const launchers = `${powershell}\n${shell}\n${launcher}\n${serverSource}`;

test('worker launchers propagate the selected provider into the MCP environment', () => {
  assert.match(powershell, /\$env:ORCHESTRATOR_AI_PROVIDER\s*=\s*\$AIProvider/);
  assert.match(shell, /export ORCHESTRATOR_AI_PROVIDER="\$AI_PROVIDER"/);
  assert.match(launcher, /ORCHESTRATOR_AI_PROVIDER\s*=\s*\$AIProvider/);
  assert.doesNotMatch(powershell, /\$AIProvider\s*=\s*"claude"/);
  assert.doesNotMatch(shell, /AI_PROVIDER="\$\{4:-claude\}"/);
});

test('worker launchers keep automatic execution inside provider safety boundaries', () => {
  for (const launchScript of [powershell, shell]) {
    assert.match(launchScript, /claude[^\r\n]*--permission-mode auto/);
    assert.match(launchScript, /codex --approve-for-me --sandbox workspace-write exec/);
    assert.match(launchScript, /agy[^\r\n]*--output-format text/);
    assert.doesNotMatch(launchScript, /agy[^\r\n]*--dangerously-skip-permissions/);
  }

  assert.match(launcher, /claude --permission-mode auto/);
  assert.match(launcher, /codex --approve-for-me --sandbox workspace-write/);
  assert.match(launcher, /"agy"/);
  assert.doesNotMatch(launcher, /agy --dangerously-skip-permissions/);

  assert.doesNotMatch(
    launchers,
    /dangerously-bypass|ExecutionPolicy[^\r\n]*Bypass|\bcodex\s+-a\s+never|agy[^\r\n]*--skip-trust/
  );
});

test('legacy launcher also fails closed and uses the first detected provider deterministically', () => {
  assert.match(launcher, /if \(\$availableProviders\.Count -eq 0\)/);
  assert.match(launcher, /\$defaultProvider = \$availableProviders\[0\]/);
  assert.doesNotMatch(launcher, /Single Mode \(Claude|Claude 전용|라운드 로빈/);
  assert.doesNotMatch(launcher, /finished successfully/i);
});

test('worker launchers explicitly guard every provider exit status', () => {
  assert.match(shell, /set -euo pipefail/);
  assert.equal((powershell.match(/\$providerExitCode = \$LASTEXITCODE/g) || []).length, 2);
  assert.match(powershell, /ExitCode = \$exitCode/);
  assert.match(powershell, /if \(\$providerExitCode -ne 0\)/);
  assert.match(powershell, /Stop-Job \$job -ErrorAction SilentlyContinue/);
  assert.doesNotMatch(powershell, /Stop-Job \$job -Force/);
});

const bashAvailable = spawnSync('bash', ['--version'], { stdio: 'ignore' }).status === 0;
const powershellCommand = process.platform === 'win32' ? 'powershell' : 'pwsh';
const powershellAvailable = spawnSync(
  powershellCommand,
  ['-NoProfile', '-Command', 'exit 0'],
  { stdio: 'ignore' }
).status === 0;

function withFailureStubs(run) {
  const root = mkdtempSync(join(process.cwd(), '.orchestrator-launch-failure-'));
  const bin = join(root, 'bin');
  const project = join(root, 'project');
  mkdirSync(bin);
  mkdirSync(project);

  try {
    run({ bin, project });
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}

function writeFailureStub(bin, provider, exitCode) {
  const shellStub = join(bin, provider);
  writeFileSync(shellStub, `#!/bin/sh\nexit ${exitCode}\n`, 'utf8');
  chmodSync(shellStub, 0o755);
  writeFileSync(join(bin, `${provider}.cmd`), `@echo off\r\nexit /b ${exitCode}\r\n`, 'utf8');
}

function toRelativeShellPath(filePath) {
  return `./${relative(process.cwd(), filePath).replaceAll('\\', '/')}`;
}

test('shell worker propagates each provider failure and never logs success', { skip: !bashAvailable }, () => {
  withFailureStubs(({ bin, project }) => {
    for (const [provider, command, exitCode] of [['claude', 'claude', 31], ['codex', 'codex', 32], ['antigravity', 'agy', 33]]) {
      writeFailureStub(bin, command, exitCode);
      const result = spawnSync(
        'bash',
        [
          '-c',
          `export PATH="${toRelativeShellPath(bin)}:$PATH"; ` +
            `exec bash scripts/spawn-worker.sh "failure-${provider}" . 1 "${provider}" ""`
        ],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: process.env
        }
      );

      assert.equal(result.status, exitCode, `${provider}: ${result.stderr}`);
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /finished successfully/i);
    }
  });
});

test('PowerShell worker propagates each provider failure and never logs success', { skip: !powershellAvailable }, () => {
  withFailureStubs(({ bin, project }) => {
    for (const [provider, command, exitCode] of [['claude', 'claude', 41], ['codex', 'codex', 42], ['antigravity', 'agy', 43]]) {
      writeFailureStub(bin, command, exitCode);
      const result = spawnSync(
        powershellCommand,
        [
          '-NoProfile',
          '-File', join(process.cwd(), 'scripts', 'spawn-worker.ps1'),
          '-WorkerId', `failure-${provider}`,
          '-ProjectRoot', project,
          '-AutoTerminate', '1',
          '-AIProvider', provider,
          '-LogFile', ''
        ],
        {
          encoding: 'utf8',
          env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH || ''}` }
        }
      );

      assert.equal(result.status, exitCode, `${provider}: ${result.stderr}`);
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /finished successfully/i);
    }
  });
});
