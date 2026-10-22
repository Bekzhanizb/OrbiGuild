import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HealthErrorSchema, RunnerHealthSchema, RunnerStatusSchema } from '../src/index.js';

const status = { stage: 'foundation', state: 'idle', connectedAgents: 0 };
const health = { service: 'orbiguild-runner', protocolVersion: 1, status: 'ok', runner: status };

test('health survives JSON transport and validates nested runner status', () => {
  const received: unknown = JSON.parse(JSON.stringify(health));
  assert.deepEqual(RunnerHealthSchema.parse(received), health);
});

test('contracts reject incompatible versions, extra fields and invented activity', () => {
  for (const invalid of [
    { ...health, protocolVersion: 2 },
    { ...health, secret: 'must-not-be-accepted' },
    { ...health, runner: { ...status, connectedAgents: 1 } },
    { ...health, runner: { ...status, state: 'running' } },
    { ...health, runner: { ...status, connectedAgents: '0' } },
    { ...health, runner: { ...status, taskId: 'invented' } },
    { status: 'ok' },
    null,
    'ok',
  ]) {
    assert.equal(RunnerHealthSchema.safeParse(invalid).success, false);
  }
  assert.equal(RunnerStatusSchema.safeParse({ ...status, stage: 'production' }).success, false);
});

test('errors have a bounded vocabulary and cannot include debug or secret fields', () => {
  assert.deepEqual(HealthErrorSchema.parse({ error: 'bad_request' }), { error: 'bad_request' });
  assert.equal(HealthErrorSchema.safeParse({ error: 'failure', stack: 'private' }).success, false);
});
