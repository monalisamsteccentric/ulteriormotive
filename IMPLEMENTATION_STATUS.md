# Implementation status / next-agent entry point

Date: 12 November 2026 (Asia/Calcutta). Project: `C:\Users\abcom\Desktop\Diginess\ulterior-motive`.

## Objective and boundaries

Build a new local Next.js app for Ulterior Motive's conversation game and the independent enterprise automation business site. User explicitly confirmed no prior project folder exists. There is no old game implementation, existing Supabase schema or production configuration to audit/preserve in this project. No deployment, DNS, domain migration, SSL or production database operation is authorized or performed. This project is separate from Diginess CRM, simulator apps and the conversation exporter.

## Implemented

- Brand doorway, distinct dark game identity and ivory/green/orange automation identity; responsive navigation, keyboard focus and reduced-motion support.
- All eight commercial pages with detailed content, conditional/optional infrastructure, indicative price and no invented testimonials/customer evidence.
- Semantic architecture diagram, six-stage engagement process, contact validation/honeypot/origin/body/rate checks and private persisted submissions with honest no-email feedback.
- Local account auth, scrypt hashes, opaque HttpOnly cookies, server-side session expiration/logout; optional server Supabase Auth path.
- Match creation, second-human joining, alternating chat, observer access, hidden identity projection, scripted practice and optional Ollama generation/retry.
- Ten-message rounds, host opening after two messages, 60-second voting deadline, immutable audience-only ballots, reveal/win/tie/no-vote logic.
- Durable local SQLite CAS state and optional Supabase CAS implementation/additive private RLS schema. Secrets/state never directly queryable from browser.
- Unit/security tests, real browser multi-account tests, desktop/mobile screenshots, operator-only local inquiry reader and environment/deployment documentation.

## Code map and important invariants

- `src/app/api/[...path]/route.ts`: all API routing/validation, origin checks, signup/login/logout/contact and match actions. JSON capped by actual streaming read at 16 KiB. API errors have no-store responses.
- `src/lib/store.ts`: explicit backend selection, private singleton JSON state and revision compare-and-swap. Do not allow browser access to raw state or suppress Supabase failures with local fallback.
- `src/lib/game.ts`: pure state machine. Hidden opponent/guest/host identity and vote distribution only appear in the finalized result projection. Players cannot self-vote. Message IDs are idempotent within a room; conflicting content/author fails.
- `src/lib/auth.ts`: password/session/rate helpers. Public API always applies `publicUser`, never returns passwordHash/providerToken.
- `src/components/GameApp.tsx`: game shell/lobby/login/room client and polling. `types.ts` distinguishes private Match from PublicMatch.
- `src/components/ContactForm.tsx`: durable form, truthful feedback. `scripts/inquiries.mjs` is explicit operator-only read access.
- `src/app/automation/[section]/page.tsx`: seven interior pages; home is `automation/page.tsx`. `Architecture.tsx` is code-native diagram.
- `supabase/migrations/001_initial.sql`: new private table only; no migration applied remotely. Do not add public SELECT or publish raw state to Realtime.
- `src/proxy.ts`: exact-host future subdomain rewrites disabled unless explicitly configured. Not a deployment/DNS mechanism.

## API contracts

All POST routes require JSON and an exact configured Origin; cookie requests use same-origin credentials. Errors `{error, fields?}` with meaningful 400/401/403/404/409/413/415/429/500/503 status.

| Method / path | Input | Success |
|---|---|---|
| GET `/api/auth/me` | cookie optional | `{user:{id,name,email}|null,backend,aiMode}` |
| POST `/api/auth/register` | `{name,email,password}`; 12–200 char password | `{user}` + cookie, or `{confirmationRequired,message}` for Supabase email confirmation |
| POST `/api/auth/login` | `{email,password}` | `{user}` + newly minted cookie |
| POST `/api/auth/logout` | `{}` | `{ok:true}`; deletes exact server session and expires cookie |
| POST `/api/contact` | `{name,email,company,message,website?}`; message 20–5000 chars; honeypot must be empty | 201 `{id,message}`; durable record, no email claim |
| GET `/api/matches` | cookie optional | `{matches:PublicMatch[]}`; newest 100 |
| POST `/api/matches` | `{title,topic,opponent}`; human/practice/ollama | 201 `{match}`; auth required; local model mode must be configured |
| GET `/api/matches/:uuid` | cookie optional | `{match}`; settles expired vote lazily |
| POST `/api/matches/:uuid/join` | `{}` | `{match}`; available human seat only, no self-join |
| POST `/api/matches/:uuid/message` | `{text,id}`; UUID idempotency key, 1–1500 chars | `{match}`; correct active contender/turn only; replies saved before optional model generation |
| POST `/api/matches/:uuid/open-voting` | `{}` | `{match}`; host only, live and at least two messages |
| POST `/api/matches/:uuid/vote` | `{choice:human|ai}` | `{match}`; one audience ballot before deadline |
| POST `/api/matches/:uuid/retry-opponent` | `{}` | `{match}`; host only, nonhuman opponent, idempotent reply/tail guard |

`PublicMatch`: id, title, topic, status, messages `{id,seat,text,at}`, seat/turn, voteCount/myVote, version, createdAt/votingEndsAt, canRetryOpponent and result. No raw opponent mode/hostId/guestId/voter list/provider token before reveal. `result` includes identity, explicit opponent label (human/scripted/local model), humanVotes/aiVotes/fooled and winner. All timestamps epoch milliseconds.

## Verification record

- Dependency installation completed using Sites portable local helper; no Site registered/published.
- Production build passed, and a subsequent build removed the dynamic-path tracing warning using the explicit runtime-path tracing annotation.
- TypeScript check passed. ESLint passed after removing an unused type import.
- Eight unit/security tests passed: join exclusivity, hidden projection, turns/idempotency/spectator denial, voting gates, real deadline calculations, scoring, salted password checks and deterministic practice.
- Runtime dependency audit returned zero vulnerabilities. The full development audit reports seven moderate findings rooted in TypeScript ESLint's transitive minimatch. A non-forced `npm audit fix` was attempted and reported no applicable dependency changes; findings remain documented rather than forcing an unverified major dependency override.
- **All 9 browser/integration checks passed against the built Next server**: all 12 routes; desktop/mobile overflow/navigation; real contact submission and persisted record; CSRF/honeypot/oversize refusal; registration/room/join/two-human conversation and hidden projection; concurrent duplicate ballot with participant denial; actual 60-second deadline and reveal; scripted practice/idempotent replay/logout; zero browser page exceptions. The harness uses separate host/guest/observer contexts and a temporary SQLite DB, without shortcuts for the vote deadline. Accessible Password/Opponent names were clarified during browser validation.
- Screenshots reviewed: `.local/previews/automation-desktop.png`, `automation-mobile.png`, `game-room-desktop.png`; lobby screenshot also generated as `game-lobby-desktop.png`. No server or temporary test account database is left running by the test harness.

## External limits / pending work

1. No Supabase credentials/project supplied: remote Auth/RLS/CAS/email confirmation are implemented but not remotely verified; no real migrations applied.
2. No local Ollama/model supplied: adapter implemented but no real-model test. Scripted practice is NOT claimed to be model-generated AI.
3. No email provider/recipient supplied: contact storage works, email notifications not implemented. Operator inquiry command is available.
4. No deployment/registrar/production changes permitted. Intended subdomains documented in README; routes currently local paths.
5. Before public competitive release: moderation/reporting, verified-user/anti-sockpuppet protections, recovery/retention, storage scaling and operational security review. One account is not proof of one human; no scientific AI-detection claim.

## Resume / run

Read README first, then only the relevant modules above. `npm.cmd run dev` serves loopback port 3100. `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:browser`. The browser suite reuses sibling Journey Runner's Playwright and local Chrome, creates a uniquely owned temp DB and waits through a REAL one-minute vote; do not shorten production timing to make it pass. Test database and server are cleaned up. Screenshots remain in ignored `.local/previews`.

No Git commits or remote repositories have been created. The folder itself is the complete reviewable source; package-lock records installed dependencies. Keep `.local`, `.env.local`, session/provider tokens and contact information out of version control.
