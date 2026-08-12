import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const [projectRoot, workerId, workerProvider, taskId] = process.argv.slice(2);
const distRoot = process.env.ORCHESTRATOR_TEST_DIST;

if (!distRoot || !projectRoot || !workerId || !workerProvider || !taskId || !process.send) {
  throw new Error('claim worker requires dist, project root, worker id, provider, task id, and IPC');
}

const { StateManager } = await import(
  pathToFileURL(join(distRoot, 'services', 'state-manager.js')).href
);
const state = new StateManager(projectRoot, workerId, workerProvider);

process.send({ type: 'ready' });
process.once('message', message => {
  if (message !== 'claim') return;

  let result;
  try {
    result = state.claimTask(taskId);
  } finally {
    state.close();
  }

  process.send({ type: 'result', result }, () => process.disconnect());
});
