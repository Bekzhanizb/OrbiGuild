import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRunnerEnvironment, RunnerConfigSchema } from '../src/config.js';
import { startRunner } from '../src/server.js';

test('default configuration is a fixed IPv4 loopback port; IPv6 loopback is explicit', () => {
  assert.deepEqual(parseRunnerEnvironment({}), { host: '127.0.0.1', port: 4319 });
  assert.deepEqual(parseRunnerEnvironment({ ORBIGUILD_RUNNER_HOST: '::1', ORBIGUILD_RUNNER_PORT: '4320' }), { host: '::1', port: 4320 });
  assert.equal(RunnerConfigSchema.parse({ port: 0 }).port, 0);
});

test('unsafe bind addresses fail before listening', async () => {
  for (const host of ['0.0.0.0', '::', 'localhost', '127.0.0.2', '::ffff:127.0.0.1', '192.168.1.2', '', 'example.com']) {
    assert.throws(() => parseRunnerEnvironment({ ORBIGUILD_RUNNER_HOST: host }));
    await assert.rejects(startRunner({ host, port: 0 }));
  }
  await assert.rejects(startRunner({ host: '127.0.0.1', port: 0, command: 'disallowed' }));
});

test('ports reject ambiguous, privileged and out-of-range input', () => {
  for (const port of ['', ' 4319', '4319 ', '-1', '+4319', '1.5', '1e4', '0x10', '04319', '80', '65536', 'NaN']) {
    assert.throws(() => parseRunnerEnvironment({ ORBIGUILD_RUNNER_PORT: port }));
  }
  for (const port of [-1, 80, 65536, 1.5, Infinity, NaN, '4319']) {
    assert.equal(RunnerConfigSchema.safeParse({ port }).success, false);
  }
});
