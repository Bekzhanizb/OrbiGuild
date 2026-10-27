import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCAL_WEB_ORIGIN } from '@orbiguild/contracts';
import { LocalConnection } from '../src/connection.js';

const challenge = { protocolVersion: 1, challenge: 'C'.repeat(43), verificationCode: 'AABBCCDD', expiresAt: Date.now() + 120_000 };
const session = { protocolVersion: 1, token: 'T'.repeat(43), expiresAt: Date.now() + 900_000 };
const status = { protocolVersion: 1, stage: 'secure-local-connection', state: 'idle', connectedAgents: 0, executionEnabled: false };
const reply = (body: unknown, code = 200) => new Response(JSON.stringify(body), { status: code });
const unauthorized = () => reply({ protocolVersion: 1, error: 'unauthorized' }, 401);
function fixture() {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const server = { approved: false, valid: false, online: true, failDisconnect: false };
  const transport: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (!server.online) throw new TypeError('Network unavailable');
    const path = new URL(String(url)).pathname;
    if (path === '/v1/pairing/start') return reply(challenge, 201);
    if (path === '/v1/pairing/complete') {
      if (!server.approved) return reply({ protocolVersion: 1, state: 'pending' }, 202);
      server.valid = true; return reply(session);
    }
    if (path === '/v1/disconnect' || path === '/v1/pairing/cancel') {
      if (server.failDisconnect) throw new TypeError('Disconnected');
      server.valid = false; return reply({ protocolVersion: 1, ok: true });
    }
    return server.valid && new Headers(init?.headers).get('Authorization') === `Bearer ${session.token}` ? reply(status) : unauthorized();
  };
  return { calls, server, connection: new LocalConnection(transport, LOCAL_WEB_ORIGIN, false) };
}

test('connection lifecycle requires approval and verified status; credentials never enter view or URL', async () => {
  const { connection, server, calls } = fixture();
  const states: string[] = [];
  const unsubscribe = connection.subscribe(() => states.push(connection.getSnapshot().state));
  await connection.refresh(); assert.equal(connection.getSnapshot().state, 'pairing-required');
  await connection.pair(); assert.equal(connection.getSnapshot().verificationCode, challenge.verificationCode);
  await connection.complete(); assert.equal(connection.getSnapshot().state, 'pairing-required');
  server.approved = true; await connection.complete();
  assert.equal(connection.getSnapshot().state, 'connected');
  assert.ok(states.includes('connecting'));
  assert.equal(JSON.stringify(connection.getSnapshot()).includes(session.token), false);
  assert.equal(JSON.stringify(connection.getSnapshot()).includes(challenge.challenge), false);
  for (const call of calls) {
    assert.equal(new URL(call.url).search, '');
    assert.equal(call.init?.credentials, 'omit');
    assert.equal(call.init?.redirect, 'error');
    assert.equal(new Headers(call.init?.headers).get('X-OrbiGuild-Protocol'), '1');
  }
  await connection.disconnect();
  assert.equal(connection.getSnapshot().state, 'disconnected'); assert.equal(server.valid, false);
  unsubscribe();
});

test('revocation, expiry or restart returns Pairing Required; network failure can be retried', async () => {
  const { connection, server } = fixture();
  await connection.pair(); server.approved = true; await connection.complete();
  server.valid = false; await connection.refresh(); assert.equal(connection.getSnapshot().state, 'pairing-required');
  server.online = false; await connection.refresh(); assert.equal(connection.getSnapshot().state, 'disconnected');
  server.online = true; await connection.refresh(); assert.equal(connection.getSnapshot().state, 'pairing-required');
  await connection.pair(); await connection.complete(); assert.equal(connection.getSnapshot().state, 'connected');
  server.failDisconnect = true; await connection.disconnect();
  assert.equal(connection.getSnapshot().state, 'disconnected');
  assert.match(connection.getSnapshot().message, /revocation could not be confirmed/);
});

test('cancel clears pending state and malformed responses or unsupported origins show Error', async () => {
  const { connection, calls } = fixture();
  await connection.pair(); await connection.disconnect(); await connection.complete();
  assert.equal(connection.getSnapshot().state, 'disconnected');
  assert.ok(calls.some((call) => call.url.endsWith('/v1/pairing/cancel')));
  const malformed = new LocalConnection(async () => reply({ ...challenge, extra: 'invalid' }), LOCAL_WEB_ORIGIN, false);
  await malformed.pair(); assert.equal(malformed.getSnapshot().state, 'error');
  const hosted = new LocalConnection(async () => { throw new Error('Must not fetch'); }, 'https://example.com', false);
  await hosted.pair(); assert.equal(hosted.getSnapshot().state, 'error');
  const limited = new LocalConnection(async () => reply({ protocolVersion: 1, error: 'rate_limited' }, 429), LOCAL_WEB_ORIGIN, false);
  await limited.pair(); assert.match(limited.getSnapshot().message, /Wait one minute/);
});

test('expired challenge is cancelled and requires fresh approval', async () => {
  let cancelled = false;
  const connection = new LocalConnection(async (url) => {
    if (String(url).endsWith('/cancel')) { cancelled = true; return reply({ protocolVersion: 1, ok: true }); }
    return reply({ ...challenge, expiresAt: Date.now() - 1 });
  }, LOCAL_WEB_ORIGIN, false);
  await connection.pair(); await connection.complete();
  assert.equal(cancelled, true); assert.equal(connection.getSnapshot().state, 'pairing-required');
});

test('cancel during a delayed challenge response cancels the returned challenge', async () => {
  let resolve!: (response: Response) => void;
  let cancelled = false;
  const connection = new LocalConnection(async (url) => {
    if (String(url).endsWith('/start')) return new Promise<Response>((done) => { resolve = done; });
    cancelled = true; return reply({ protocolVersion: 1, ok: true });
  }, LOCAL_WEB_ORIGIN, false);
  const pairing = connection.pair(); await connection.disconnect(); resolve(reply(challenge)); await pairing;
  assert.equal(cancelled, true); assert.equal(connection.getSnapshot().state, 'disconnected');
});

test('a session received after cancellation is revoked and cannot revive Connected', async () => {
  let resolve!: (response: Response) => void;
  let revoked = false;
  const connection = new LocalConnection(async (url) => {
    if (String(url).endsWith('/start')) return reply(challenge);
    if (String(url).endsWith('/complete')) return new Promise<Response>((done) => { resolve = done; });
    if (String(url).endsWith('/disconnect')) revoked = true;
    return reply({ protocolVersion: 1, ok: true });
  }, LOCAL_WEB_ORIGIN, false);
  await connection.pair(); const completing = connection.complete();
  await connection.disconnect(); resolve(reply(session)); await completing;
  assert.equal(revoked, true); assert.equal(connection.getSnapshot().state, 'disconnected');
});

test('disposing while status is in flight cannot restore the old connection', async () => {
  let resolve!: (response: Response) => void;
  const connection = new LocalConnection(async () => new Promise<Response>((done) => { resolve = done; }), LOCAL_WEB_ORIGIN, false);
  const checking = connection.refresh(); connection.dispose(); resolve(unauthorized()); await checking;
  assert.equal(connection.getSnapshot().state, 'disconnected');
});

test('native fetch is called without a controller receiver', async () => {
  const connection = new LocalConnection(async function (this: unknown) {
    assert.equal(this, undefined);
    return unauthorized();
  }, LOCAL_WEB_ORIGIN, false);
  await connection.refresh();
  assert.equal(connection.getSnapshot().state, 'pairing-required');
});
