import assert from 'node:assert/strict';
import { request as httpRequest, type OutgoingHttpHeaders } from 'node:http';
import { connect } from 'node:net';
import { test } from 'node:test';
import { HealthErrorSchema, RunnerHealthSchema } from '@orbiguild/contracts';
import { startRunner } from '../src/server.js';

type Runner = Awaited<ReturnType<typeof startRunner>>;

function request(runner: Runner, options: { method?: string; path?: string; headers?: OutgoingHttpHeaders; body?: string } = {}) {
  return new Promise<{ status: number; headers: Record<string, unknown>; body: string }>((resolve, reject) => {
    const req = httpRequest(`${runner.url}${options.path ?? '/health'}`, {
      method: options.method ?? 'GET',
      headers: options.headers ?? {},
      timeout: 2000,
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body }));
      response.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Request timed out.')));
    req.on('error', reject);
    req.end(options.body);
  });
}

function rawRequest(runner: Runner, raw: string) {
  return new Promise<string>((resolve, reject) => {
    const socket = connect({ host: runner.host, port: runner.port }, () => socket.end(raw));
    let response = '';
    socket.setTimeout(2000, () => socket.destroy(new Error('Socket timed out.')));
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => { response += chunk; });
    socket.on('end', () => resolve(response));
    socket.on('error', reject);
  });
}

test('real loopback health validates and the configured port cannot be rebound', async (t) => {
  const runner = await startRunner({ port: 0 });
  t.after(() => runner.close());
  assert.equal(runner.host, '127.0.0.1');
  assert.ok(runner.port >= 1024);
  const response = await request(runner);
  assert.equal(response.status, 200);
  const health = RunnerHealthSchema.parse(JSON.parse(response.body) as unknown);
  assert.equal(health.runner.connectedAgents, 0);
  assert.equal(health.runner.state, 'idle');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  assert.match(String(response.headers['content-type']), /^application\/json/);
  await assert.rejects(startRunner({ port: runner.port }), { code: 'EADDRINUSE' });
});

test('Host and browser-origin checks reject browser and rebinding requests', async (t) => {
  const runner = await startRunner({ port: 0 });
  t.after(() => runner.close());
  for (const headers of [
    { Host: 'evil.example' },
    { Host: `localhost:${runner.port}` },
    { Host: `127.0.0.1:${runner.port + 1}` },
    { Origin: 'https://evil.example' },
    { Origin: 'null' },
    { Origin: runner.url },
    { 'Sec-Fetch-Site': 'same-origin' },
    { 'Sec-Fetch-Mode': 'no-cors' },
  ]) {
    const response = await request(runner, { headers });
    assert.equal(response.status, 403);
    assert.deepEqual(HealthErrorSchema.parse(JSON.parse(response.body) as unknown), { error: 'forbidden' });
    assert.equal(response.headers['access-control-allow-origin'], undefined);
  }
});

test('health rejects methods, unknown routes, query strings, and payloads without changing state', async (t) => {
  const runner = await startRunner({ port: 0 });
  t.after(() => runner.close());
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']) {
    const response = await request(runner, { method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.allow, 'GET');
  }
  assert.equal((await request(runner, { path: '/run' })).status, 404);
  assert.equal((await request(runner, { path: '/health?command=run' })).status, 400);
  assert.equal((await request(runner, { headers: { 'Content-Length': '2' }, body: '{}' })).status, 400);
  assert.equal((await request(runner, { headers: { 'Transfer-Encoding': 'chunked' }, body: '{}' })).status, 400);
  assert.equal((await request(runner, { headers: { 'Content-Length': '0' } })).status, 200);
  const health = RunnerHealthSchema.parse(JSON.parse((await request(runner)).body) as unknown);
  assert.equal(health.runner.connectedAgents, 0);
});

test('malformed HTTP, duplicate/missing Host, oversized headers and upgrades fail safely', async (t) => {
  const runner = await startRunner({ port: 0 });
  t.after(() => runner.close());
  const authority = `127.0.0.1:${runner.port}`;
  for (const raw of [
    'NOT HTTP\r\n\r\n',
    `GET /health HTTP/1.1\r\nHost: ${authority}\r\nContent-Length: invalid\r\n\r\n`,
    `GET /health HTTP/1.1\r\nHost: ${authority}\r\nX-Large: ${'a'.repeat(9000)}\r\n\r\n`,
    `GET /health HTTP/1.1\r\nHost: ${authority}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`,
    `CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`,
    `GET http://${authority}/health HTTP/1.1\r\nHost: ${authority}\r\n\r\n`,
    `GET /health HTTP/1.1\r\nHost: ${authority}\r\nExpect: 100-continue\r\n\r\n`,
  ]) {
    assert.match(await rawRequest(runner, raw), /^HTTP\/1\.1 400 /);
  }
  for (const raw of [
    `GET /health HTTP/1.1\r\nHost: ${authority}\r\nHost: evil.example\r\n\r\n`,
    'GET /health HTTP/1.0\r\n\r\n',
  ]) {
    assert.match(await rawRequest(runner, raw), /^HTTP\/1\.[01] (400|403) /);
  }
  assert.equal((await request(runner)).status, 200);
});

test('explicit IPv6 loopback works without binding all IPv6 interfaces', async (t) => {
  let runner: Runner;
  try {
    runner = await startRunner({ host: '::1', port: 0 });
  } catch (error) {
    if (error instanceof Error && 'code' in error && ['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(String(error.code))) {
      t.skip('IPv6 loopback is not supported on this machine.');
      return;
    }
    throw error;
  }
  t.after(() => runner.close());
  assert.equal(runner.host, '::1');
  assert.match(runner.url, /^http:\/\/\[::1\]:/);
  assert.equal((await request(runner)).status, 200);
  assert.equal((await request(runner, { headers: { Host: `127.0.0.1:${runner.port}` } })).status, 403);
});
