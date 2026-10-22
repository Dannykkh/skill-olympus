import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { serve } from './test-support.mjs';

if (!process.env.EVAL_WORKSPACE) throw new Error('EVAL_WORKSPACE is required');
const { createService } = await import(pathToFileURL(resolve(process.env.EVAL_WORKSPACE, 'service.mjs')));
const request = (api, extra = {}, order = 'a-open') => api.request(`/orders/${order}/refunds`, {
  method: 'POST', token: 'support-a', key: 'key-1', body: { amountCents: 500 }, ...extra,
});
async function denied(api, status, error, extra = {}, order = 'a-open') {
  const before = api.snapshot();
  assert.deepEqual(await request(api, extra, order), { status, body: { error } });
  assert.deepEqual(api.snapshot(), before);
}

test('R1: valid refund persists exactly one of each side effect', async t => {
  const api = await serve(t, createService);
  const { status, body } = await request(api);
  assert.equal(status, 201);
  assert.equal(body.data.orderId, 'a-open');
  assert.equal(body.data.amountCents, 500);
  assert.equal(typeof body.data.id, 'string');
  const state = api.snapshot();
  assert.equal(state.orders.find(order => order.id === 'a-open').refundedCents, 500);
  assert.deepEqual(state.refunds, [body.data]);
  assert.deepEqual(state.audit, [{ type: 'refund', tenant: 'a', refundId: body.data.id }]);
  assert.deepEqual(state.events, [{ type: 'refund.created', refundId: body.data.id }]);
  assert.equal(state.keys.length, 1);
});

test('R2: missing and invalid authentication have no effects', async t => {
  const api = await serve(t, createService);
  for (const token of [undefined, 'invalid']) await denied(api, 401, 'unauthorized', { token });
});

test('R3: ordinary customer cannot issue refunds', async t => {
  const api = await serve(t, createService);
  await denied(api, 403, 'forbidden', { token: 'customer-a' });
});

test('R4: foreign-tenant order is indistinguishable from absent order', async t => {
  const api = await serve(t, createService);
  await denied(api, 404, 'not_found', {}, 'b-open');
  await denied(api, 404, 'not_found', {}, 'absent');
});

test('R5: invalid numeric types and ranges cannot mutate state', async t => {
  const api = await serve(t, createService);
  for (const amountCents of ['500', true, false, null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await denied(api, 400, 'invalid_amount', { body: { amountCents } });
  }
  await denied(api, 400, 'invalid_amount', { body: {} });
});

test('R6: missing and blank idempotency keys are rejected', async t => {
  const api = await serve(t, createService);
  for (const key of [undefined, '   ']) await denied(api, 400, 'missing_key', { key });
});

test('R7: excess refund is rejected without effects', async t => {
  const api = await serve(t, createService);
  await denied(api, 409, 'amount_exceeded', { body: { amountCents: 10001 } });
});

test('R8: expired order is rejected without effects', async t => {
  const api = await serve(t, createService);
  await denied(api, 410, 'refund_expired', {}, 'a-old');
});

test('R9: replay after consuming full balance returns original result without new effects', async t => {
  const api = await serve(t, createService);
  const extra = { body: { amountCents: 10000 } };
  const first = await request(api, extra);
  assert.equal(first.status, 201);
  const state = api.snapshot();
  assert.deepEqual(await request(api, extra), first);
  assert.deepEqual(api.snapshot(), state);
});

test('R10: same key with a changed amount is a conflict without new effects', async t => {
  const api = await serve(t, createService);
  assert.equal((await request(api)).status, 201);
  await denied(api, 409, 'idempotency_conflict', { body: { amountCents: 600 } });
});

test('R11: partial refunds accumulate and cannot exceed the paid amount', async t => {
  const api = await serve(t, createService);
  assert.equal((await request(api, { body: { amountCents: 3000 }, key: 'part-1' })).status, 201);
  assert.equal((await request(api, { body: { amountCents: 7000 }, key: 'part-2' })).status, 201);
  await denied(api, 409, 'amount_exceeded', { body: { amountCents: 1 }, key: 'part-3' });
  const state = api.snapshot();
  assert.equal(state.orders.find(order => order.id === 'a-open').refundedCents, 10000);
  assert.equal(state.refunds.length, 2);
  assert.equal(state.audit.length, 2);
  assert.equal(state.events.length, 2);
  assert.equal(state.keys.length, 2);
});

test('R12: tenant b support can issue its own refund', async t => {
  const api = await serve(t, createService);
  const response = await request(api, { token: 'support-b', body: { amountCents: 1 } }, 'b-open');
  assert.equal(response.status, 201);
  assert.equal(response.body.data.orderId, 'b-open');
  assert.equal(api.snapshot().orders.find(order => order.id === 'a-open').refundedCents, 0);
  assert.equal(api.snapshot().orders.find(order => order.id === 'b-open').refundedCents, 1);
});
