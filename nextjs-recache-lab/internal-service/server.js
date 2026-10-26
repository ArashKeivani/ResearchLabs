'use strict';

// Deliberately boring target for the SSRF lesson. It serves synthetic training data only.
// This service is not published to the host and only joins the internal Docker network.
const http = require('node:http');
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 8081);

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store'
    });
    res.end('ok\n');
    return;
  }

  if (req.url === '/secret') {
    res.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-lab-internal-service': 'ssrf-target'
    });
    res.end([
      'RESEARCHLABS_INTERNAL_DEMO_SECRET=synthetic-value-not-a-real-credential',
      'service=ssrf-target',
      'lesson=the vulnerable Next.js middleware proxied this internal HTTP response'
    ].join('\n') + '\n');
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
  res.end('not found\n');
});

server.listen(port, host, () => {
  console.log(`Synthetic internal SSRF target listening on ${host}:${port}`);
});
