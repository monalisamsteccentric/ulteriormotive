export function Architecture({ compact = false }: { compact?: boolean }) {
  return <figure className={`architecture-map ${compact ? 'compact' : ''}`} aria-label="Application signals pass through secure integrations, workflow orchestration and optional AI/data processing, then return to business applications. Observability and security span all layers.">
    <div className="diagram-label"><span className="signal-dot" /> SYSTEM BLUEPRINT <span>REF. UM—01</span></div>
    <div className="diagram-apps"><span><i>G</i>Workspace</span><span><i>J</i>Jira</span><span><i>Z</i>Zendesk</span><span><i>↗</i>Your APIs</span></div>
    <div className="diagram-connector"><span>EVENTS, REQUESTS & DATA</span></div>
    <div className="diagram-integration"><span className="node-index">01</span><div><b>Secure integration layer</b><small>OAuth · API contracts · webhooks · validation</small></div><span>↓</span></div>
    <div className="diagram-orchestrator"><span className="node-index">02</span><div><b>Workflow orchestration</b><small>Business rules. Reliable execution.</small></div><span className="orchestration-mark">⌘</span></div>
    <div className="diagram-branches"><div><span className="node-index">03.A</span><b>Decision intelligence</b><small>Classification · routing · human review</small><span className="optional-label">AI WHERE IT ADDS VALUE</span></div><div><span className="node-index">03.B</span><b>Data & analytics</b><small>Ingestion · transformation · reporting</small><span className="optional-label">INFRASTRUCTURE TO FIT</span></div></div>
    <div className="diagram-output"><span>↳ RESOLVED WORK</span><span>TRUSTED DATA ↲</span></div>
    <div className="diagram-foundation"><span>⊙ Observability</span><span>◇ Security</span><span>↻ Retries & recovery</span></div>
    {!compact && <figcaption>Reference architecture. Kafka, S3, Redshift and individual application connectors are selected during discovery, according to volume, compliance and your existing estate—not bundled indiscriminately.</figcaption>}
  </figure>;
}
