import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { serve } from './test-support.mjs';

if (!process.env.EVAL_WORKSPACE) throw new Error('EVAL_WORKSPACE is required');
const { createService } = await import(pathToFileURL(resolve(process.env.EVAL_WORKSPACE, 'service.mjs')));

test('P1: absent limit uses 30 and preserves ordered values', async t => {
  const api = await serve(t, createService);
  const before = api.snapshot();
  const { status, body } = await api.request('/orders', { token: 'staff-a' });
  assert.equal(status, 200);
  assert.deepEqual(body.page, { limit: 30, total: 70 });
  assert.deepEqual(body.data.map(order => order.id), Array.from({ length: 30 }, (_, i) => `a-${String(i + 1).padStart(3, '0')}`));
  assert.deepEqual(api.snapshot(), before);
});

test('P2: explicit limits remain effective, including boundaries', async t => {
  const api = await serve(t, createService);
  for (const limit of [1, 7, 100]) {
    const { status, body } = await api.request(`/orders?limit=${limit}`, { token: 'staff-a' });
    assert.equal(status, 200);
    assert.equal(body.page.limit, limit);
    assert.equal(body.data.length, Math.min(limit, 70));
  }
});

test('P3: invalid limits are rejected without state changes', async t => {
  const api = await serve(t, createService);
  const before = api.snapshot();
  for (const limit of ['', '0', '-1', '1.5', '01', '101', '1e2', 'abc', ' ']) {
    const response = await api.request(`/orders?limit=${encodeURIComponent(limit)}`, { token: 'staff-a' });
    assert.deepEqual(response, { status: 400, body: { error: 'invalid_limit' } }, `limit=${limit}`);
    assert.deepEqual(api.snapshot(), before);
  }
});

test('P4: anonymous and invalid credentials cannot read orders', async t => {
  const api = await serve(t, createService);
  const before = api.snapshot();
  for (const token of [undefined, 'unknown']) {
    assert.deepEqual(await api.request('/orders', { token }), { status: 401, body: { error: 'unauthorized' } });
    assert.deepEqual(api.snapshot(), before);
  }
});

test('P5: tenant b gets only its own first 30 rows and total', async t => {
  const api = await serve(t, createService);
  const { status, body } = await api.request('/orders', { token: 'staff-b' });
  assert.equal(status, 200);
  assert.deepEqual(body.page, { limit: 30, total: 35 });
  assert.equal(body.data.length, 30);
  assert.ok(body.data.every(order => order.tenant === 'b'));
  assert.equal(body.data.at(-1).id, 'b-030');
});

test('P6: unsupported route remains 404', async t => {
  const api = await serve(t, createService);
  assert.deepEqual(await api.request('/missing', { token: 'staff-a' }), { status: 404, body: { error: 'not_found' } });
});
