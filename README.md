# Ulterior Motive — Systems & Signals

A new, independent Next.js/TypeScript project containing a playable conversation game and an enterprise automation sales website. There was no existing Ulterior Motive repository, deployment configuration, Supabase project or game data in the supplied project context. No pre-existing game was replaced or repaired; the user explicitly requested a new folder. Existing Diginess projects and the exporter remain untouched.

**Local-only. Nothing has been deployed. No DNS, domain, SSL, existing database or production infrastructure has been changed.**

## Run

Requirements: Node with `node:sqlite` (Node 24+ recommended; tested with Node 26), npm, and a modern browser.

```powershell
Set-Location 'C:\Users\abcom\Desktop\Diginess\ulterior-motive'
npm.cmd install
npm.cmd run dev
```

Open:

- Brand doorway: http://127.0.0.1:3100
- Game lobby: http://127.0.0.1:3100/game
- Game rules: http://127.0.0.1:3100/game/rules
- Automation business: http://127.0.0.1:3100/automation
- Contact: http://127.0.0.1:3100/automation/contact

No environment file or external credentials are required for the local edition. It creates `.local/ulterior.sqlite` with additive initialization, never resets an existing file, and keeps accounts, sessions, matches, ballots and inquiries across restarts. Register your own account; there are no default credentials. The local edition does not verify email ownership or send email. Choose a unique local-testing password.

For a production-build **local** check, run `npm.cmd run build`, then `npm.cmd start`. This still serves loopback only. The servers used by automated tests are stopped after verification; the commands above start your own persistent local session.

## What works

### The game

- Registration, login and server-revocable logout with scrypt-hashed local passwords and opaque, hashed-at-rest HttpOnly/SameSite cookies. Login rotates to a new random session ID; local sessions expire after 12 hours.
- Match creation, open human seats, joining from a separate account, live conversation updates, alternating turns and server-enforced participant permissions.
- An out-of-the-box **scripted practice opponent**, explicitly distinguished from a language model. Practice replies are not represented as real AI generation. A local Ollama model adapter is available when configured.
- Maximum 10 conversation messages, automatic voting, or host-opened voting after at least two messages.
- One immutable ballot per authenticated audience account, no votes from either contender, a server-enforced 60-second voting deadline, and accurate hidden-identity reveal/results.
- Match state and ballots persist. Viewers poll normal server APIs; expired voting rounds settle on the next read, so no cron is required. This is polling, not a Supabase Realtime subscription.
- Public projections exclude account IDs/names, opponent mode, ballot choice totals and identity until the reveal. Only the host receives a narrowly computed model/practice-retry action flag.
- Loading, empty, retry/error, invalid-room, copy-link, connection and form states, mobile layouts and keyboard focus styles.

**Explicit new-project mechanics:** Contender 01 is a human interviewer. The host chooses a human, practice bot or configured local model for Contender 02. The audience judges Contender 02. That contender wins if the majority guesses incorrectly; the audience wins if the majority is correct. A tie is a draw; zero votes means no winner. The interviewer is not given a separate scoring system. These assumptions are documented because there was no existing game implementation to inspect.

To play with friends locally on the same machine, use separate browser profiles/incognito sessions and create separate accounts. Copy the room link. Another signed-in person takes the human seat; additional accounts observe and vote. Loopback binding intentionally does not expose the server to your LAN.

### Enterprise automation website

Eight complete routes with distinct editorial content and responsive design:

| Page | Route |
|---|---|
| Home | `/automation` |
| Enterprise Solution | `/automation/solution` |
| Capabilities | `/automation/capabilities` |
| Architecture | `/automation/architecture` |
| Implementation Process | `/automation/process` |
| Pricing / Engagement | `/automation/pricing` |
| About | `/automation/about` |
| Contact | `/automation/contact` |

The capability content covers Workspace; Jira/Zendesk/Zoho/REST/webhook/OAuth integration; ticket classification, routing and review; trends/anomalies/reporting; data ingestion/transformation; optional Kafka/S3/Redshift; and production reliability/security/monitoring/testing. It explains value and prerequisites without claiming integrations have already been implemented for a client. The architecture diagram is semantic HTML/CSS with a descriptive figure and optional-component explanation, not an image with inaccessible text.

The engagement is indicatively ₹15 lakh / approximately US$16,000, subject to discovery. The dollar equivalent is the user-supplied indicative amount, not a live exchange-rate claim. Third-party subscriptions, cloud/API/model usage and ongoing support can cost extra. No client logos, testimonials, case studies, guaranteed timelines or savings claims are fabricated.

The contact form validates and **persists** name, email, company and requirement. A honeypot, bounded requests, origin checks and shared/email-specific rate limits mitigate basic abuse. Confirmation states that the inquiry is saved and **no email has been sent**. No lead delivery integration is silently simulated.

Operator-only local inquiry inspection:

```powershell
node scripts/inquiries.mjs
```

This prints private inquiry records to the operator terminal, deliberately not a public API. In Supabase mode inspect the private state with authorized dashboard access. Email notification/CRM handoff can be added behind the existing durable contact contract; credentials/provider choice are not available in this project.

## Structure and implementation

```text
src/app/                     Next App Router pages, layouts, CSS and API handler
  automation/                Independent enterprise experience, 8 pages
  game/                      Lobby, login, rules and match rooms
  api/[...path]/route.ts      Validated, origin-checked server operations
src/components/              Game client, shells, contact form and architecture figure
src/lib/game.ts              Pure game state transitions and public projections
src/lib/auth.ts              Password/session helpers and rate limits
src/lib/store.ts             SQLite / Supabase compare-and-swap persistence
src/lib/types.ts             Private state and public response contracts
src/proxy.ts                 Disabled-by-default future subdomain rewrites
supabase/migrations/         Additive, new-project schema (not applied remotely)
scripts/inquiries.mjs        Operator-only read-only contact inspection
tests/                      Logic/security tests and real multi-context browser flows
.local/                     Ignored runtime database and generated screenshots
```

Stack: Next.js 16 App Router, React 19, TypeScript, CSS, Zod, Node SQLite, Node crypto and optional Supabase JS. No other application framework is introduced. Fonts use Google Fonts CSS with system/Georgia fallbacks; the app functions if remote fonts are unavailable.

The persistence format is a versioned private JSON document. Every update uses a database compare-and-swap on the server revision, retrying conflicts. This serializes room, ballot, session and contact mutations across processes and across Supabase requests. It is an intentionally simple small-application/local architecture, not a high-scale multiplayer storage claim. Normalized per-match tables, bounded archival and finer-grained contention control are appropriate before large public use.

## Optional Supabase integration

Use your own NEW Supabase development project. No Supabase credentials were provided and remote behavior was not exercised.

1. Review and apply `supabase/migrations/001_initial.sql` to that project through the SQL editor or your own migration workflow. It creates only `um_app_state` and inserts its initial state on conflict-do-nothing; it does not modify unrelated existing tables.
2. Copy `.env.example` to `.env.local` and configure the named server variables. Select the Supabase backend.
3. Start the app. Registration/login use Supabase Auth, including its email-confirmation behavior; authenticated account IDs map into the private game state.
4. Server-side `getUser` validates provider access tokens. App sessions expire at the earlier of 12 hours and provider-token expiry; reauthentication is required rather than silently claiming token refresh is implemented.

Configure the Supabase Auth Site URL and allowed confirmation redirects for your intended app origin and `/game/login` page. After email confirmation the user signs in normally; this project does not claim to have configured your Supabase dashboard or external email transport.

The table has RLS enabled and no public/authenticated access grants. Only the server service-role client reads/writes the raw state. **Never expose the service role in `NEXT_PUBLIC_*`, browser JavaScript or a Realtime publication.** Raw state contains the unrevealed opponent identity, server sessions and contact data. Do not add public RLS read access just to make the UI work; the Next API emits restricted projections.

No local-to-Supabase account import is performed: local password hashes and unverified emails must not silently become verified Supabase identities. Backend selection is explicit and fails on missing configuration; it does not fall back to SQLite after a Supabase failure. Back up data and design an audited migration if transferring real records later.

## Optional real local-model opponent

Install/run Ollama on your own machine and obtain a model appropriate for your hardware. Configure the AI mode, local base URL and model name in `.env.local`; restart the server. The create-room form then offers a local-model opponent. It uses the official `/api/chat` JSON contract with non-streamed replies and a bounded timeout. Only loopback model hosts are accepted. No hosted paid AI endpoint or API key is used.

If a model fails, the human message stays saved, the API reports the failure and the host can retry. A guarded reply ID/tail check prevents duplicate replies. The implementation never silently substitutes the practice bot for an unavailable model. An actual installed-model run is pending because no Ollama/model runtime was supplied.

## Environment variable names

| Name | Purpose |
|---|---|
| `APP_ORIGIN` | Primary exact origin for CSRF checks and secure cookie selection |
| `APP_ORIGINS` | Optional comma-separated exact origins for a future same-site multi-domain setup |
| `DATA_BACKEND` | Explicit persistence/auth backend selection |
| `DATABASE_PATH` | Operator-controlled local SQLite location |
| `SUPABASE_URL` | Supabase project endpoint, server only |
| `SUPABASE_ANON_KEY` | Supabase Auth public project key, used by server client |
| `SUPABASE_SERVICE_ROLE_KEY` | Private server persistence credential |
| `AI_MODE` | Practice or configured local model mode |
| `OLLAMA_BASE_URL` | Operator-configured loopback model endpoint |
| `OLLAMA_MODEL` | Installed local model name |
| `ENABLE_SUBDOMAIN_ROUTING` | Opt-in future host-based rewrites |
| `PLAYWRIGHT_MODULE`, `BROWSER_PATH`, `TEST_PORT` | Optional developer browser-test overrides |

Actual credentials never belong in committed files, test evidence or screenshots. Keep `.env.local`, SQLite files and inquiry data private. Local SQLite currently relies on the operator filesystem boundary; apply OS access controls and encrypted backups appropriate to deployment sensitivity.

## Testing

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
```

Browser tests reuse this workspace's installed Playwright at `../Journey Runner/node_modules/playwright/index.mjs` and local Chrome. No browser/package installation is performed by the tests. Overrides are documented in the environment table. Build first; the test starts a production-build **loopback** server on its test port with a uniquely owned temporary SQLite database, isolated browser contexts and synthetic accounts, then cleans up its child/browser/database. It never reads the normal app database or a user's browser profile.

The suite uses real registration, room creation/join, alternating chat and spectator permissions, concurrent ballot requests, and the **real 60-second voting deadline**. It also verifies route navigation, mobile overflow/menu behavior, actual saved contact records, honeypot/CSRF/body limits, practice message replay, reveal and logout revocation. Screenshots are saved under ignored `.local/previews`.

See `IMPLEMENTATION_STATUS.md` for actual results, review findings, external verification limits and continuation context. Automated tests are evidence of the covered behavior, not proof that all possible security/abuse issues are absent.

## Future hosting and domains — no deployment performed

Intended domains are `ulteriormotive.club`, `game.ulteriormotive.club` and `automation.ulteriormotive.club`. The new app currently uses independent path prefixes on one local Next server. Optional exact-host rewrites are present in `src/proxy.ts` and disabled by default. They do not create domains, certificates or hosting resources.

Before any separately authorized deployment: choose a Next-compatible **Node runtime** and durable storage, review the Supabase migration/RLS/auth settings, configure exact HTTPS origins, secure cookies and trusted proxy handling, configure server secrets and email delivery, review privacy/retention and abuse controls, and test host rewrites/navigation in staging. SQLite files on ephemeral serverless disks are not durable shared storage; use the reviewed Supabase path or a suitable persistent single-node service. This is not a static export.

Only after explicit authorization should an operator configure provider project/domain mappings and DNS using the actual hosting targets returned by that provider. No CNAME/A targets or SSL status are invented here. There is no existing game production URL or configuration in this new repository to migrate. Keep the brand/game/business logically separate even if hosted by the same Next application.

Known production gaps: verified-human anti-sockpuppet controls, account recovery, moderation/reporting and abuse response, large-scale normalized persistence/archival, retention/deletion tooling, real email delivery, actual Supabase integration validation and actual local-model validation. These do not block the local human/practice gameplay or commercial-site contact storage; they do block a claim of public production readiness.
