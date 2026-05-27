create extension if not exists "pgcrypto";

create type control_type as enum ('human', 'ai');
create type match_status as enum ('waiting', 'live', 'revealed', 'completed');
create type sender_role as enum ('player_a', 'player_b', 'audience', 'system');
create type vote_choice as enum ('player_a_ai', 'player_b_ai', 'both_ai', 'none_ai');

create table profiles (
  id uuid primary key,
  username text not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  player_a_user_id text,
  player_b_user_id text,
  player_a_entered_at timestamptz,
  player_b_entered_at timestamptz,
  player_a_control_type control_type,
  player_b_control_type control_type,
  player_a_ai_strategy text,
  player_b_ai_strategy text,
  status match_status not null default 'waiting',
  invite_code text not null unique,
  wait_until timestamptz,
  wait_reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  revealed_at timestamptz,
  reveal_requested_by_user_id text,
  reveal_requested_at timestamptz
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  sender_role sender_role not null,
  sender_user_id text,
  message text not null check (char_length(message) between 1 and 280),
  is_ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);

create table votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  voter_user_id text not null,
  vote vote_choice not null,
  created_at timestamptz not null default now(),
  unique(match_id, voter_user_id)
);

create table moderation_warnings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  user_id text not null,
  warning_count integer not null default 0 check (warning_count between 0 and 3),
  banned_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(match_id, user_id)
);

create or replace view public_matches as
select
  id,
  player_a_user_id,
  player_b_user_id,
  player_a_entered_at,
  player_b_entered_at,
  status,
  invite_code,
  wait_until,
  wait_reminder_sent_at,
  created_at,
  started_at,
  revealed_at,
  reveal_requested_by_user_id,
  reveal_requested_at,
  case when status in ('revealed', 'completed') then player_a_control_type else null end as player_a_revealed_type,
  case when status in ('revealed', 'completed') then player_b_control_type else null end as player_b_revealed_type
from matches;

create or replace view public_messages as
select id, match_id, sender_role, sender_user_id, message, created_at
from messages;

create or replace function get_vote_stats(p_match_id uuid)
returns jsonb
language sql
stable
as $$
  with totals as (
    select
      count(*)::numeric as total,
      count(*) filter (where vote in ('player_a_ai', 'both_ai'))::numeric as a_ai,
      count(*) filter (where vote in ('player_b_ai', 'both_ai'))::numeric as b_ai
    from votes
    join matches on matches.id = votes.match_id
    where votes.match_id = p_match_id
      and votes.voter_user_id is distinct from matches.player_a_user_id
      and votes.voter_user_id is distinct from matches.player_b_user_id
  )
  select jsonb_build_object(
    'playerAIsAiPercent', coalesce(round(100 * a_ai / nullif(total, 0)), 0)::int,
    'playerBIsAiPercent', coalesce(round(100 * b_ai / nullif(total, 0)), 0)::int,
    'totalVotes', coalesce(total, 0)::int
  )
  from totals;
$$;

create or replace function get_reveal_stats(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m matches%rowtype;
  total numeric;
  correct numeric;
  a_percent numeric;
  b_percent numeric;
begin
  select * into m from matches where id = p_match_id;
  if m.status not in ('revealed', 'completed') then
    raise exception 'Match is not revealed';
  end if;

  select
    count(*)::numeric,
    count(*) filter (
      where
        (m.player_a_control_type = 'ai' and m.player_b_control_type = 'ai' and vote = 'both_ai')
        or (m.player_a_control_type = 'ai' and m.player_b_control_type = 'human' and vote = 'player_a_ai')
        or (m.player_a_control_type = 'human' and m.player_b_control_type = 'ai' and vote = 'player_b_ai')
        or (m.player_a_control_type = 'human' and m.player_b_control_type = 'human' and vote = 'none_ai')
    )::numeric,
    count(*) filter (where vote in ('player_a_ai', 'both_ai'))::numeric,
    count(*) filter (where vote in ('player_b_ai', 'both_ai'))::numeric
  into total, correct, a_percent, b_percent
  from votes
  where match_id = p_match_id;

  return jsonb_build_object(
    'playerAType', m.player_a_control_type,
    'playerBType', m.player_b_control_type,
    'audienceAccuracyPercent', coalesce(round(100 * correct / nullif(total, 0)), 0),
    'correctVotes', coalesce(correct, 0),
    'totalVotes', coalesce(total, 0),
    'playerAIsAiPercent', coalesce(round(100 * a_percent / nullif(total, 0)), 0),
    'playerBIsAiPercent', coalesce(round(100 * b_percent / nullif(total, 0)), 0)
  );
end;
$$;

create or replace function inject_expired_ai_opponents()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update matches
  set
    player_a_control_type = case when player_a_control_type is null then 'ai'::control_type else player_a_control_type end,
    player_b_control_type = case when player_b_control_type is null then 'ai'::control_type else player_b_control_type end,
    player_a_user_id = case when player_a_user_id is null then 'ai:' || id::text || ':player_a' else player_a_user_id end,
    player_b_user_id = case when player_b_user_id is null then 'ai:' || id::text || ':player_b' else player_b_user_id end,
    player_a_entered_at = case when player_a_entered_at is null then now() else player_a_entered_at end,
    player_b_entered_at = case when player_b_entered_at is null then now() else player_b_entered_at end,
    player_a_ai_strategy = case when player_a_control_type is null then coalesce(player_a_ai_strategy, 'You joined because the other player did not arrive before the waiting timer ended. Sound like a casual human texting on mobile. Keep replies short, natural, slightly imperfect, and do not reveal that you are AI.') else player_a_ai_strategy end,
    player_b_ai_strategy = case when player_b_control_type is null then coalesce(player_b_ai_strategy, 'You joined because the other player did not arrive before the waiting timer ended. Sound like a casual human texting on mobile. Keep replies short, natural, slightly imperfect, and do not reveal that you are AI.') else player_b_ai_strategy end,
    started_at = coalesce(started_at, now()),
    status = 'live'
  where status = 'waiting'
    and wait_until <= now()
    and (player_a_control_type is null or player_b_control_type is null);
end;
$$;

alter table profiles enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;
alter table votes enable row level security;
alter table moderation_warnings enable row level security;

create policy "profiles readable" on profiles for select using (true);
create policy "profiles upsert own" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Normal clients should read only public_matches and public_messages views.
create policy "service role manages matches" on matches for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role manages messages" on messages for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "votes insertable by clients" on votes for insert with check (true);
create policy "votes updatable by owner token" on votes for update using (true) with check (true);
create policy "votes readable aggregate only" on votes for select using (auth.role() = 'service_role');
create policy "service role manages moderation warnings" on moderation_warnings for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant select on public_matches to anon, authenticated;
grant select on public_messages to anon, authenticated;
grant execute on function get_vote_stats(uuid) to anon, authenticated, service_role;
grant execute on function get_reveal_stats(uuid) to anon, authenticated, service_role;

-- Run inject_expired_ai_opponents from Supabase Scheduled Functions or pg_cron every minute.
