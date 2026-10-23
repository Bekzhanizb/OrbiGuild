import { createServer, type ServerResponse } from 'node:http';
import { HealthErrorSchema, RunnerHealthSchema, type HealthError } from '@orbiguild/contracts';
import { createFoundationStatus } from '@orbiguild/core';
import { RunnerConfigSchema } from './config.js';

function sendJson(response: ServerResponse, status: number, value: unknown) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    Connection: 'close',
    ...(status === 405 ? { Allow: 'GET' } : {}),
  });
  response.end(body);
}

function sendError(response: ServerResponse, status: number, error: HealthError['error']) {
  sendJson(response, status, HealthErrorSchema.parse({ error }));
}

export async function startRunner(input: unknown = {}) {
  // Validate before opening a socket. No hostname resolution or public binding.
  const config = RunnerConfigSchema.parse(input);
  let authority = '';
  const server = createServer({
    maxHeaderSize: 8192,
    headersTimeout: 2000,
    requestTimeout: 5000,
    connectionsCheckingInterval: 1000,
  }, (request, response) => {
    const hostCount = request.rawHeaders.filter((header, index) => index % 2 === 0 && header.toLowerCase() === 'host').length;
    const hasBrowserHeaders = request.rawHeaders.some((header, index) => index % 2 === 0
      && (header.toLowerCase() === 'origin' || header.toLowerCase().startsWith('sec-fetch-')));

    if (request.socket.remoteAddress !== config.host || hostCount !== 1
      || request.headers.host !== authority || hasBrowserHeaders) {
      sendError(response, 403, 'forbidden');
      return;
    }
    if (request.headers['transfer-encoding'] !== undefined
      || (request.headers['content-length'] !== undefined && request.headers['content-length'] !== '0')
      || !request.url?.startsWith('/') || request.url.includes('?') || request.url.includes('#')) {
      sendError(response, 400, 'bad_request');
      return;
    }
    if (request.method !== 'GET') {
      sendError(response, 405, 'method_not_allowed');
      return;
    }
    if (request.url !== '/health') {
      sendError(response, 404, 'not_found');
      return;
    }
    sendJson(response, 200, RunnerHealthSchema.parse({
      service: 'orbiguild-runner',
      protocolVersion: 1,
      status: 'ok',
      runner: createFoundationStatus(),
    }));
  });

  const errorBody = JSON.stringify(HealthErrorSchema.parse({ error: 'bad_request' }));
  const badRequest = `HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(errorBody)}\r\n\r\n${errorBody}`;
  server.on('clientError', (_error, socket) => {
    if (socket.writable) socket.end(badRequest);
    else socket.destroy();
  });
  server.on('checkContinue', (_request, response) => sendError(response, 400, 'bad_request'));
  server.on('checkExpectation', (_request, response) => sendError(response, 400, 'bad_request'));
  server.on('connect', (_request, socket) => socket.end(badRequest));
  server.on('upgrade', (_request, socket) => socket.end(badRequest));

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host: config.host, port: config.port, ipv6Only: config.host === '::1' }, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a loopback TCP address.');
  authority = `${config.host === '::1' ? '[::1]' : config.host}:${address.port}`;

  return {
    host: address.address,
    port: address.port,
    url: `http://${authority}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}
