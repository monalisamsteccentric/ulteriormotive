# Ulterior Motive

Ulterior Motive is a mobile-first social deduction chat MVP built with Next.js, TypeScript, Tailwind CSS, Supabase, and OpenAI. Player A and Player B are always public labels; whether either side is human-controlled or AI-controlled is stored privately and only revealed after the match enters `revealed` or `completed`.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, Realtime
- OpenAI for AI player replies
- Vercel-ready deployment
- PWA-ready `manifest.json`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=
CHAMPIONSHIP_ADMIN_SECRET=
RESEND_API_KEY=
WAITING_MATCH_ALERT_EMAIL=monalisa.sahoo.jsr@gmail.com
WAITING_MATCH_EMAIL_FROM=Ulterior Motive <onboarding@resend.dev>
```

Set `SERVICE_ROLE_KEY` as a Supabase Edge Function secret only, not in the Next app host. Set the same `CHAMPIONSHIP_ADMIN_SECRET` value in the Next app host and in Supabase Edge Function secrets so logged-in admin routes can invoke protected function actions. Never expose `SERVICE_ROLE_KEY` or `OPENAI_API_KEY` to client code.

4. Run `supabase/schema.sql` in your Supabase SQL editor. If the championship tables are missing, also run `supabase/setup_championship.sql`.

5. Start the app:

```bash
npm run dev
```

## Hidden Identity Security

The private columns live only in `matches`:

- `player_a_control_type`
- `player_b_control_type`

Normal UI reads from `public_matches`, which returns those fields as `null` until `status in ('revealed', 'completed')`. Chat reads from `public_messages`, which excludes `is_ai_generated`. Realtime delivery uses sanitized broadcast payloads from the server API, not raw client subscriptions to private rows.

## Wait Timer

Run `supabase/add_wait_reminder_and_ai_fallback.sql` if you already created the database before this feature existed.

Vercel cron calls `GET /api/cron/waiting-matches` every minute. The route:

- Emails `WAITING_MATCH_ALERT_EMAIL` when a waiting match has about one minute left.
- Includes the match ID, invite code, and join link.
- Fills the empty seat with AI after `wait_until`, then starts the match.

Email uses Resend. Add `RESEND_API_KEY` and set `WAITING_MATCH_EMAIL_FROM` to a verified sender for production. If `RESEND_API_KEY` is missing, the cron still assigns AI after expiry but skips email.

The fallback AI prompt lives in `DEFAULT_EXPIRED_WAIT_AI_STRATEGY` in `src/lib/matchService.ts`.

## AI Players

AI replies are generated server-side in `src/lib/aiPlayer.ts`. The route `POST /api/matches/[matchId]/ai-tick` checks private match state, waits a random delay, writes an AI message with `is_ai_generated=true`, and broadcasts only the safe public message.

For production, trigger this route from a queue, cron, or Supabase Edge Function after new human/player messages.

## Admin

`/admin` requires a logged-in Supabase user whose `profiles.is_admin` is true. Admin actions can force start, force reveal, and inject AI. Ban user and secret join are placeholders.

## Vercel Deployment

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Add the environment variables from `.env.example`.
4. Set `NEXT_PUBLIC_SITE_URL` to your Vercel domain or custom domain.
5. Deploy.

## MVP Routes

- `/`
- `/login`
- `/create`
- `/join/[inviteCode]`
- `/match/[matchId]`
- `/match/[matchId]/reveal`
- `/match/[matchId]/replay`
- `/profile`
- `/admin`

## Future TODOs

- Voice mode
- Influencer AI clone
- Monalisa AI
- AI memory
- Ranked leaderboard
- Viral clip generator
- Livestream OBS mode
- Coins/betting mode
