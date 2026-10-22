import { createServer } from 'node:http';

export function createService() {
  const orders = ['a', 'b'].flatMap(tenant => Array.from({ length: tenant === 'a' ? 70 : 35 },
    (_, index) => ({ id: `${tenant}-${String(index + 1).padStart(3, '0')}`, tenant })));
  const tokens = { 'staff-a': { tenant: 'a' }, 'staff-b': { tenant: 'b' } };
  const server = createServer((req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET' || url.pathname !== '/orders') return send(404, { error: 'not_found' });
    const actor = tokens[req.headers.authorization?.replace(/^Bearer /, '')];
    if (!actor) return send(401, { error: 'unauthorized' });
    const raw = url.searchParams.get('limit');
    const limit = raw === null ? 20 : Number(raw);
    if (raw !== null && (!/^[1-9][0-9]*$/.test(raw) || limit > 100)) {
      return send(400, { error: 'invalid_limit' });
    }
    const matching = orders.filter(order => order.tenant === actor.tenant);
    return send(200, { data: matching.slice(0, limit), page: { limit, total: matching.length } });
  });
  return { server, snapshot: () => structuredClone(orders) };
}
