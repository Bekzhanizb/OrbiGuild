import { z } from 'zod';

// Stage 00 deliberately cannot represent a connected agent or execution.
export const RunnerStatusSchema = z.strictObject({
  stage: z.literal('foundation'),
  state: z.literal('idle'),
  connectedAgents: z.literal(0),
});

export const RunnerHealthSchema = z.strictObject({
  service: z.literal('orbiguild-runner'),
  protocolVersion: z.literal(1),
  status: z.literal('ok'),
  runner: RunnerStatusSchema,
});

export const HealthErrorSchema = z.strictObject({
  error: z.enum(['bad_request', 'forbidden', 'not_found', 'method_not_allowed']),
});

export type RunnerStatus = z.infer<typeof RunnerStatusSchema>;
export type RunnerHealth = z.infer<typeof RunnerHealthSchema>;
export type HealthError = z.infer<typeof HealthErrorSchema>;
