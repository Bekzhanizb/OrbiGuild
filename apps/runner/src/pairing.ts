import { createHash, randomBytes } from 'node:crypto';
import { LOCAL_WEB_ORIGIN, type PairingChallenge } from '@orbiguild/contracts';

export const CHALLENGE_TTL_MS = 120_000;
export const SESSION_TTL_MS = 15 * 60_000;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
type Pending = { code: string; expiresAt: number; approved: boolean; sessionHash?: string };

// One instance per runner process. No disk, logging, browser approval endpoint,
// automatic trust persistence, or execution capability.
export class PairingAuthority {
  private pending = new Map<string, Pending>();
  private sessions = new Map<string, number>();
  private windowStart = 0;
  private attempts = 0;
  constructor(private readonly now = Date.now,
    private readonly notify: (code: string, origin: string) => void = () => {}) {}

  private prune() {
    const now = this.now();
    for (const [key, value] of this.pending) if (value.expiresAt <= now) this.pending.delete(key);
    for (const [key, expiry] of this.sessions) if (expiry <= now) this.sessions.delete(key);
  }

  start(): PairingChallenge | undefined {
    this.prune();
    const now = this.now();
    if (now - this.windowStart >= 60_000) { this.windowStart = now; this.attempts = 0; }
    if (++this.attempts > 10 || this.pending.size >= 3 || this.sessions.size >= 5) return;
    const challenge = secret();
    let code: string;
    do { code = randomBytes(4).toString('hex').toUpperCase(); }
    while ([...this.pending.values()].some((entry) => entry.code === code));
    const expiresAt = now + CHALLENGE_TTL_MS;
    this.pending.set(hash(challenge), { code, expiresAt, approved: false });
    // The public code only selects a pending request at the trusted terminal.
    // It cannot be exchanged for a session over HTTP.
    this.notify(code, LOCAL_WEB_ORIGIN);
    return { protocolVersion: 1, challenge, verificationCode: code, expiresAt };
  }

  approve(code: string): boolean {
    this.prune();
    const pending = [...this.pending.values()].find((value) => value.code === code && !value.sessionHash);
    if (!pending) return false;
    pending.approved = true;
    return true;
  }

  complete(challenge: string) {
    this.prune();
    const pending = this.pending.get(hash(challenge));
    if (!pending || pending.sessionHash) return undefined;
    if (!pending.approved) return { protocolVersion: 1 as const, state: 'pending' as const };
    if (this.sessions.size >= 5) { this.pending.delete(hash(challenge)); return undefined; }
    const token = secret();
    const expiresAt = this.now() + SESSION_TTL_MS;
    pending.sessionHash = hash(token);
    this.sessions.set(pending.sessionHash, expiresAt);
    return { protocolVersion: 1 as const, token, expiresAt };
  }

  cancel(challenge: string) {
    const key = hash(challenge);
    const pending = this.pending.get(key);
    // Also revoke a concurrently issued session whose response was lost.
    if (pending?.sessionHash) this.sessions.delete(pending.sessionHash);
    this.pending.delete(key);
  }

  authorized(token: string): boolean { this.prune(); return this.sessions.has(hash(token)); }
  disconnect(token: string) { this.sessions.delete(hash(token)); }
  revokeAll() { this.pending.clear(); this.sessions.clear(); }
}
