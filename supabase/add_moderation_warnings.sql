create table if not exists moderation_warnings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  user_id text not null,
  warning_count integer not null default 0 check (warning_count between 0 and 3),
  banned_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(match_id, user_id)
);

alter table moderation_warnings enable row level security;

drop policy if exists "service role manages moderation warnings" on moderation_warnings;
create policy "service role manages moderation warnings"
on moderation_warnings
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
