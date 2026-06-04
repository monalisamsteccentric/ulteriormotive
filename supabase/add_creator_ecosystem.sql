create extension if not exists "pgcrypto";

create table if not exists beta_feedback (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  user_type text,
  issue text,
  feedback text,
  rating integer check (rating between 1 and 5),
  contact_for_testing boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists reader_interest (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  genre_interest text,
  wants_arc boolean not null default false,
  wants_updates boolean not null default false,
  message text,
  created_at timestamptz not null default now()
);

alter table beta_feedback enable row level security;
alter table reader_interest enable row level security;

drop policy if exists "beta feedback insertable by visitors" on beta_feedback;
create policy "beta feedback insertable by visitors" on beta_feedback
  for insert to anon, authenticated
  with check (true);

drop policy if exists "reader interest insertable by visitors" on reader_interest;
create policy "reader interest insertable by visitors" on reader_interest
  for insert to anon, authenticated
  with check (true);

grant insert on beta_feedback to anon, authenticated;
grant insert on reader_interest to anon, authenticated;
