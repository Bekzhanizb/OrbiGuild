import { parseRunnerEnvironment } from './config.js';
import { startRunner } from './server.js';

try {
  const runner = await startRunner(parseRunnerEnvironment(process.env));
  console.info(`OrbiGuild foundation health: ${runner.url}/health`);
  console.info('No agents are connected. No tasks can be executed.');

  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    void runner.close().catch(() => { process.exitCode = 1; });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} catch {
  console.error('Runner could not start. Check the loopback host, port and whether the port is available.');
  process.exitCode = 1;
}
