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
    where match_id = p_match_id
  )
  select jsonb_build_object(
    'playerAIsAiPercent', coalesce(round(100 * a_ai / nullif(total, 0)), 0)::int,
    'playerBIsAiPercent', coalesce(round(100 * b_ai / nullif(total, 0)), 0)::int,
    'totalVotes', coalesce(total, 0)::int
  )
  from totals;
$$;

grant execute on function get_vote_stats(uuid) to anon, authenticated, service_role;
