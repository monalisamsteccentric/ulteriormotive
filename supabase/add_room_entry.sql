alter table matches
  add column if not exists player_a_entered_at timestamptz,
  add column if not exists player_b_entered_at timestamptz;

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
  created_at,
  revealed_at,
  case when status in ('revealed', 'completed') then player_a_control_type else null end as player_a_revealed_type,
  case when status in ('revealed', 'completed') then player_b_control_type else null end as player_b_revealed_type
from matches;

grant select on public_matches to anon, authenticated;

notify pgrst, 'reload schema';
