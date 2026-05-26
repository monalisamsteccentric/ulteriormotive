# Hidden Identity Production Stability Checklist

Use this before every production deploy.

## Routes

- `npm run build` lists `/join/[inviteCode]`, `/match/[matchId]`, `/match/[matchId]/reveal`, and `/match/[matchId]/replay`.
- `next.config.js` keeps `output: "standalone"` for AWS Amplify SSR.
- No middleware or rewrite sends `/join/[inviteCode]` or `/match/[matchId]/reveal` to a missing route.

## Amplify Environment

- Amplify only needs public Supabase values for the Next app:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_APP_URL`
- Amplify must not require `SUPABASE_SERVICE_ROLE_KEY`.

## Supabase Edge Functions

- Deployed functions:
  - `create-match`
  - `match-api`
- Edge Function secrets:
  - `SUPABASE_URL`
  - `SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY` if AI replies are enabled
- Deploy command:
  - `npx supabase functions deploy create-match`
  - `npx supabase functions deploy match-api`

## Match State

- Match transitions are written by Supabase Edge Functions, not Amplify server routes.
- Edge Function logs include structured JSON with `scope: "match-api"`, `action`, `matchId`, and `time`.
- Every transition that changes match state broadcasts `matches:<matchId>` with event `updated`.
- Clients refresh backend state after realtime events and also poll as a stale-state fallback.

## Chat And AI

- Message inserts broadcast `messages:<matchId>` with event `message`.
- AI replies avoid meta claims about being a bot/model unless it is a deliberate strategic joke.
- The client does not optimistically add chat messages before the backend confirms them.

## Voting And Reveal

- Votes are stored through `match-api`.
- Vote changes broadcast `votes:<matchId>` with event `stats`.
- Reveal stats are computed by `match-api` with service-role access inside Supabase, not by Amplify.
- Player score guesses are based on each player's vote about the opposite player:
  - correct guess: `+30%`
  - wrong guess: `-30%`
  - no guess: `0%`

## Error Handling

- Match and join routes have visible error boundaries.
- API proxy errors return JSON with function names and missing env names only.
- Edge Function `NOT_FOUND` means the function name in code and Supabase deployment do not match.
