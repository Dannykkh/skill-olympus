import { createServer, request } from 'node:http';
import { once } from 'node:events';

// Reproduce the transport issue independently of either agent's implementation.
const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end('{"ok":true}');
});
const port = Number(process.env.PROBE_PORT ?? 6000);
server.listen(port, '127.0.0.1');
await once(server, 'listening');
const result = { port: server.address().port };
try {
  try {
    const response = await fetch(`http://127.0.0.1:${result.port}/`);
    result.fetch = { status: response.status, body: await response.json() };
  } catch (error) {
    result.fetch = { error: error.message, cause: error.cause?.message };
  }
  result.http = await new Promise((resolve, reject) => {
    const req = request(`http://127.0.0.1:${result.port}/`, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('local probe timed out')));
    req.end();
  });
  console.log(JSON.stringify(result));
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
