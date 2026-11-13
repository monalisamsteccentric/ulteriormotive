# Ulterior Motive - audit and recovery

Predeployment audit: 13 November 2026, Asia/Calcutta. The historical observations below describe the recovery before release. The user subsequently authorized deployment; see RELEASE_STATUS.md for current live status.

## Findings and evidence

The entire application source, routing, configuration, dependencies, migrations, API/auth/store/game logic, layouts, components, styling, operator script and existing tests were reviewed. This is a Next.js App Router app, not a Pages Router app; there are no server actions or separate hidden applications.

Read-only inspection confirmed:

- GitHub `monalisamsteccentric/ulteriormotive`, main baseline `f62862f`, matches the local prototype. Local Git metadata was missing; it was restored from the read-only production clone for reviewable diffs. No commit/push was made and archive/blog was not touched.
- Amplify app `d1g6w5nbtfef3`, eu-north-1, is WEB_COMPUTE and points to that repository. Production already had ENABLE_SUBDOMAIN_ROUTING=true and DATA_BACKEND=supabase. Therefore blaming only the local disabled flag would be incorrect.
- Direct HTTPS requests to game, automation, apex and the Amplify preview all returned HTTP 200 and the same brand title/heading. This confirms the wrong-homepage symptom independently of a successful build.
- The application used Next.js 16.4.6 and proxy.ts. AWS currently documents managed SSR Next.js support through 15. The old proxy depended on nextUrl.hostname and did not account for Amplify forwarding the public hostname; no host-conditioned rewrite fallback existed. This is a concrete framework/hosting compatibility defect and a header-handling gap. Which adapter step skipped the old proxy cannot be proved without a new deployed verification; the replacement addresses both issues.
- Product links always used /game or /automation, mixing product paths on subdomains. Canonical metadata, robots and sitemaps were absent.
- The game implemented a known human interviewer against a second human, a scripted bot, or loopback Ollama. It never implemented randomly positioned human-versus-AI deduction. Its identity ballot did not ask which of the two was human. Production AI_MODE was practice.
- Supabase's live REST schema exposed only um_app_state; version 1 was readable by the existing service credential. Anonymous raw-state SELECT returned 401. No production customer records or secrets were printed. No remote writes were made.
- Session expiry was capped to provider token expiry and had no refresh flow. Login therefore did not provide a durable provider-backed session.
- Inquiries persisted, but role and separate project requirements were missing. The delivery process had six stages, the website was light themed, and an unverified USD equivalent was displayed.
- The SSR environment allowlist excluded provider key/model settings. The existing OpenAI key returned 401 in a read-only model-access check.

## Implemented game

Supabase registration/login/logout are preserved and now support seven-day opaque server sessions with provider token rotation, a refresh lease and identity revalidation. Local development remains separate with salted scrypt accounts. Account and provider secrets are never returned in public user projections.

A real provider-backed AI mode assigns the human seat cryptographically at random. Seat A opens; both alternate up to ten messages. An authenticated host creates a unique persisted match; anonymous spectators watch it, signed-in spectators cast one immutable ballot for the human seat, and participants cannot vote. At a real server-enforced 60-second deadline, identities and distribution reveal, the majority/draw/no-vote outcome is calculated, and completed records remain accessible. The host may open voting after two messages. Lobby status filters and invite links work.

Polling synchronizes views every 2.5 seconds. Model generation is protected by a persisted lease and conversation-tail check. Concurrent retries produce one saved UUID reply; provider failures preserve the conversation, release the lease and offer retry. Real AI mode never silently uses scripted content. Practice, human rehearsal and local Ollama functionality are preserved with the original identity ballot and explicit mode descriptions.

Private IDs, human seat, opponent configuration, voter list and distribution remain absent from spectator responses until reveal. The player's own seat is intentionally private to that player. AI messages use ordinary UUIDs, not an identifying bot prefix.

## Implemented enterprise website

The independent automation product has a dark graphite visual system, responsive navigation, technical architecture diagram, service detail, illustrative workflow, eight-stage implementation lifecycle, INR 15 lakh starting engagement, about and contact. Services explicitly cover system architecture, AI workflows/agents, API and CRM integration, enrichment, data processing, reliability, security and monitoring. No clients, testimonials, certifications or results are invented.

Inquiries require name, business email, company, role, business problem and separate project requirements. Client/server validation, origin checks, streamed body limits, honeypot and rate limits precede private storage. Success only follows durable persistence. Operators review stored inquiries; email delivery is not claimed or implemented.

## Routing, deployment compatibility and security

Pinned Next.js/eslint-config-next to 15.5.29 and replaced proxy.ts with supported middleware.ts. The middleware accepts exact known hostnames, handles a validated forwarded host, preserves the apex/www doorway, keeps API/assets separate, canonicalizes legacy product prefixes and routes cross-product navigation correctly. Host-conditioned manifest rewrites provide an additional hosting fallback.

Product metadata and canonical URLs are explicit. Robots and sitemaps are host-aware. Login and conversation pages are noindex. Cross-product links resolve to their product domains; local development retains prefixed paths. Build-time SSR environment export validates the existing Supabase project and copies only an explicit allowlist without printing secrets. Amplify uses Node 22; production defaults to Supabase and never silently substitutes local state.

Cookies are HttpOnly, host-only, SameSite=Strict and Secure in production. Authorization and turn/ballot/deadline checks run on the server. Body and field bounds apply before writes; API responses are no-store. Patched PostCSS and a scoped lint dependency override remove dependency audit findings without changing the hosting provider.

## Additive migration

Created `supabase/migrations/002_relational_records.sql`; **not applied remotely**. Existing 001 and its state remain intact.

002 creates um_profiles, um_matches, um_participants, um_messages, um_votes, um_match_results and um_enterprise_inquiries. Keys, foreign keys, indexes, checked enums/body bounds and a unique match/user ballot constrain records. A restricted transactional trigger backfills and maintains relational projections from successful CAS state updates. It rejects participant ballots, ballot changes, message changes and identity reassignment. Failed projections roll back the whole state update. Historical inquiries are preserved even without the newly required fields.

All tables enable RLS. Anon/authenticated have no direct privileges; service_role reads the projections while the restricted trigger maintains them. The original private state remains accessible only to the server service role. Raw-state/private tables are not published to Realtime. Application authorization, not a browser-supplied user ID, determines who may mutate a match.

## Files changed

- Runtime/routing: package.json, package-lock.json, next.config.ts, eslint.config.mjs, tsconfig.json, src/styles.d.ts, amplify.yml, scripts/build-env.mjs, src/middleware.ts, src/lib/routing.ts; removed src/proxy.ts.
- Game/auth/data: src/lib/types.ts, game.ts, auth.ts, store.ts, opponent.ts; src/app/api/[...path]/route.ts; src/components/GameApp.tsx; game layouts, rules, login and match metadata.
- Website/metadata: src/components/ProductLink.tsx, AutomationShell.tsx, ContactForm.tsx; src/lib/metadata.ts; root/automation pages and layouts; src/app/globals.css, robots.ts, sitemap.ts, not-found.tsx. Brand content is preserved; its product links now use correct destinations.
- Database: added migration 002 only; no destructive migration or remote schema operation.
- Tests: extended game.test.ts/browser.mjs and added routing.test.ts, database.test.ts, opponent.test.ts, session.test.ts and an isolated test-only provider fixture. Playwright is now a direct development dependency, removing the old sibling-project dependency.
- Handoff: README.md, .env.example, IMPLEMENTATION_STATUS.md and this report. GO-LIVE-DNS-INSTRUCTIONS.txt was pre-existing local material and was left unchanged.

## Verification

- Production build: PASS, Next.js 15.5.29, no final build warnings.
- TypeScript and ESLint: PASS.
- Unit/security/database tests: 17 PASS. These execute actual PostgreSQL migrations locally with PGlite and verify RLS/grants for anon/authenticated, relational constraints, immutable ballots, participant exclusion, backfill and result scoring. Also cover both human seats, hidden projections, turns, concurrent model leases, provider failure/retry, serialized Supabase token refresh and revocation with network test doubles.
- Dependency audit: zero vulnerabilities, full and runtime-only audits.
- Browser/integration: 14 PASS, including production-hostname navigation over local transport, canonical metadata, all 12 pages, mobile layout/menu, durable inquiry fields, CSRF/body limits, registration/login/logout/persistence, human-room joining/chat, immutable audience voting, randomly seated AI conversation, both real voting deadlines and reveals, and no browser page exceptions. Tests use actual production build/server, isolated persisted test records, real UI actions and real one-minute voting clocks. AI provider requests use a test-only boundary fixture; this is not evidence that live AI credentials work.
- External checks: live wrong-homepage responses confirmed; existing Supabase schema/service access/anonymous denial checked read-only; live provider key rejected with 401.

## Required release configuration and limitations

README.md and .env.example list exact environment variables. Preserve DATA_BACKEND=supabase, existing project URL and server keys, trusted HTTPS APP_ORIGINS (including www), and set AI_MODE=openai, a valid OPENAI_API_KEY and an explicit OPENAI_MODEL. Configure the existing Supabase Auth site URL/email confirmation for the game domain. Review/apply migration 002 to the same project before release. A new authorized Amplify build is required to incorporate code/environment changes; none was triggered here.

Live Supabase signup/login/confirmation/refresh were not exercised with production test accounts; no such accounts were created. Provider success could not be tested with the invalid key. Model transport/parsing/failure/retry and complete AI game flow are tested with boundary doubles, not falsely reported as live-provider passes. No email notifications are implemented.

The existing singleton CAS aggregate is retained to preserve data and behavior. Relational projections add constraints and inspection, but each mutation still reads/writes the aggregate. It needs throughput/load evaluation and a separately planned per-match transactional storage cutover for substantial traffic. Polling is synchronized, not push Realtime. Moderation, coordinated-vote resistance, retention, backup/recovery operations and operational ownership remain release considerations. This is not a claim of high-volume production certification.

The live sites still run the old deployment. Correct behavior on Amplify after release remains unverified until explicitly authorized deployment. No infrastructure was replaced, no DNS was edited, no production records changed, and no archived blog content was overwritten.

## Sources used for compatibility and implementation

- AWS managed SSR compatibility: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- Next.js rewrite semantics: https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites
- Supabase refresh contract: https://supabase.com/docs/reference/javascript/auth-refreshsession
- OpenAI response schema: https://developers.openai.com/api/reference/resources/responses/methods/create
- Local PostgreSQL test API: https://pglite.dev/docs/api
