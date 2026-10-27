import { parseRunnerEnvironment } from './config.js';
import { startRunner } from './server.js';
import { createInterface } from 'node:readline';
import { PairingAuthority } from './pairing.js';

try {
  const pairing = new PairingAuthority(Date.now, (code, origin) => {
    console.info(`Pairing request from ${origin}. Compare public verification code ${code} with your browser.`);
    console.info(`To allow read-only status for 15 minutes, type: approve ${code}`);
    console.info('Ignore unexpected requests. Challenges expire after 2 minutes.');
  });
  const runner = await startRunner(parseRunnerEnvironment(process.env), pairing);
  console.info(`OrbiGuild foundation health: ${runner.url}/health`);
  console.info('No agents are connected. No tasks can be executed.');
  console.info('Type revoke to revoke all sessions and pending requests.');
  const terminal = createInterface({ input: process.stdin, terminal: false });
  terminal.on('line', (line) => {
    const approval = /^approve ([A-F0-9]{8})$/.exec(line.trim());
    if (approval?.[1]) console.info(pairing.approve(approval[1]) ? 'Read-only pairing approved.' : 'Request unavailable or expired.');
    else if (line.trim() === 'revoke') { pairing.revokeAll(); console.info('All local connections revoked.'); }
    else console.info('Use approve followed by the displayed public code, or revoke.');
  });

  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    terminal.close();
    void runner.close().catch(() => { process.exitCode = 1; });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} catch {
  console.error('Runner could not start. Check the loopback host, port and whether the port is available.');
  process.exitCode = 1;
}
