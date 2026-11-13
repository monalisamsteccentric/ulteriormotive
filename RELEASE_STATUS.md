# Live release - 13 November 2026 (Asia/Calcutta)

Both product domains are live through the original AWS Amplify app and original Supabase project.

- Game: https://game.ulteriormotive.club
- Enterprise automation: https://automation.ulteriormotive.club
- Brand/apex: https://ulteriormotive.club
- Brand/www: https://www.ulteriormotive.club

## Release record

Application commit: `e3740d87588f988053111772ac7be142ec6eb43c` on main.
Amplify app: `d1g6w5nbtfef3`, eu-north-1, WEB_COMPUTE.
Amplify job: **55 - SUCCEED** (BUILD, DEPLOY and VERIFY all succeeded).
Supabase: `woyxnowfyhiedyplcspb`, unchanged.
Migration: `002_relational_records.sql` applied to the existing project; do not reapply.
Archive/blog ref remains `76acf8a1ff80229f3981cb1f9eb46c451493195c`.
No infrastructure replacement or DNS edits were performed.

The existing Amplify console build override was updated to match repository amplify.yml. Existing environment variables were preserved; trusted origins now include www, APP_ORIGIN points to the game domain and an explicit model setting is prepared. The existing Supabase Auth site_url changed from localhost to https://game.ulteriormotive.club; email-confirmation and MFA settings were preserved.

## Production verification

Live checks passed for:

1. Separate game/automation homepages and preserved apex/www brand pages.
2. All enterprise pages, game rules/login, clean-path navigation, correct canonical metadata and sitemap.
3. Three temporary confirmed Supabase accounts: password login, persistent authenticated sessions and identity validation.
4. Persisted human-room creation, second-player joining, alternating messages and spectator watching.
5. Hidden live identities, spectator message denial, one immutable ballot, duplicate-vote denial and participant-vote denial.
6. A real 60-second vote, timed reveal, correct audience winner and relational result storage.
7. Enterprise inquiry submission and its private relational record, including role and project requirements.
8. Explicitly scripted practice reply and server-side logout revocation.
9. Real Chrome desktop/mobile layout, mobile menu, cross-product navigation, loaded scripts and zero observed browser console exceptions or server 5xx responses.
10. RLS enabled on all eight public tables; anon/authenticated direct SELECT privileges denied.

All synthetic test accounts, their aggregate records/sessions, both test matches, the test inquiry and corresponding relational records were removed. Cleanup was restricted to owned UUIDs; the final check found zero remaining test matches, inquiries or profiles.

Local recovery checks also passed: production build, TypeScript, ESLint, 17 unit/security/database tests, 14 browser/integration checks and zero dependency-audit vulnerabilities.

## Remaining AI configuration

**Real AI matches are not enabled.** The existing OPENAI_API_KEY returned HTTP 401. AI_MODE remains practice, with scripted practice and human rehearsal explicitly described. A synthetic provider was used only in local automated AI tests; no live-model success is claimed.

To activate AI, replace OPENAI_API_KEY securely in the existing Amplify app, set AI_MODE=openai and an enabled OPENAI_MODEL (the current prepared setting is gpt-4.1-mini), then rebuild main. Do not paste or commit secrets. Once a valid key is supplied, a live AI conversation/reveal still needs verification.

Actual signup confirmation-email delivery and time-expired token rotation were not tested live. The Auth redirect is corrected; login/logout were verified. Enterprise inquiry email notifications are not implemented; inquiries are stored for operator review.

The retained aggregate CAS backend has not been load-certified. Relational constraints and polling are in place; higher traffic still requires throughput evaluation and a separately planned per-match transactional cutover. See README.md for operational limits and AUDIT_AND_IMPLEMENTATION.md for the historical predeployment audit.

The documentation-only follow-up commit uses AWS's supported [skip-cd] marker so recording these results does not start another deployment.
