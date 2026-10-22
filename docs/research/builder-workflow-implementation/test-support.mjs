import { once } from 'node:events';
import { request as httpRequest } from 'node:http';

export async function serve(t, createService) {
  const app = createService();
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    app.server.closeAllConnections();
    app.server.close(error => error ? reject(error) : resolve());
  }));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  return {
    snapshot: app.snapshot,
    async request(path, { token, body, key, method = 'GET' } = {}) {
      const headers = { 'content-type': 'application/json' };
      if (token) headers.authorization = `Bearer ${token}`;
      if (key) headers['idempotency-key'] = key;
      // API tests use native HTTP so an OS-selected port cannot trigger Fetch's port block list.
      return new Promise((resolve, reject) => {
        const req = httpRequest(base + path, { method, headers, agent: false }, res => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', chunk => { text += chunk; });
          res.on('error', reject);
          res.on('end', () => {
            try { resolve({ status: res.statusCode, body: JSON.parse(text) }); }
            catch (error) { reject(error); }
          });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => req.destroy(new Error('local API test timed out')));
        req.end(body === undefined ? undefined : JSON.stringify(body));
      });
    },
  };
}
