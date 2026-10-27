import assert from 'node:assert/strict';
import { request as httpRequest, type OutgoingHttpHeaders } from 'node:http';
import { connect } from 'node:net';
import { test } from 'node:test';
import { AuthenticatedStatusSchema, LOCAL_WEB_ORIGIN, PairingChallengeSchema, SessionSchema } from '@orbiguild/contracts';
import { PairingAuthority, CHALLENGE_TTL_MS, SESSION_TTL_MS } from '../src/pairing.js';
import { startRunner } from '../src/server.js';

type Runner = Awaited<ReturnType<typeof startRunner>>;
function api(runner: Runner, path: string, body?: unknown, extra: OutgoingHttpHeaders = {}, method?: string) {
  const text = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
  const headers: OutgoingHttpHeaders = { Origin: LOCAL_WEB_ORIGIN, 'X-OrbiGuild-Protocol': '1',
    ...(text === undefined ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text) }), ...extra };
  for (const key of Object.keys(headers)) if (headers[key] === undefined) delete headers[key];
  return new Promise<{ status: number; body: unknown; headers: OutgoingHttpHeaders }>((resolve, reject) => {
    const req = httpRequest(`${runner.url}${path}`, { method: method ?? (text === undefined ? 'GET' : 'POST'), headers }, (res) => {
      let data = '';
      res.setEncoding('utf8'); res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data ? JSON.parse(data) as unknown : null, headers: res.headers }));
      res.on('error', reject);
    });
    req.setTimeout(5000, () => req.destroy(new Error('Request timeout')));
    req.on('error', reject); req.end(text);
  });
}
const start = { protocolVersion: 1 };
const proof = (challenge: string) => ({ ...start, challenge });
async function paired(runner: Runner, authority: PairingAuthority) {
  const result = await api(runner, '/v1/pairing/start', start);
  assert.equal(result.status, 201);
  const pending = PairingChallengeSchema.parse(result.body);
  assert.equal(authority.approve(pending.verificationCode), true);
  return { pending, session: SessionSchema.parse((await api(runner, '/v1/pairing/complete', proof(pending.challenge))).body) };
}

test('HTTP pairing requires terminal approval; exchange is one-time and grants only status until disconnect', async (t) => {
  const notifications: string[] = [];
  const authority = new PairingAuthority(Date.now, (code, origin) => notifications.push(`${code} ${origin}`));
  const runner = await startRunner({ port: 0 }, authority); t.after(() => runner.close());
  assert.equal((await api(runner, '/v1/status')).status, 401);
  const pending = PairingChallengeSchema.parse((await api(runner, '/v1/pairing/start', start)).body);
  assert.equal((await api(runner, '/v1/pairing/complete', proof(pending.challenge))).status, 202);
  assert.equal((await api(runner, '/v1/pairing/approve', { ...start, code: pending.verificationCode })).status, 404);
  assert.equal((await api(runner, '/v1/pairing/complete', proof(pending.verificationCode))).status, 400);
  assert.equal(notifications.some((text) => text.includes(pending.challenge)), false);
  assert.equal(authority.approve(pending.verificationCode), true);
  const session = SessionSchema.parse((await api(runner, '/v1/pairing/complete', proof(pending.challenge))).body);
  assert.equal((await api(runner, '/v1/pairing/complete', proof(pending.challenge))).status, 401);
  const auth = { Authorization: `Bearer ${session.token}` };
  assert.equal(AuthenticatedStatusSchema.parse((await api(runner, '/v1/status', undefined, auth)).body).executionEnabled, false);
  assert.equal((await api(runner, '/v1/run', start, auth)).status, 404);
  assert.equal((await api(runner, '/v1/disconnect', start, auth)).status, 200);
  assert.equal((await api(runner, '/v1/status', undefined, auth)).status, 401);
});

test('Host, Origin, Fetch Metadata, cookies and CORS preflights fail closed', async (t) => {
  const runner = await startRunner({ port: 0 }); t.after(() => runner.close());
  for (const headers of [
    { Origin: undefined }, { Origin: 'null' }, { Origin: 'https://evil.example' },
    { Origin: 'http://localhost:5173' }, { Origin: 'http://127.0.0.1:5174' },
    { Origin: [LOCAL_WEB_ORIGIN, LOCAL_WEB_ORIGIN] }, { Host: 'evil.example' },
    { Host: `localhost:${runner.port}` }, { Host: `127.0.0.1:${runner.port + 1}` },
    { 'Sec-Fetch-Site': 'cross-site' }, { 'Sec-Fetch-Mode': 'no-cors' }, { Cookie: 'session=anything' },
  ]) assert.equal((await api(runner, '/v1/pairing/start', start, headers)).status, 403);
  const preflight = { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-orbiguild-protocol' };
  const accepted = await api(runner, '/v1/pairing/start', undefined, preflight, 'OPTIONS');
  assert.equal(accepted.status, 200);
  assert.equal(accepted.headers['access-control-allow-origin'], LOCAL_WEB_ORIGIN);
  assert.equal(accepted.headers['access-control-allow-credentials'], undefined);
  assert.equal((await api(runner, '/v1/pairing/start', undefined, { ...preflight, 'Access-Control-Request-Headers': 'cookie' }, 'OPTIONS')).status, 403);
  assert.equal((await api(runner, '/v1/status', undefined, preflight, 'OPTIONS')).status, 403);
  const denied = await api(runner, '/v1/status', undefined, { Origin: 'https://evil.example' });
  assert.equal(denied.headers['access-control-allow-origin'], undefined);
});

test('strict JSON, protocol, payload limits and token validation reject malformed requests', async (t) => {
  const runner = await startRunner({ port: 0 }); t.after(() => runner.close());
  for (const body of ['{', [], null, { protocolVersion: 2 }, { ...start, command: 'run' }, 'x'.repeat(1025)]) {
    assert.equal((await api(runner, '/v1/pairing/start', body)).status, 400);
  }
  for (const headers of [{ 'Content-Type': 'text/plain' }, { 'X-OrbiGuild-Protocol': undefined }, { 'X-OrbiGuild-Protocol': '2' }]) {
    assert.equal((await api(runner, '/v1/pairing/start', start, headers)).status, 400);
  }
  for (const token of ['invalid', 'A'.repeat(43)]) assert.equal((await api(runner, '/v1/status', undefined, { Authorization: `Bearer ${token}` })).status, 401);
  assert.equal((await api(runner, '/v1/status?token=forbidden')).status, 404);
  assert.equal((await api(runner, '/v1/status', start)).status, 405);
});

test('expiry, cancellation, lost-response cancellation and revoke-all invalidate authority', async (t) => {
  let now = Date.now();
  const authority = new PairingAuthority(() => now);
  const runner = await startRunner({ port: 0 }, authority); t.after(() => runner.close());
  let pending = PairingChallengeSchema.parse((await api(runner, '/v1/pairing/start', start)).body);
  now += CHALLENGE_TTL_MS;
  assert.equal(authority.approve(pending.verificationCode), false);
  assert.equal((await api(runner, '/v1/pairing/complete', proof(pending.challenge))).status, 401);
  pending = PairingChallengeSchema.parse((await api(runner, '/v1/pairing/start', start)).body);
  assert.equal((await api(runner, '/v1/pairing/cancel', proof(pending.challenge))).status, 200);
  assert.equal(authority.approve(pending.verificationCode), false);
  assert.equal((await api(runner, '/v1/pairing/complete', proof(pending.challenge))).status, 401);
  const issued = await paired(runner, authority);
  await api(runner, '/v1/pairing/cancel', proof(issued.pending.challenge));
  assert.equal((await api(runner, '/v1/status', undefined, { Authorization: `Bearer ${issued.session.token}` })).status, 401);
  const expiring = await paired(runner, authority);
  now += SESSION_TTL_MS;
  assert.equal((await api(runner, '/v1/status', undefined, { Authorization: `Bearer ${expiring.session.token}` })).status, 401);
  const revoked = await paired(runner, authority);
  authority.revokeAll();
  assert.equal(authority.authorized(revoked.session.token), false);
});

test('runner restart rejects the previous session and challenge', async () => {
  const authority = new PairingAuthority();
  const first = await startRunner({ port: 0 }, authority);
  const issued = await paired(first, authority);
  const port = first.port;
  await first.close();
  const second = await startRunner({ port });
  try {
    assert.equal((await api(second, '/v1/status', undefined, { Authorization: `Bearer ${issued.session.token}` })).status, 401);
    assert.equal((await api(second, '/v1/pairing/complete', proof(issued.pending.challenge))).status, 401);
  } finally { await second.close(); }
});

test('pairing attempts, pending capacity and total request rate are bounded', async (t) => {
  let now = Date.now();
  const authority = new PairingAuthority(() => now);
  const runner = await startRunner({ port: 0 }, authority); t.after(() => runner.close());
  for (let i = 0; i < 10; i++) {
    const pending = PairingChallengeSchema.parse((await api(runner, '/v1/pairing/start', start)).body);
    await api(runner, '/v1/pairing/cancel', proof(pending.challenge));
  }
  assert.equal((await api(runner, '/v1/pairing/start', start)).status, 429);
  now += 60_000;
  for (let i = 0; i < 3; i++) assert.equal((await api(runner, '/v1/pairing/start', start)).status, 201);
  assert.equal((await api(runner, '/v1/pairing/start', start)).status, 429);
  for (let i = 0; i < 120; i++) await api(runner, '/v1/status');
  assert.equal((await api(runner, '/v1/status')).status, 429);
});

test('incomplete body times out without crashing or issuing a session', async (t) => {
  const runner = await startRunner({ port: 0 }); t.after(() => runner.close());
  await new Promise<void>((resolve, reject) => {
    const socket = connect(runner.port, runner.host, () => socket.write(`POST /v1/pairing/start HTTP/1.1\r\nHost: 127.0.0.1:${runner.port}\r\nOrigin: ${LOCAL_WEB_ORIGIN}\r\nX-OrbiGuild-Protocol: 1\r\nContent-Type: application/json\r\nContent-Length: 21\r\n\r\n{`));
    socket.setTimeout(6000, () => socket.destroy(new Error('No server timeout')));
    socket.on('data', () => {}); socket.on('close', () => resolve()); socket.on('error', reject);
  });
  assert.equal((await api(runner, '/v1/status')).status, 401);
});

test('session capacity is enforced at exchange even when requests were approved concurrently', () => {
  let now = Date.now();
  const authority = new PairingAuthority(() => now);
  for (let i = 0; i < 4; i++) {
    const pending = authority.start(); assert.ok(pending);
    authority.approve(pending.verificationCode);
    assert.ok(authority.complete(pending.challenge));
    now += CHALLENGE_TTL_MS;
  }
  const one = authority.start(); const two = authority.start();
  assert.ok(one); assert.ok(two);
  authority.approve(one.verificationCode); authority.approve(two.verificationCode);
  assert.ok(authority.complete(one.challenge));
  assert.equal(authority.complete(two.challenge), undefined);
});
