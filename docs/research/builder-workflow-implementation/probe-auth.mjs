// Exploratory follow-up to run-01's finding; not part of the frozen primary score.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { serve } from './test-support.mjs';

if (!process.env.EVAL_WORKSPACE) throw new Error('EVAL_WORKSPACE is required');
if (!['pagination', 'refunds'].includes(process.env.EVAL_CASE)) throw new Error('EVAL_CASE must be pagination or refunds');
const { createService } = await import(pathToFileURL(resolve(process.env.EVAL_WORKSPACE, 'service.mjs')));

for (const token of ['toString', 'constructor', '__proto__']) {
  test(`unrecognized token ${token}: 401 and unchanged state`, async t => {
    const api = await serve(t, createService);
    const before = api.snapshot();
    const response = process.env.EVAL_CASE === 'pagination'
      ? await api.request('/orders', { token })
      : await api.request('/orders/a-open/refunds', { token, method: 'POST', key: 'probe', body: { amountCents: 1 } });
    assert.deepEqual(api.snapshot(), before, 'Rejected unknown identity must not mutate state');
    assert.deepEqual(response, { status: 401, body: { error: 'unauthorized' } });
  });
}
