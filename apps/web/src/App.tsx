import { createFoundationStatus, describeFoundationStatus } from '@orbiguild/core';

const statusLabel = describeFoundationStatus(createFoundationStatus());

export function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="OrbiGuild home">OrbiGuild</a>
        <span className="stage">Stage 00</span>
      </header>
      <main id="main" tabIndex={-1}>
        <p className="eyebrow">A workspace for real work</p>
        <h1>{statusLabel}</h1>
        <p className="intro">
          The foundation is here. Agent creation and an interactive office are planned
          for future stages.
        </p>
        <section className="empty-state" aria-labelledby="connection-heading">
          <span className="status-marker" aria-hidden="true" />
          <div>
            <h2 id="connection-heading">Your workspace is quiet</h2>
            <p>No agents are connected and no tasks are running.</p>
            <p>
              The Local Runner has a separate health check. Connecting this web
              interface to the runner is not implemented yet.
            </p>
          </div>
        </section>
        <p className="reassurance">No account, API key or database setup is needed.</p>
        <a className="project-link" href="https://github.com/Bekzhanizb/OrbiGuild">
          Read the project documentation <span aria-hidden="true">↗</span>
        </a>
      </main>
      <footer>OrbiGuild · Open source · Local execution planned</footer>
    </>
  );
}
