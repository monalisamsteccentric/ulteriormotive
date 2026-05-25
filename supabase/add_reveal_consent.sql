alter table public.matches
  add column if not exists started_at timestamptz,
  add column if not exists reveal_requested_by_user_id text,
  add column if not exists reveal_requested_at timestamptz;

drop view if exists public.public_matches;

create view public.public_matches as
select
  id,
  player_a_user_id,
  player_b_user_id,
  player_a_entered_at,
  player_b_entered_at,
  status,
  invite_code,
  wait_until,
  created_at,
  started_at,
  revealed_at,
  reveal_requested_by_user_id,
  reveal_requested_at,
  case when status in ('revealed', 'completed') then player_a_control_type else null end as player_a_revealed_type,
  case when status in ('revealed', 'completed') then player_b_control_type else null end as player_b_revealed_type
from public.matches;

grant select on public.public_matches to anon, authenticated;

notify pgrst, 'reload schema';
