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

export const LOCAL_WEB_ORIGIN = 'http://127.0.0.1:5173';
export const LOCAL_RUNNER_URL = 'http://127.0.0.1:4319';
export const SecretSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const PairingStartSchema = z.strictObject({ protocolVersion: z.literal(1) });
export const PairingProofSchema = PairingStartSchema.extend({ challenge: SecretSchema });
export const PairingChallengeSchema = z.strictObject({
  protocolVersion: z.literal(1), challenge: SecretSchema,
  verificationCode: z.string().regex(/^[A-F0-9]{8}$/), expiresAt: z.number().int().positive(),
});
export const PairingPendingSchema = z.strictObject({ protocolVersion: z.literal(1), state: z.literal('pending') });
export const SessionSchema = z.strictObject({
  protocolVersion: z.literal(1), token: SecretSchema, expiresAt: z.number().int().positive(),
});
export const AcknowledgementSchema = z.strictObject({ protocolVersion: z.literal(1), ok: z.literal(true) });
export const AuthenticatedStatusSchema = z.strictObject({
  protocolVersion: z.literal(1), stage: z.literal('secure-local-connection'),
  state: z.literal('idle'), connectedAgents: z.literal(0), executionEnabled: z.literal(false),
});
export const ConnectionErrorSchema = z.strictObject({
  protocolVersion: z.literal(1),
  error: z.enum(['bad_request', 'forbidden', 'unauthorized', 'expired_or_invalid_challenge', 'rate_limited', 'not_found', 'method_not_allowed', 'unavailable']),
});
export type PairingChallenge = z.infer<typeof PairingChallengeSchema>;
export type ConnectionError = z.infer<typeof ConnectionErrorSchema>['error'];
