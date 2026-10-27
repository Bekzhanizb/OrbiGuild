import {
  AcknowledgementSchema, AuthenticatedStatusSchema, ConnectionErrorSchema, LOCAL_RUNNER_URL,
  LOCAL_WEB_ORIGIN, PairingChallengeSchema, PairingPendingSchema, SessionSchema,
  type PairingChallenge,
} from '@orbiguild/contracts';
import type { LocalConnectionState } from '@orbiguild/core';

export type ConnectionView = { state: LocalConnectionState; message: string; verificationCode?: string };
class ApiFailure extends Error { constructor(readonly status: number) { super('Runner request rejected.'); } }

export class LocalConnection {
  private view: ConnectionView = { state: 'disconnected', message: 'Checking the Local Runner…' };
  private listeners = new Set<() => void>();
  private token: string | undefined;
  private challenge: PairingChallenge | undefined;
  private epoch = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private readonly transport: typeof fetch = fetch,
    private readonly origin = globalThis.location?.origin,
    private readonly autoPoll = true) {}

  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private show(view: ConnectionView) { this.view = view; for (const listener of this.listeners) listener(); }
  private reset() { this.epoch++; clearTimeout(this.timer); }
  private schedule(action: () => Promise<void>, epoch: number, delay: number) {
    if (this.autoPoll && this.epoch === epoch) this.timer = setTimeout(() => { void action(); }, delay);
  }
  private async request(path: string, body?: object, token?: string) {
    if (this.origin !== LOCAL_WEB_ORIGIN) throw new ApiFailure(403);
    const transport = this.transport;
    const response = await transport(`${LOCAL_RUNNER_URL}${path}`, {
      method: body ? 'POST' : 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(4000),
      headers: { 'X-OrbiGuild-Protocol': '1', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    if (text.length > 4096) throw new Error('Invalid response.');
    const data: unknown = JSON.parse(text);
    if (!response.ok) { ConnectionErrorSchema.parse(data); throw new ApiFailure(response.status); }
    return { status: response.status, data };
  }
  private failure(error: unknown) {
    this.token = undefined;
    if (error instanceof ApiFailure && error.status === 401) {
      this.show({ state: 'pairing-required', message: 'Approval expired or was revoked. Pair again to connect.' });
    } else if (error instanceof TypeError || (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))) {
      this.show({ state: 'disconnected', message: 'Runner unavailable. Start it, then check the connection again.' });
    } else {
      this.show({ state: 'error', message: error instanceof ApiFailure && error.status === 429
        ? 'Too many requests. Wait one minute before retrying.'
        : `Connection rejected or invalid response. Use ${LOCAL_WEB_ORIGIN} and check the runner.` });
    }
  }
  async refresh() {
    if (this.challenge) return;
    const epoch = this.epoch;
    if (!this.token) this.show({ state: 'connecting', message: 'Checking authenticated status…' });
    try {
      const result = await this.request('/v1/status', undefined, this.token);
      AuthenticatedStatusSchema.parse(result.data);
      if (this.epoch !== epoch) return;
      if (!this.token) throw new Error('Status requires a session.');
      this.show({ state: 'connected', message: 'Authenticated read-only connection. No agents are connected; execution is unavailable.' });
      this.schedule(() => this.refresh(), epoch, 5000);
    } catch (error) {
      if (this.epoch !== epoch) return;
      if (!this.token && error instanceof ApiFailure && error.status === 401) {
        this.show({ state: 'pairing-required', message: 'Runner requires local approval. Choose Pair with runner.' });
      } else this.failure(error);
    }
  }
  async pair() {
    this.reset();
    const epoch = this.epoch;
    this.show({ state: 'connecting', message: 'Requesting local approval…' });
    try {
      const result = await this.request('/v1/pairing/start', { protocolVersion: 1 });
      const challenge = PairingChallengeSchema.parse(result.data);
      if (this.epoch !== epoch) { await this.cancelProof(challenge); return; }
      this.challenge = challenge;
      this.show({ state: 'pairing-required', message: 'Compare this code with the runner terminal. Approve there only if both codes match. This request expires in two minutes.', verificationCode: challenge.verificationCode });
      this.schedule(() => this.complete(), epoch, 2000);
    } catch (error) { if (this.epoch === epoch) this.failure(error); }
  }
  async complete() {
    const challenge = this.challenge;
    if (!challenge) return;
    const epoch = this.epoch;
    try {
      if (Date.now() >= challenge.expiresAt) { await this.cancelProof(challenge); throw new ApiFailure(401); }
      const result = await this.request('/v1/pairing/complete', { protocolVersion: 1, challenge: challenge.challenge });
      if (result.status === 202) {
        PairingPendingSchema.parse(result.data);
        this.schedule(() => this.complete(), epoch, 2000); return;
      }
      const session = SessionSchema.parse(result.data);
      if (this.epoch !== epoch) { await this.revoke(session.token); return; }
      this.token = session.token;
      this.challenge = undefined;
      this.show({ state: 'connecting', message: 'Verifying authenticated status…' });
      await this.refresh();
    } catch (error) {
      if (this.epoch === epoch) { this.challenge = undefined; this.failure(error); }
    }
  }
  private async cancelProof(challenge: PairingChallenge) {
    const result = await this.request('/v1/pairing/cancel', { protocolVersion: 1, challenge: challenge.challenge });
    AcknowledgementSchema.parse(result.data);
  }
  private async revoke(token: string) {
    try {
      const result = await this.request('/v1/disconnect', { protocolVersion: 1 }, token);
      AcknowledgementSchema.parse(result.data);
    } catch (error) { if (!(error instanceof ApiFailure && error.status === 401)) throw error; }
  }
  async disconnect() {
    this.reset();
    const epoch = this.epoch;
    const challenge = this.challenge;
    const token = this.token;
    this.challenge = undefined; this.token = undefined;
    this.show({ state: 'disconnected', message: 'Disconnected here. Confirming revocation…' });
    try {
      if (challenge) await this.cancelProof(challenge);
      if (token) await this.revoke(token);
      if (this.epoch === epoch) this.show({ state: 'disconnected', message: 'Disconnected. Pair again when ready.' });
    } catch {
      if (this.epoch === epoch) this.show({ state: 'disconnected', message: 'Disconnected here; runner revocation could not be confirmed. Type revoke in its terminal, or wait for the 15-minute session expiry.' });
    }
  }
  dispose() { void this.disconnect(); }
}
