import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { fork } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const distRoot = process.env.ORCHESTRATOR_TEST_DIST;
if (!distRoot) throw new Error('ORCHESTRATOR_TEST_DIST is required');

const { StateManager } = await import(
  pathToFileURL(join(distRoot, 'services', 'state-manager.js')).href
);
const helperPath = join(dirname(fileURLToPath(import.meta.url)), 'helpers', 'claim-worker.mjs');
const prompt = 'Implement the requested isolated change and verify it with focused automated tests before reporting completion.';

function createProject() {
  return mkdtempSync(join(tmpdir(), 'orchestrator-state-'));
}

function removeProject(projectRoot) {
  rmSync(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
}

function createTask(state, id, aiProvider) {
  const result = state.createTask(id, prompt, {
    scope: [`src/${id}/**`],
    ...(aiProvider ? { aiProvider } : {})
  });
  assert.equal(result.success, true, result.message);
}

function waitForWorkerMessage(child, expectedType) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`claim worker timed out waiting for ${expectedType}`)), 10_000);
    const onError = error => {
      clearTimeout(timeout);
      reject(error);
    };
    const onMessage = message => {
      if (message?.type !== expectedType) return;
      clearTimeout(timeout);
      child.off('error', onError);
      child.off('message', onMessage);
      resolve(message);
    };

    child.once('error', onError);
    child.on('message', onMessage);
  });
}

function waitForWorkerExit(child) {
  if (child.exitCode !== null) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('claim worker did not exit')), 10_000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

test('provider-specific tasks are filtered while provider-agnostic tasks remain visible', () => {
  const projectRoot = createProject();
  const owner = new StateManager(projectRoot, 'pm');
  const claude = new StateManager(projectRoot, 'claude-worker-test', 'claude');
  const codex = new StateManager(projectRoot, 'codex-worker-test', 'codex');
  const unknown = new StateManager(projectRoot, 'manual-worker');

  try {
    createTask(owner, 'agnostic');
    createTask(owner, 'claude-only', 'claude');
    createTask(owner, 'codex-only', 'codex');

    assert.deepEqual(
      claude.getAvailableTasks().availableTasks.map(task => task.id).sort(),
      ['agnostic', 'claude-only']
    );
    assert.deepEqual(
      codex.getAvailableTasks().availableTasks.map(task => task.id).sort(),
      ['agnostic', 'codex-only']
    );
    assert.deepEqual(
      unknown.getAvailableTasks().availableTasks.map(task => task.id),
      ['agnostic']
    );
    assert.equal(
      owner.getWorkers().find(worker => worker.id === 'claude-worker-test')?.aiProvider,
      'claude'
    );
    assert.equal(
      owner.getWorkers().find(worker => worker.id === 'codex-worker-test')?.aiProvider,
      'codex'
    );
  } finally {
    unknown.close();
    codex.close();
    claude.close();
    owner.close();
    removeProject(projectRoot);
  }
});

test('existing worker tables are migrated with provider metadata', () => {
  const projectRoot = createProject();
  const stateDir = join(projectRoot, '.orchestrator');
  mkdirSync(stateDir, { recursive: true });
  const database = new Database(join(stateDir, 'orchestrator.db'));
  database.exec(`
    CREATE TABLE workers (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'idle',
      current_task TEXT,
      last_heartbeat TEXT NOT NULL,
      completed_tasks INTEGER NOT NULL DEFAULT 0
    )
  `);
  database.close();

  const state = new StateManager(projectRoot, 'codex-worker-migrated', 'codex');
  try {
    assert.equal(state.getWorkers()[0].aiProvider, 'codex');
  } finally {
    state.close();
    removeProject(projectRoot);
  }
});

test('claim enforces the requested provider and allows provider-agnostic tasks', () => {
  const projectRoot = createProject();
  const owner = new StateManager(projectRoot, 'pm');
  const claude = new StateManager(projectRoot, 'claude-worker-test', 'claude');
  const codex = new StateManager(projectRoot, 'codex-worker-test', 'codex');

  try {
    createTask(owner, 'provider-task', 'codex');
    createTask(owner, 'agnostic-task');

    const mismatch = claude.claimTask('provider-task');
    assert.equal(mismatch.success, false);
    assert.match(mismatch.message, /requires provider 'codex'/);

    assert.equal(codex.claimTask('provider-task').success, true);
    assert.equal(claude.claimTask('agnostic-task').success, true);
  } finally {
    codex.close();
    claude.close();
    owner.close();
    removeProject(projectRoot);
  }
});

test('concurrent claim uses compare-and-set semantics so exactly one worker wins', async () => {
  const projectRoot = createProject();
  const owner = new StateManager(projectRoot, 'pm');
  const children = [];

  try {
    createTask(owner, 'contended-task');

    children.push(...['codex-worker-a', 'codex-worker-b'].map(workerId => fork(
      helperPath,
      [projectRoot, workerId, 'codex', 'contended-task'],
      {
        env: { ...process.env, ORCHESTRATOR_TEST_DIST: distRoot },
        stdio: ['ignore', 'ignore', 'inherit', 'ipc']
      }
    )));

    await Promise.all(children.map(child => waitForWorkerMessage(child, 'ready')));
    const resultMessages = children.map(child => waitForWorkerMessage(child, 'result'));
    for (const child of children) child.send('claim');
    const outcomes = (await Promise.all(resultMessages)).map(message => message.result);
    await Promise.all(children.map(waitForWorkerExit));

    assert.equal(outcomes.filter(outcome => outcome.success).length, 1);
    assert.equal(outcomes.filter(outcome => !outcome.success).length, 1);

    const claimed = owner.getTask('contended-task');
    assert.equal(claimed.status, 'in_progress');
    assert.match(claimed.owner, /^codex-worker-[ab]$/);
  } finally {
    for (const child of children) {
      if (!child.killed && child.exitCode === null) child.kill();
    }
    await Promise.allSettled(children.map(waitForWorkerExit));
    owner.close();
    removeProject(projectRoot);
  }
});
