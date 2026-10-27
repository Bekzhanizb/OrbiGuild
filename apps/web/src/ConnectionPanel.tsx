import { useEffect, useState, useSyncExternalStore } from 'react';
import { connectionLabels } from '@orbiguild/core';
import { LocalConnection } from './connection.js';

export function ConnectionPanel() {
  const [connection] = useState(() => new LocalConnection());
  const view = useSyncExternalStore(connection.subscribe, connection.getSnapshot, connection.getSnapshot);
  useEffect(() => { void connection.refresh(); return () => connection.dispose(); }, [connection]);
  const busy = view.state === 'connecting';
  return (
    <section className="empty-state" aria-labelledby="connection-heading">
      <div>
        <h2 id="connection-heading">Local Runner</h2>
        <p role="status" aria-live="polite"><strong>{connectionLabels[view.state]}</strong> — {view.message}</p>
        {view.verificationCode && <p>Verification code: <code className="verification-code">{view.verificationCode}</code></p>}
        <div className="connection-actions">
          {!view.verificationCode && view.state !== 'connected' && <button disabled={busy} onClick={() => { void connection.pair(); }}>Pair with runner</button>}
          {(view.verificationCode || view.state === 'connected' || busy) && <button onClick={() => { void connection.disconnect(); }}>{view.state === 'connected' ? 'Disconnect' : 'Cancel pairing'}</button>}
          {!view.verificationCode && !busy && view.state !== 'connected' && <button onClick={() => { void connection.refresh(); }}>Check connection</button>}
        </div>
        <p>No agents are connected and no tasks are running.</p>
      </div>
    </section>
  );
}
