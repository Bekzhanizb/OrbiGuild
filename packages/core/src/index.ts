import { RunnerStatusSchema, type RunnerStatus } from '@orbiguild/contracts';

export function createFoundationStatus(): RunnerStatus {
  return RunnerStatusSchema.parse({ stage: 'foundation', state: 'idle', connectedAgents: 0 });
}

export function describeFoundationStatus(input: unknown): string {
  RunnerStatusSchema.parse(input);
  return 'Foundation / No connected agents';
}
