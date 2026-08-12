import { mkdtempSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(process.cwd());
const outputRoot = mkdtempSync(join(packageRoot, '.orchestrator-test-dist-'));

try {
  const typeScript = join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc');
  const compile = spawnSync(
    process.execPath,
    [typeScript, '--outDir', outputRoot, '--declaration', 'false', '--declarationMap', 'false', '--sourceMap', 'false'],
    { cwd: process.cwd(), encoding: 'utf8' }
  );

  if (compile.status !== 0) {
    process.stderr.write(compile.stdout || '');
    process.stderr.write(compile.stderr || '');
    process.exitCode = compile.status ?? 1;
  } else {
    const tests = spawnSync(
      process.execPath,
      [
        '--test',
        'tests/documentation-contract.test.mjs',
        'tests/provider-routing.test.mjs',
        'tests/state-manager.test.mjs',
        'tests/worker-launch-contract.test.mjs'
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, ORCHESTRATOR_TEST_DIST: outputRoot },
        encoding: 'utf8'
      }
    );

    process.stdout.write(tests.stdout || '');
    process.stderr.write(tests.stderr || '');
    process.exitCode = tests.status ?? 1;
  }
} finally {
  if (dirname(outputRoot) !== packageRoot || !basename(outputRoot).startsWith('.orchestrator-test-dist-')) {
    throw new Error(`Refusing to remove unexpected test output path: ${outputRoot}`);
  }
  rmSync(outputRoot, { recursive: true, force: true });
}
