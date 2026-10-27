import { ConnectionPanel } from './ConnectionPanel.js';

export function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="OrbiGuild home">OrbiGuild</a>
        <span className="stage">Stage 01</span>
      </header>
      <main id="main" tabIndex={-1}>
        <p className="eyebrow">A workspace for real work</p>
        <h1>Secure local connection</h1>
        <p className="intro">
          Connect to your Local Runner with your approval. This connection only
          shows status; agent creation and execution remain future work.
        </p>
        <ConnectionPanel />
        <p className="reassurance">No account, API key or database setup is needed.</p>
        <a className="project-link" href="https://github.com/Bekzhanizb/OrbiGuild">
          Read the project documentation <span aria-hidden="true">↗</span>
        </a>
      </main>
      <footer>OrbiGuild · Open source · Local execution planned</footer>
    </>
  );
}
