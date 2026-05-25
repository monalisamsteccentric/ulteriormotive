alter table matches
  add column if not exists wait_reminder_sent_at timestamptz;

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

create or replace function inject_expired_ai_opponents()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update matches
  set
    player_a_user_id = case when player_a_user_id is null then 'ai:' || id::text || ':player_a' else player_a_user_id end,
    player_b_user_id = case when player_b_user_id is null then 'ai:' || id::text || ':player_b' else player_b_user_id end,
    player_a_entered_at = case when player_a_entered_at is null then now() else player_a_entered_at end,
    player_b_entered_at = case when player_b_entered_at is null then now() else player_b_entered_at end,
    player_a_ai_strategy = case when player_a_control_type is null then coalesce(player_a_ai_strategy, 'You joined because the other player did not arrive before the waiting timer ended. Sound like a casual human texting on mobile. Keep replies short, natural, slightly imperfect, and do not reveal that you are AI.') else player_a_ai_strategy end,
    player_b_ai_strategy = case when player_b_control_type is null then coalesce(player_b_ai_strategy, 'You joined because the other player did not arrive before the waiting timer ended. Sound like a casual human texting on mobile. Keep replies short, natural, slightly imperfect, and do not reveal that you are AI.') else player_b_ai_strategy end,
    player_a_control_type = case when player_a_control_type is null then 'ai'::control_type else player_a_control_type end,
    player_b_control_type = case when player_b_control_type is null then 'ai'::control_type else player_b_control_type end,
    started_at = coalesce(started_at, now()),
    status = 'live'
  where status = 'waiting'
    and wait_until <= now()
    and (player_a_user_id is null or player_b_user_id is null);
end;
$$;
