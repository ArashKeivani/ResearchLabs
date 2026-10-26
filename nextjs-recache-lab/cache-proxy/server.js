'use strict';

const http = require('node:http');

const LISTEN_HOST = process.env.LISTEN_HOST || '0.0.0.0';
const LISTEN_PORT = Number(process.env.LISTEN_PORT || 8080);
const ORIGIN_HOST = process.env.ORIGIN_HOST || 'app';
const ORIGIN_PORT = Number(process.env.ORIGIN_PORT || 3000);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS || 600) * 1000;
const cache = new Map();

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'proxy-connection'
]);

function keyFor(req) {
  // Intentionally wrong for this exercise: only method + raw path/query are keyed.
  // Request headers (including RSC / Accept) and response Vary are ignored.
  return `${req.method} ${req.url}`;
}

function cleanRequestHeaders(inputHeaders) {
  const out = { ...inputHeaders };
  for (const header of HOP_BY_HOP) delete out[header];
  // Tell Next which upstream host actually receives the request. The app's reflection
  // middleware excludes Host, so this does not affect the demonstrated chain.
  out.host = `${ORIGIN_HOST}:${ORIGIN_PORT}`;
  return out;
}

function send(res, statusCode, headers, body, cacheState, ageSeconds = 0) {
  const responseHeaders = { ...headers };
  for (const header of HOP_BY_HOP) delete responseHeaders[header];
  responseHeaders['x-lab-cache'] = cacheState;
  responseHeaders['age'] = String(ageSeconds);
  res.writeHead(statusCode, responseHeaders);
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.url === '/__lab/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end('ok\n');
    return;
  }

  if (req.method === 'POST' && req.url === '/__lab/cache/clear') {
    const deleted = cache.size;
    cache.clear();
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, deleted }) + '\n');
    return;
  }

  const key = keyFor(req);
  if (req.method === 'GET') {
    const entry = cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      const age = Math.max(0, Math.floor((Date.now() - entry.storedAt) / 1000));
      console.log(`[cache HIT] ${key}`);
      send(res, entry.statusCode, entry.headers, entry.body, 'HIT', age);
      return;
    }
    if (entry) cache.delete(key);
  }

  console.log(`[cache MISS] ${key}`);
  const upstream = http.request({
    hostname: ORIGIN_HOST,
    port: ORIGIN_PORT,
    method: req.method,
    path: req.url,
    headers: cleanRequestHeaders(req.headers)
  }, (upstreamRes) => {
    const chunks = [];
    upstreamRes.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    upstreamRes.on('end', () => {
      const body = Buffer.concat(chunks);
      const statusCode = upstreamRes.statusCode || 502;
      const headers = { ...upstreamRes.headers };

      // Deliberately emulate a misconfigured CDN rule that caches all successful GETs,
      // even when Cache-Control says otherwise, and doesn't use Vary in cache selection.
      if (req.method === 'GET' && statusCode === 200) {
        cache.set(key, {
          statusCode,
          headers,
          body,
          storedAt: Date.now(),
          expiresAt: Date.now() + CACHE_TTL_MS
        });
      }

      send(res, statusCode, headers, body, 'MISS', 0);
    });
  });

  upstream.on('error', (error) => {
    console.error(`[origin error] ${error.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    }
    res.end('Origin unavailable. Run `docker compose up --build -d` and try again.\n');
  });

  req.pipe(upstream);
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`Re:CACHE lab proxy listening on ${LISTEN_HOST}:${LISTEN_PORT}`);
  console.log(`Origin: http://${ORIGIN_HOST}:${ORIGIN_PORT}`);
  console.log(`Cache TTL: ${CACHE_TTL_MS} ms; key = method + raw URL; Vary is ignored`);
});
