import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const distRoot = process.env.ORCHESTRATOR_TEST_DIST;
if (!distRoot) throw new Error('ORCHESTRATOR_TEST_DIST is required');

const detector = await import(pathToFileURL(join(distRoot, 'services', 'ai-detector.js')).href);
const provider = (name, available) => ({
  name,
  available,
  command: name,
  strengths: []
});

test('single-provider detection names the provider that is actually available', () => {
  const result = detector.buildDetectionResult([
    provider('claude', false),
    provider('codex', true),
    provider('gemini', false)
  ]);

  assert.equal(result.mode, 'single');
  assert.equal(result.availableCount, 1);
  assert.match(result.modeDescription, /codex only/i);
  assert.doesNotMatch(result.modeDescription, /claude only/i);
});

test('no-provider detection reports a distinct unavailable mode', () => {
  const result = detector.buildDetectionResult([
    provider('claude', false),
    provider('codex', false),
    provider('gemini', false)
  ]);

  assert.equal(result.mode, 'none');
  assert.equal(result.availableCount, 0);
  assert.match(result.modeDescription, /no supported ai provider/i);
});

test('omitted worker providers use the first detected provider in canonical order', () => {
  const result = detector.selectWorkerProviders(3, undefined, ['gemini', 'codex']);

  assert.equal(result.success, true);
  assert.deepEqual(result.providers, ['codex', 'codex', 'codex']);
});

test('missing requested slots use the first detected provider', () => {
  const result = detector.selectWorkerProviders(3, ['gemini'], ['codex', 'gemini']);

  assert.equal(result.success, true);
  assert.deepEqual(result.providers, ['gemini', 'codex', 'codex']);
});

test('worker selection fails closed for unavailable or absent providers', () => {
  const unavailable = detector.selectWorkerProviders(1, ['claude'], ['codex']);
  const absent = detector.selectWorkerProviders(1, undefined, []);

  assert.equal(unavailable.success, false);
  assert.match(unavailable.message, /claude/);
  assert.equal(absent.success, false);
  assert.deepEqual(absent.providers, []);
});

test('worker provider resolves from explicit metadata before the worker id', () => {
  assert.equal(detector.resolveWorkerProvider('codex-worker-1', 'gemini'), 'gemini');
  assert.equal(detector.resolveWorkerProvider('codex-worker-1'), 'codex');
  assert.equal(detector.resolveWorkerProvider('manual-worker'), undefined);
  assert.throws(
    () => detector.resolveWorkerProvider('codex-worker-1', 'other'),
    /unsupported worker provider/i
  );
});

test('provider command guidance never adds approval bypass flags or a Claude fallback', () => {
  assert.equal(detector.getProviderStrengths, undefined);
  assert.equal(detector.getProviderCommand('claude'), 'claude');
  assert.equal(detector.getProviderCommand('codex'), 'codex');
  assert.equal(detector.getProviderCommand('gemini'), 'gemini');
  assert.throws(() => detector.getProviderCommand('other'), /unsupported ai provider/i);

  for (const providerName of ['claude', 'codex', 'gemini']) {
    const command = detector.getProviderCommand(providerName);
    assert.doesNotMatch(command, /dangerously|yolo|approval|\-a never/i);
  }
});
