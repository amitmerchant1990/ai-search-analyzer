import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePair, normalizeDomain, normalizeQueries, summarize } from './src/analysis.mjs';
import { searchAiMode, searchGoogle } from './src/searchapi.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(root, 'public');
const port = Number(process.env.PORT || 3000);

function json(res, status, body) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); }

async function body(req) {
  let value = '';
  for await (const chunk of req) { value += chunk; if (value.length > 100_000) throw new Error('Request is too large.'); }
  try { return JSON.parse(value || '{}'); } catch { throw new Error('Send valid JSON.'); }
}

async function analyze(req, res) {
  let input;
  try { input = await body(req); } catch (error) { return json(res, 400, { error: { message: error.message } }); }
  let domain, queries;
  try { domain = normalizeDomain(input.domain); queries = normalizeQueries(input.queries); } catch (error) { return json(res, 400, { error: { message: error.message, field: error.message.includes('domain') ? 'domain' : 'queries' } }); }
  const results = await Promise.all(queries.map(async query => {
    const [ai, google] = await Promise.allSettled([searchAiMode({ query, apiKey: process.env.SEARCHAPI_API_KEY }), searchGoogle({ query, apiKey: process.env.SEARCHAPI_API_KEY })]);
    return analyzePair({ domain, query, aiResponse: ai.status === 'fulfilled' ? ai.value : undefined, googleResponse: google.status === 'fulfilled' ? google.value : undefined, aiError: ai.status === 'rejected' ? ai.reason : undefined, googleError: google.status === 'rejected' ? google.reason : undefined });
  }));
  return json(res, 200, summarize(domain, results));
}

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
async function staticFile(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = normalize(join(publicDir, requestPath));
  if (!file.startsWith(publicDir)) return json(res, 403, { error: { message: 'Forbidden.' } });
  try { const data = await readFile(file); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(data); } catch { json(res, 404, { error: { message: 'Not found.' } }); }
}

createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/health') return json(res, 200, { ok: true });
    if (req.method === 'POST' && req.url === '/api/analyze') return await analyze(req, res);
    if (req.method === 'GET') return await staticFile(req, res);
    return json(res, 405, { error: { message: 'Method not allowed.' } });
  } catch { return json(res, 500, { error: { message: 'Unexpected server error.' } }); }
}).listen(port, () => console.log(`AI Search Visibility Analyzer running at http://localhost:${port}`));
