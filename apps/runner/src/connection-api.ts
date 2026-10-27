import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AcknowledgementSchema, AuthenticatedStatusSchema, ConnectionErrorSchema, LOCAL_WEB_ORIGIN,
  PairingChallengeSchema, PairingPendingSchema, PairingProofSchema, PairingStartSchema,
  SecretSchema, SessionSchema, type ConnectionError,
} from '@orbiguild/contracts';
import { PairingAuthority } from './pairing.js';

const routes: Record<string, string> = {
  '/v1/pairing/start': 'POST', '/v1/pairing/complete': 'POST', '/v1/pairing/cancel': 'POST',
  '/v1/status': 'GET', '/v1/disconnect': 'POST',
};
const LIMIT = 1024;

export function createConnectionApi(authority: PairingAuthority) {
  let windowStart = Date.now();
  let requests = 0;
  return async (request: IncomingMessage, response: ServerResponse) => {
    const send = (status: number, body: unknown) => {
      if (response.destroyed || response.writableEnded) return;
      const json = JSON.stringify(body);
      response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(json),
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Connection: 'close',
      });
      response.end(json);
    };
    const fail = (status: number, error: ConnectionError) => send(status, ConnectionErrorSchema.parse({ protocolVersion: 1, error }));
    const count = (name: string) => request.rawHeaders.filter((v, i) => i % 2 === 0 && v.toLowerCase() === name).length;
    if (count('origin') !== 1 || request.headers.origin !== LOCAL_WEB_ORIGIN
      || request.headers.cookie !== undefined
      || (request.headers['sec-fetch-site'] !== undefined && request.headers['sec-fetch-site'] !== 'same-site')
      || (request.headers['sec-fetch-mode'] !== undefined && request.headers['sec-fetch-mode'] !== 'cors')) {
      fail(403, 'forbidden'); return;
    }
    response.setHeader('Access-Control-Allow-Origin', LOCAL_WEB_ORIGIN);
    response.setHeader('Vary', 'Origin');
    const method = routes[request.url ?? ''];
    if (!method) { fail(404, 'not_found'); return; }
    if (Date.now() - windowStart >= 60_000) { windowStart = Date.now(); requests = 0; }
    if (++requests > 120) { response.setHeader('Retry-After', '60'); fail(429, 'rate_limited'); return; }
    if (request.headers['transfer-encoding'] !== undefined) { fail(400, 'bad_request'); return; }
    if (request.method === 'OPTIONS') {
      const headers = String(request.headers['access-control-request-headers'] ?? '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
      if (request.headers['access-control-request-method'] !== method
        || headers.some((name) => !['content-type', 'authorization', 'x-orbiguild-protocol'].includes(name))
        || !headers.includes('x-orbiguild-protocol')
        || (request.headers['content-length'] !== undefined && request.headers['content-length'] !== '0')) {
        fail(403, 'forbidden'); return;
      }
      response.setHeader('Access-Control-Allow-Methods', method);
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-OrbiGuild-Protocol');
      send(200, AcknowledgementSchema.parse({ protocolVersion: 1, ok: true })); return;
    }
    if (request.method !== method) { fail(405, 'method_not_allowed'); return; }
    if (count('x-orbiguild-protocol') !== 1 || request.headers['x-orbiguild-protocol'] !== '1') {
      fail(400, 'bad_request'); return;
    }
    try {
      let body: unknown;
      if (method === 'POST') {
        const length = request.headers['content-length'];
        if (request.headers['content-type'] !== 'application/json' || !length || !/^[1-9]\d{0,3}$/.test(length) || Number(length) > LIMIT) {
          fail(400, 'bad_request'); return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        const timeout = setTimeout(() => { fail(400, 'bad_request'); request.destroy(); }, 3000);
        try {
          for await (const chunk of request) {
            const buffer = Buffer.from(chunk as Uint8Array);
            bytes += buffer.length;
            if (bytes > LIMIT) { fail(400, 'bad_request'); request.destroy(); return; }
            chunks.push(buffer);
          }
        } finally { clearTimeout(timeout); }
        body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
      } else if (request.headers['content-length'] !== undefined && request.headers['content-length'] !== '0') {
        fail(400, 'bad_request'); return;
      }
      const route = request.url;
      if (route === '/v1/pairing/start') {
        PairingStartSchema.parse(body);
        const result = authority.start();
        if (!result) { response.setHeader('Retry-After', '60'); fail(429, 'rate_limited'); return; }
        send(201, PairingChallengeSchema.parse(result)); return;
      }
      if (route === '/v1/pairing/complete' || route === '/v1/pairing/cancel') {
        const proof = PairingProofSchema.parse(body);
        if (route.endsWith('/cancel')) {
          authority.cancel(proof.challenge);
          send(200, AcknowledgementSchema.parse({ protocolVersion: 1, ok: true })); return;
        }
        const result = authority.complete(proof.challenge);
        if (!result) { fail(401, 'expired_or_invalid_challenge'); return; }
        if ('token' in result) send(200, SessionSchema.parse(result));
        else send(202, PairingPendingSchema.parse(result));
        return;
      }
      const header = request.headers.authorization;
      const parsed = SecretSchema.safeParse(header?.startsWith('Bearer ') ? header.slice(7) : undefined);
      if (count('authorization') !== 1 || !parsed.success || !authority.authorized(parsed.data)) {
        fail(401, 'unauthorized'); return;
      }
      if (route === '/v1/disconnect') {
        PairingStartSchema.parse(body);
        authority.disconnect(parsed.data);
        send(200, AcknowledgementSchema.parse({ protocolVersion: 1, ok: true })); return;
      }
      send(200, AuthenticatedStatusSchema.parse({ protocolVersion: 1, stage: 'secure-local-connection', state: 'idle', connectedAgents: 0, executionEnabled: false }));
    } catch { fail(400, 'bad_request'); }
  };
}
