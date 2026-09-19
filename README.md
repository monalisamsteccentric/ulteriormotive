# Ulterior Motive

A fresh Next.js MVP for a gamified content-discovery mosaic. The previous application's working tree has been replaced; Git history is preserved.

## Develop entirely in GitHub Codespaces

Open this repository on GitHub, choose **Code > Codespaces > Create codespace on main**. The dev container provides Node 22 and installs the committed dependency lockfile. No software is required on your computer.

Inside the Codespace terminal:

```sh
cp .env.example .env.local
npm run dev
```

Set the variables below using the Codespace editor or Codespaces secrets. Open forwarded port 3000 in your browser. Keep the forwarded port private for development. Never commit real environment files or credentials.

| Variable                       | Purpose                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| NEXT_PUBLIC_SUPABASE_URL       | Supabase project's HTTPS API URL                                   |
| NEXT_PUBLIC_SUPABASE_ANON_KEY  | Public anon/publishable API key                                    |
| SUPABASE_SERVICE_ROLE_KEY      | Server-only service-role/secret key; never prefix with NEXT_PUBLIC |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | Cloudflare Turnstile public site key                               |

The app builds without credentials, but backend operations return a clear setup message until Supabase is configured. Empty installations show an illustrative preview, not fabricated participants or analytics. No seed content is published.

## Supabase setup

Use a **new Supabase project**. This migration defines a fresh schema and is not an upgrade for the obsolete application's database. The rebuild does not delete data in an existing Supabase project.

1. In the Supabase dashboard, open SQL Editor and run `supabase/migrations/202609190001_initial.sql`.
2. In Authentication, enable anonymous sign-ins. Disable public email signups if they are not needed; invite/create administrator accounts from the dashboard.
3. Enable Cloudflare Turnstile CAPTCHA for Auth. Add the site's domain and Codespaces preview hostname to the Turnstile widget's allowed hostnames. Configure the CAPTCHA secret in Supabase, and the public site key in application environment settings. Set reasonable Auth signup and sign-in rate limits.
4. Create/invite the first administrator using Supabase Authentication. Copy its user UUID into this query and run it in SQL Editor:

```sql
insert into public.admins(user_id) values ('YOUR_ADMIN_USER_UUID');
```

5. Sign in at `/admin`. Add content, set its order, and enable it. Upload optional editorial photos in their separate section.
6. Review the privacy and terms copy for your organization and jurisdiction before inviting participants; replace the generic operator/contact wording with your actual identity and contact channel.

Storage buckets `participant-photos` and `admin-photos` are private. Do not add public policies or make the buckets public. The server re-encodes accepted JPEG/PNG/WebP uploads to 640x640 WebP, strips metadata, and assigns random paths. Maximum source size is 5 MB and decoded images are limited to 25 megapixels. Participant photo uploads put the tile into pending moderation. Built-in colour avatars appear immediately.

## Participant experience

- Explicit consent (version 2026-09-19), age confirmation and image permission are required.
- Supabase anonymous Auth persists the participant session in this browser. No email or password is collected from participants. Clearing browser data loses access; no cross-device recovery is promised.
- Public tiles show display name, avatar/photo and progression only. Hidden and pending participants are excluded.
- Opening each distinct, enabled content item earns one discovery. Duplicate and concurrent opens cannot inflate rewards. A visit measures an outbound open, not reading completion.
- Levels start at 0, 1, 3, 6 and 10 discoveries. Tile footprints grow from 1x1 to 2x1 at 3 discoveries and 2x2 at 10. Mosaic positions are not guaranteed.
- Deleting content retains earned participant growth. Participant deletion removes that participant's visit history from analytics.
- Delete my data hides the tile first, removes all images in the account's storage folder, then deletes the Auth user. Foreign keys cascade to its profile and visits. Failures remain retryable.
- Already issued signed image links expire within five minutes. External copies and provider backups cannot be immediately revoked.
- Editorial photos belong to a separate table/bucket and earn no progress.

## Administrator studio

`/admin` supports password sign-in, a server-verified administrator allowlist, content creation/editing/deletion/enable-disable, transactional ordering, participant photo approval/hiding, separate editorial uploads and ordering, and aggregate analytics. Use a separate browser profile for admin and participant sessions.

The MVP supports up to 500 content items and 100 editorial photos. The public mosaic shows up to 120 approved participants ordered by discoveries and 40 enabled editorial photos. Participant moderation is paginated in groups of 50. Analytics include total participants, unique discoveries, pending photos, enabled content, 30-day discovery counts and per-content visits.

## Security model

All application tables have RLS enabled, with **no direct anon/authenticated access**. The server API verifies Supabase access tokens on every private operation. Admin routes also require a non-anonymous Auth user in the admin allowlist. Browser requests never contain the service-role key.

Database functions for rate limits, rewards, analytics and ordering are restricted to service_role. Reward updates and content reordering are transactional. Rates persist across server instances and fail closed on database errors. Limits: 90 participant API calls/minute, 120 admin calls/minute, 20 discovery attempts/minute, 5 participant uploads/minute, 10 admin uploads/minute. Public reads use a hashed forwarded-IP key at 120/minute. Rate-limit rows expire and are pruned on subsequent requests.

Supabase Auth CAPTCHA and signup limits are mandatory production controls: per-account limits alone cannot prevent account creation abuse. Configure AWS WAF or equivalent edge limits for public API traffic; forwarded-IP limits are defense in depth, not trusted identity. App-managed rate-limit keys contain hashes rather than raw IP addresses.

Mutations require bearer tokens, reject cross-site browser requests, enforce request size limits, validate inputs, and reject local/non-HTTPS content destinations. Image bytes are decoded/re-encoded rather than trusting file extensions. Photo changes cannot override a concurrent moderation hide. Restrictive headers cover framing, object embedding, MIME sniffing and referrers. CSP allows inline framework scripts/styles; it does not use per-request nonces.

## AWS Amplify deployment

1. In AWS Amplify Hosting, connect this GitHub repository and select `main`.
2. Select the Next.js SSR hosting platform. This app uses the latest installed Next.js 15 patch because Amplify's documented managed support covers versions 12x15.
3. Set the four environment variables above in Amplify's environment settings. Protect access to the server-only service-role key.
4. Amplify uses `amplify.yml`: Node 22 > `npm ci` ? required-environment validation ? typecheck/tests ? production build.
5. The environment script writes only the four named variables to the untracked `.env.production` for Next.js server runtime availability. The server-only secret is not a NEXT_PUBLIC variable and must never be used in client code. Restrict build-artifact, log and Amplify-console access because runtime credentials are available to trusted build/hosting infrastructure.
6. Configure Supabase Auth site URL and Turnstile allowed hostnames for the deployed domain. Invite admins, publish content and complete the launch checks below.

The repository includes deployment configuration, but creating the AWS/Supabase resources and setting their secrets requires access to those services. No existing service credentials are reused by this replacement.

Official references: [Amplify Next.js support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html), [SSR environment variables](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html), [Supabase anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous).

## Validation in Codespaces

```sh
npm run check
npx playwright install --with-deps chromium
npm run test:e2e
npm audit
```

- Domain tests check progression boundaries, consent and destination validation.
- SQL tests run the real migration against an isolated PostgreSQL-compatible PGlite database with mocked Supabase Auth/Storage schemas. They exercise direct-access denial, RPC privileges, unique rewards, moderation, rate limits, atomic ordering and deletion cascades.
- API tests use an isolated fake Supabase HTTP service to check token validation, admin authorization, consent, upload decoding, moderation restrictions and retryable deletion.
- Browser tests run the production build at desktop/mobile sizes, checking navigation, consent UI, filtering, error handling and API boundary protections.
- These tests do not substitute for checking the real Supabase Auth/Storage services after deployment.

Before inviting users: join with Turnstile, upload a real image, approve it from a separate admin browser session, open the same content twice, verify one reward, test disabled content and hidden participants, then delete the participant and verify its Auth user, database rows and storage objects are gone. Check CSP and sign-in on your actual domain.

GitHub Actions runs validation on pushes/PRs. Node/npm operations for this implementation, dependency installation, lockfile generation, build and test execution were performed in GitHub Codespaces. Production and CI builds run in their respective cloud environments.
