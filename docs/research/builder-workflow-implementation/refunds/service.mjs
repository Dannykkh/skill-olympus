import { createServer } from 'node:http';

export function createService() {
  const orders = [
    { id: 'a-open', tenant: 'a', paidCents: 10000, refundedCents: 0, purchasedAt: '2026-10-01T00:00:00Z' },
    { id: 'a-old', tenant: 'a', paidCents: 10000, refundedCents: 0, purchasedAt: '2026-09-01T00:00:00Z' },
    { id: 'b-open', tenant: 'b', paidCents: 5000, refundedCents: 0, purchasedAt: '2026-10-01T00:00:00Z' },
  ];
  const refunds = [], audit = [], events = [], keys = new Map();
  const tokens = {
    'support-a': { tenant: 'a', role: 'support' },
    'customer-a': { tenant: 'a', role: 'customer' },
    'support-b': { tenant: 'b', role: 'support' },
  };
  const server = createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const match = /^\/orders\/([^/]+)\/refunds$/.exec(new URL(req.url, 'http://localhost').pathname);
    if (req.method !== 'POST' || !match) return send(404, { error: 'not_found' });
    const actor = tokens[req.headers.authorization?.replace(/^Bearer /, '')];
    if (!actor) return send(401, { error: 'unauthorized' });
    const order = orders.find(item => item.id === match[1]);
    if (!order) return send(404, { error: 'not_found' });
    let body;
    try {
      let text = '';
      for await (const chunk of req) text += chunk;
      body = JSON.parse(text);
    } catch { return send(400, { error: 'invalid_body' }); }
    const amountCents = Number(body?.amountCents);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return send(400, { error: 'invalid_amount' });
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || key.trim() === '') return send(400, { error: 'missing_key' });
    const scope = `${actor.tenant}:${order.id}:${key}`;
    const prior = keys.get(scope);
    if (prior) {
      if (prior.amountCents !== amountCents) return send(409, { error: 'idempotency_conflict' });
      return send(201, { data: prior });
    }
    const age = Date.parse('2026-10-22T00:00:00Z') - Date.parse(order.purchasedAt);
    if (age > 30 * 86400000) return send(410, { error: 'refund_expired' });
    if (amountCents > order.paidCents - order.refundedCents) return send(409, { error: 'amount_exceeded' });
    const refund = { id: `refund-${refunds.length + 1}`, orderId: order.id, amountCents };
    order.refundedCents += amountCents;
    refunds.push(refund);
    keys.set(scope, refund);
    audit.push({ type: 'refund', tenant: actor.tenant, refundId: refund.id });
    events.push({ type: 'refund.created', refundId: refund.id });
    return send(201, { data: refund });
  });
  return {
    server,
    snapshot: () => structuredClone({ orders, refunds, audit, events, keys: [...keys] }),
  };
}
