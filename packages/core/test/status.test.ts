import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFoundationStatus, describeFoundationStatus } from '../src/index.js';

test('foundation status is independent for each consumer and reports no activity', () => {
  const first = createFoundationStatus();
  const second = createFoundationStatus();
  assert.notEqual(first, second);
  assert.deepEqual(first, { stage: 'foundation', state: 'idle', connectedAgents: 0 });
  assert.equal(describeFoundationStatus(second), 'Foundation / No connected agents');
});

test('invalid or future activity cannot be presented as a foundation status', () => {
  assert.throws(() => describeFoundationStatus({ stage: 'foundation', state: 'running', connectedAgents: 1 }));
  assert.throws(() => describeFoundationStatus(undefined));
});
