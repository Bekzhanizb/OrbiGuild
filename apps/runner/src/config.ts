import { z } from 'zod';

export const RunnerConfigSchema = z.strictObject({
  host: z.enum(['127.0.0.1', '::1']).default('127.0.0.1'),
  port: z.number().int().refine((port) => port === 0 || (port >= 1024 && port <= 65535), {
    message: 'Use port 0 or a port from 1024 through 65535.',
  }).default(4319),
});

const PortTextSchema = z.string().regex(/^(0|[1-9]\d{0,4})$/).transform(Number);

export function parseRunnerEnvironment(environment: Record<string, string | undefined>) {
  return RunnerConfigSchema.parse({
    host: environment.ORBIGUILD_RUNNER_HOST,
    port: environment.ORBIGUILD_RUNNER_PORT === undefined
      ? undefined
      : PortTextSchema.parse(environment.ORBIGUILD_RUNNER_PORT),
  });
}
