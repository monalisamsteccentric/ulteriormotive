create table if not exists audience_viewers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  viewer_user_id text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(match_id, viewer_user_id)
);

alter table audience_viewers enable row level security;

drop policy if exists "service role manages audience viewers" on audience_viewers;
create policy "service role manages audience viewers"
on audience_viewers
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
