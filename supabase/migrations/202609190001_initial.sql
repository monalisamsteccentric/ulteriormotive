-- Fresh schema. Apply once to a NEW Supabase project using the SQL Editor.
create extension if not exists pgcrypto;
create table public.admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table public.participants (
 id uuid primary key references auth.users(id) on delete cascade,
 alias text not null check (char_length(alias) between 2 and 32),
 avatar text not null default 'violet' check (avatar in ('violet','coral','mint','gold')),
 photo_path text unique,
 status text not null default 'approved' check (status in ('pending','approved','hidden')),
 discoveries integer not null default 0 check (discoveries >= 0),
 consent_version text not null check (consent_version = '2026-09-19'),
 consented_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create table public.content (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 2 and 120),
 description text not null default '' check (char_length(description) <= 600),
 url text not null check (url ~ '^https://'),
 category text not null check (category in ('Read','Watch','Listen','Explore')),
 duration_minutes integer not null default 5 check (duration_minutes between 1 and 240),
 position integer not null default 0 check (position >= 0),
 enabled boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.visits (
 id uuid primary key default gen_random_uuid(),
 participant_id uuid not null references public.participants(id) on delete cascade,
 content_id uuid references public.content(id) on delete set null,
 created_at timestamptz not null default now(),
 unique (participant_id, content_id)
);
create index visits_created_at_idx on public.visits(created_at);
create table public.admin_photos (
 id uuid primary key default gen_random_uuid(),
 photo_path text not null unique,
 caption text not null check (char_length(caption) between 1 and 80),
 enabled boolean not null default true,
 position integer not null default 0 check (position >= 0),
 created_at timestamptz not null default now()
);
create table public.rate_limits (
 key text primary key,
 requests integer not null,
 expires_at timestamptz not null
);
create index rate_limits_expiry_idx on public.rate_limits(expires_at);
alter table public.admins enable row level security;
alter table public.participants enable row level security;
alter table public.content enable row level security;
alter table public.visits enable row level security;
alter table public.admin_photos enable row level security;
alter table public.rate_limits enable row level security;
-- Intentionally no anon/authenticated policies. All access is through verified server routes.
revoke all on public.admins, public.participants, public.content, public.visits, public.admin_photos, public.rate_limits from anon, authenticated;
grant all on public.admins, public.participants, public.content, public.visits, public.admin_photos, public.rate_limits to service_role;

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
 delete from public.rate_limits where expires_at < now();
 insert into public.rate_limits(key, requests, expires_at)
 values (p_key, 1, now() + make_interval(secs => p_window))
 on conflict(key) do update set requests = public.rate_limits.requests + 1
 returning requests into n;
 return n <= p_limit;
end;
$$;
create or replace function public.record_visit(p_participant uuid, p_content uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted integer; total integer;
begin
 perform 1 from public.participants where id = p_participant and status <> 'hidden' for update;
 if not found then raise exception 'Participant unavailable'; end if;
 perform 1 from public.content where id = p_content and enabled = true for share;
 if not found then raise exception 'Content unavailable'; end if;
 insert into public.visits(participant_id, content_id) values(p_participant, p_content)
 on conflict(participant_id,content_id) do nothing;
 get diagnostics inserted = row_count;
 update public.participants set discoveries = discoveries + inserted
 where id = p_participant returning discoveries into total;
 return total;
end;
$$;
create or replace function public.discovery_analytics()
returns jsonb language sql security definer set search_path = '' as $$
 select jsonb_build_object(
 'participants', (select count(*) from public.participants),
 'discoveries', (select count(*) from public.visits),
 'pending', (select count(*) from public.participants where status = 'pending'),
 'activeContent', (select count(*) from public.content where enabled),
 'daily', (select coalesce(jsonb_agg(d order by d.day),'[]'::jsonb) from (
   select date_trunc('day', created_at)::date as day, count(*) as discoveries
   from public.visits where created_at >= now() - interval '30 days' group by 1
 ) d),
 'content', (select coalesce(jsonb_agg(c order by c.visits desc),'[]'::jsonb) from (
   select c.id, c.title, count(v.id) as visits from public.content c
   left join public.visits v on v.content_id = c.id group by c.id
 ) c)
 );
$$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public, anon, authenticated;
revoke all on function public.record_visit(uuid,uuid) from public, anon, authenticated;
revoke all on function public.discovery_analytics() from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
grant execute on function public.record_visit(uuid,uuid) to service_role;
grant execute on function public.discovery_analytics() to service_role;

-- Private buckets. Object access is mediated by the server; only approved photos get signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('participant-photos','participant-photos',false,2097152,array['image/webp']),
       ('admin-photos','admin-photos',false,2097152,array['image/webp']);

create or replace function public.reorder_content(p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
 lock table public.content in share row exclusive mode;
 if cardinality(p_ids) <> (select count(*) from public.content)
    or cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) x)
    or exists (select 1 from unnest(p_ids) x where not exists(select 1 from public.content c where c.id = x))
 then raise exception 'Content changed; refresh and retry'; end if;
 update public.content c set position = ordering.n - 1
 from unnest(p_ids) with ordinality as ordering(id,n) where c.id = ordering.id;
end;
$$;
revoke all on function public.reorder_content(uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_content(uuid[]) to service_role;
