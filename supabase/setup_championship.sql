-- Run this in the Supabase SQL editor if the championship leaderboard/final/champions
-- tables do not exist yet. It assumes the base schema from supabase/schema.sql exists.

create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id text not null,
  player_role public.sender_role not null check (player_role in ('player_a', 'player_b')),
  control_type public.control_type,
  audience_deceived integer not null default 0,
  points_earned integer not null default 0,
  won_match boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_id, user_id),
  unique(match_id, player_role)
);

alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists deleted_at timestamptz;

alter table public.matches add column if not exists match_type text not null default 'regular'
  check (match_type in ('regular', 'monthly_final'));
alter table public.matches add column if not exists championship_month integer check (championship_month between 1 and 12);
alter table public.matches add column if not exists championship_year integer check (championship_year between 2000 and 2100);
alter table public.matches add column if not exists championship_scored_at timestamptz;
alter table public.matches add column if not exists completed_at timestamptz;

create table if not exists public.monthly_leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2100),
  matches_played integer not null default 0,
  matches_won integer not null default 0,
  total_audience_deceived integer not null default 0,
  average_deception_per_match numeric(10,2) not null default 0,
  total_points integer not null default 0,
  rank integer,
  qualification_status text not null default 'not_qualified'
    check (qualification_status in ('qualified', 'not_qualified', 'finalist', 'champion', 'runner_up', 'disqualified')),
  frozen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month, year)
);

create table if not exists public.monthly_finals (
  id uuid primary key default gen_random_uuid(),
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2100),
  finalist_one_user_id text not null,
  finalist_two_user_id text not null,
  final_match_id uuid references public.matches(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(month, year)
);

create table if not exists public.monthly_champions (
  id uuid primary key default gen_random_uuid(),
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2100),
  champion_user_id text not null,
  runner_up_user_id text not null,
  final_match_id uuid references public.matches(id) on delete set null,
  prize_amount integer not null default 5000,
  prize_status text not null default 'unpaid' check (prize_status in ('unpaid', 'paid')),
  admin_note text,
  finalized_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(month, year)
);

create or replace view public.public_matches as
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
  match_type,
  championship_month,
  championship_year,
  championship_scored_at,
  completed_at,
  case when status in ('revealed', 'completed') then player_a_control_type else null end as player_a_revealed_type,
  case when status in ('revealed', 'completed') then player_b_control_type else null end as player_b_revealed_type
from public.matches;

create or replace view public.audience_votes as
select
  votes.id,
  votes.match_id,
  votes.voter_user_id,
  votes.vote,
  votes.created_at
from public.votes
join public.matches on matches.id = votes.match_id
left join public.profiles on profiles.id::text = votes.voter_user_id
where votes.voter_user_id is distinct from matches.player_a_user_id
  and votes.voter_user_id is distinct from matches.player_b_user_id
  and coalesce(profiles.is_banned, false) = false
  and profiles.deleted_at is null;

create index if not exists monthly_leaderboard_period_rank_idx
  on public.monthly_leaderboard(year, month, rank);
create index if not exists monthly_leaderboard_period_points_idx
  on public.monthly_leaderboard(year, month, total_points desc, total_audience_deceived desc);
create index if not exists matches_championship_period_idx
  on public.matches(championship_year, championship_month, match_type);

alter table public.match_participants enable row level security;
alter table public.monthly_leaderboard enable row level security;
alter table public.monthly_finals enable row level security;
alter table public.monthly_champions enable row level security;

drop policy if exists "match participants readable" on public.match_participants;
drop policy if exists "service role manages match participants" on public.match_participants;
drop policy if exists "monthly leaderboard readable" on public.monthly_leaderboard;
drop policy if exists "service role manages monthly leaderboard" on public.monthly_leaderboard;
drop policy if exists "monthly finals readable" on public.monthly_finals;
drop policy if exists "service role manages monthly finals" on public.monthly_finals;
drop policy if exists "monthly champions readable" on public.monthly_champions;
drop policy if exists "service role manages monthly champions" on public.monthly_champions;

create policy "match participants readable" on public.match_participants for select using (true);
create policy "service role manages match participants" on public.match_participants for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "monthly leaderboard readable" on public.monthly_leaderboard for select using (true);
create policy "service role manages monthly leaderboard" on public.monthly_leaderboard for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "monthly finals readable" on public.monthly_finals for select using (true);
create policy "service role manages monthly finals" on public.monthly_finals for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "monthly champions readable" on public.monthly_champions for select using (true);
create policy "service role manages monthly champions" on public.monthly_champions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant select on public.public_matches to anon, authenticated;
grant select on public.audience_votes to anon, authenticated;
grant select on public.match_participants to anon, authenticated;
grant select on public.monthly_leaderboard to anon, authenticated;
grant select on public.monthly_finals to anon, authenticated;
grant select on public.monthly_champions to anon, authenticated;
