# Recovery status - 13 November 2026 (Asia/Calcutta)

The earlier local-prototype notes are superseded by README.md and AUDIT_AND_IMPLEMENTATION.md.

Work is in the original ulterior-motive folder. Read-only GitHub/Amplify/Supabase inspection confirmed this is the same source deployed from main (baseline f62862f). Local Git metadata was restored from a read-only clone to make the changes reviewable; no commit, push, deployment, DNS change or remote migration was performed. archive/blog was not modified.

Key changes: Next 15 supported Amplify runtime; middleware and rewrite fallback; clean product links and canonical metadata; randomly seated human-versus-AI mode; provider lease/retry; persistent Supabase refresh; complete enterprise contact fields; dark automation UI; additive constrained relational projections; broader security/integration tests. No provider secrets were saved into source or printed.

Production remains on its old code until a separately authorized release. Existing OpenAI key returned 401. Replace it and set AI_MODE/OPENAI_MODEL before expecting real model replies. Migration 002 is local only. See the audit report for final check outcomes and limitations.

## Subsequent authorized release

The user instructed "make it live". Release e3740d8 was pushed to main and deployed successfully as Amplify job 55. Migration 002 is applied and RLS verified live. Auth site_url now points to the game domain, preserving confirmations and MFA. See RELEASE_STATUS.md; the earlier no-deployment statements above describe the previous task boundary.
