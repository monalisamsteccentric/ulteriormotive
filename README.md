# Ulterior Motive

Two products in one Next.js App Router application, preserving AWS Amplify app `d1g6w5nbtfef3` (eu-north-1), branch `main`, and Supabase project `woyxnowfyhiedyplcspb`.

- `game.ulteriormotive.club`: anonymous human-versus-AI conversation and audience deduction.
- `automation.ulteriormotive.club`: enterprise systems consultancy and private inquiry intake.
- Apex and www: preserved brand doorway.

Released on 13 November 2026 through existing Amplify deployment 55 (application commit e3740d8). Migration 002 is applied to the existing Supabase project. See RELEASE_STATUS.md for live verification and the remaining invalid-AI-key limitation. AUDIT_AND_IMPLEMENTATION.md records the predeployment audit. DNS was already configured and was not changed.

## Development

Use Node 22 or newer and npm. `npm ci`, then `npm run dev` serves http://127.0.0.1:3100. Local paths are `/game` and `/automation`. Copy `.env.example` to `.env.local` for local overrides. Local accounts and real submitted data persist in ignored `.local/ulterior.sqlite`; they are not demonstration data. Do not reuse production credentials for local accounts.

`npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:browser` are the checks. The browser harness starts and stops its own production server with an isolated temporary database. On Windows it uses installed Chrome; elsewhere run `npx playwright install chromium` first. `BROWSER_PATH` can select an existing browser. No sibling project is required. The harness waits for real 60-second voting deadlines. AI responses in browser tests use an isolated network test double loaded only by the test process; application code always calls the configured real provider.

## Routing and hosting

Next.js is pinned to 15.5.29 because AWS currently documents managed Next.js support through 15. `src/middleware.ts` selects exact public hosts, including validated `x-forwarded-host` from Amplify. Rewrites in next.config.ts also cover product pages as a manifest fallback. Product links strip local prefixes on their own domain and use absolute URLs across products. Legacy `/game/*` and `/automation/*` URLs on their matching hosts redirect to clean paths. APIs and assets bypass rewriting. Unknown application paths return 404. Local and Amplify preview URLs retain prefixed routes. Preview robots disallow indexing.

Product metadata uses explicit canonical domains. Public sitemaps omit API, login and conversation URLs; conversation and login metadata are noindex. No middleware/database authorization depends on client-rendered links or hidden UI controls.

## Game rules and persistence

An AI match has one authenticated human and one model. A cryptographic random choice assigns the human to seat A or B. Seat A opens, then turns alternate for ten messages. Only the human receives their seat; the audience sees anonymous contenders, message UUIDs, status, total ballots and its own ballot. Human seat and vote distribution appear only after the server deadline. A host may open voting after two messages. Spectators can watch without an account; voting requires authentication.

Vote for the human contender during the 60-second window. One final ballot per account, participants excluded. Correct majority: audience wins. Incorrect majority: AI wins. Equal votes: draw. No ballots: no winner. Results persist with the conversation. Lobby polling is every 2.5 seconds; no raw-state Realtime publication is used.

Two-human rehearsal, scripted practice and optional loopback Ollama are preserved. Those legacy modes ask whether Contender 02 is human or artificial, with their original scoring. They are not randomly seated AI matches. No public launch claim should present scripted practice as model-generated AI.

AI generation uses a persisted lease and tail check to prevent duplicate replies on concurrent retries. Provider failures preserve messages, release the lease and offer retry. No synthetic reply substitutes for an AI failure. Models cannot execute tools. Conversation content is public and sent to the AI provider with provider response storage disabled. Do not put personal or confidential information in chat.

## Required production variables

Set these through the existing Amplify app environment, never source control:

| Variable | Value/purpose |
| --- | --- |
| DATA_BACKEND | `supabase` |
| SUPABASE_URL | `https://woyxnowfyhiedyplcspb.supabase.co` |
| SUPABASE_ANON_KEY | Existing project public/anon key, used by server Auth client |
| SUPABASE_SERVICE_ROLE_KEY | Existing project secret, server only |
| APP_ORIGIN | `https://game.ulteriormotive.club` |
| APP_ORIGINS | Exact comma-separated apex, www, game and automation HTTPS origins |
| AI_MODE | `openai` to enable real AI matches; `practice` for explicit training only |
| OPENAI_API_KEY | Valid server provider key; existing production key returned HTTP 401 during audit |
| OPENAI_MODEL | Explicit enabled model ID, for example `gpt-4.1-mini` if available to the account |

Existing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are accepted as a compatibility fallback, but server names above are preferred. Never make a service-role/provider key public. ENABLE_SUBDOMAIN_ROUTING is obsolete; known host routing is always active. Production does not silently fall back to SQLite or scripted AI.

`amplify.yml` uses Node 22, `npm ci`, `scripts/build-env.mjs`, then the production build. The helper validates the existing Supabase project and allowlists server variables into ignored `.env.production` without printing values. It fails on local storage or incomplete AI configuration. Every environment change requires an Amplify rebuild before SSR compute receives it. Keep the existing WEB_COMPUTE platform and archived blog branch.

## Supabase migration and access

The live database was inspected read-only: it exposes the existing `um_app_state` table, and anonymous raw-state reads are denied. Migration 001 is already installed; do not reset or recreate it. The release applied `supabase/migrations/002_relational_records.sql` to that same project. It was applied to the existing project during the authorized release; do not apply it a second time.

002 adds indexed, constrained relational records for profiles, matches, participants, messages, votes, results and inquiries. A PostgreSQL trigger projects each successful compare-and-swap state update into those tables in the SAME transaction and backfills existing records without deleting or replacing JSON state. Invalid projections roll back the state update. Duplicate ballots have a composite primary key, participant ballots are rejected, and identities/messages/ballots are immutable in the projection. Historical inquiry role/requirements may be null; new submissions require them at the API boundary.

All tables have RLS enabled with no anon/authenticated grants. Relational records are read-only to service_role; the restricted trigger maintains them. Server authorization and public response projections enforce per-user access. Do not add public policies or publish private tables to Realtime. Operator inquiries can be reviewed in `um_enterprise_inquiries` after migration; no public inquiry endpoint exists. `node scripts/inquiries.mjs` reads only the operator's local SQLite database and prints private information to that terminal.

Supabase Auth signup/login run on the server. Configure the existing project's Auth site URL as the game domain and its email confirmation settings. Sessions use random host-only HttpOnly, SameSite=Strict, production Secure cookies, seven-day server expiry and a hashed session index. Provider tokens and refresh tokens stay server-side; refresh is serialized and identity is checked against Supabase Auth. Logout deletes the server session and requests provider revocation. Local-only passwords use salted scrypt. Signup email delivery/confirmation and live refreshed sessions still need a staging/production verification with authorized test accounts.

## Enterprise product

Eight pages cover the proposition, services, architecture, eight-step delivery lifecycle, indicative INR 15 lakh starting engagement, about and contact. No testimonials, clients, results or certifications are invented. Pricing is in INR without an unverified dollar conversion.

The inquiry form requires name, business email, company, role, business problem and project requirements, plus an empty honeypot. Server validation, actual streamed body size limit, exact origin checks and rate limiting precede private persistence. Success is returned only after storage succeeds. Email notifications are not implemented or implied. Notifications are not needed for persistence; an operator must review stored inquiries.

## Release limits

The shared CAS state is deliberately preserved for data compatibility. Every mutation still reads/writes the aggregate; normalized projections improve constraints and inspection but do not remove this throughput bottleneck. This implementation has not been load-certified. Plan a separate transactional per-match storage migration before substantial traffic. Polling is bounded synchronization, not push Realtime. One account does not prove one human; moderation, bot resistance, retention and support processes remain operator responsibilities. Live AI validation is blocked by the invalid key. Supabase-backed login, identity validation, persistent cookies and logout were verified with temporary accounts; actual confirmation-email delivery and time-expired token rotation were not exercised live. Do not describe unverified external paths as passing.

Production hostname routing and real browser navigation were verified after Amplify deployment 55. See RELEASE_STATUS.md for the exact live verification scope.
