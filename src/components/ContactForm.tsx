'use client';
import { useState, type FormEvent } from 'react';
export function ContactForm() {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, values = new FormData(form);
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(values)) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Could not save your inquiry. Please retry.');
      setSuccess(`${data.message} Reference: ${data.id}`); form.reset();
    } catch (e) { setError(e instanceof Error ? e.message : 'Connection failed. Please retry.'); } finally { setBusy(false); }
  }
  if (success) return <div className="contact-success" role="status"><span>↗</span><h2>A good place<br />to begin.</h2><p>{success}</p><button className="button dark" onClick={() => setSuccess('')}>Send another inquiry</button></div>;
  return <form className="contact-form" onSubmit={submit}><div className="form-row"><label>Your name<input name="name" autoComplete="name" minLength={2} maxLength={100} placeholder="Alex Morgan" required /></label><label>Work email<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="alex@company.com" required /></label></div><label>Company<input name="company" autoComplete="organization" minLength={2} maxLength={150} placeholder="Your organization" required /></label><label>Your role<input name="role" autoComplete="organization-title" minLength={2} maxLength={150} placeholder="Head of operations" required /></label><label>Business problem / what would you like to make work better?<textarea name="message" minLength={20} maxLength={5000} rows={6} placeholder="Tell us about your workflows, applications, and where the friction is." required /></label><label>Project requirements<textarea name="requirements" minLength={20} maxLength={5000} rows={4} placeholder="Systems to integrate, scope, constraints, and desired outcomes." required /></label><div className="honeypot" aria-hidden="true"><label>Website<input name="website" autoComplete="off" tabIndex={-1} /></label></div><p className="form-note">We store the details you submit to review your requirement. Please don’t include passwords, API keys or sensitive customer information. No marketing opt-in is assumed.</p>{error && <p role="alert" className="form-error">{error}</p>}<button className="button orange" disabled={busy}>{busy ? 'Saving inquiry…' : 'Start the conversation'} <span>↗</span></button><small>Submissions are saved securely on the server. Email delivery is not configured.</small></form>;
}
