-- Enable extensions
create extension if not exists pgcrypto;

-- User profiles with role
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Scrape history
create table if not exists public.scrape_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  status text not null check (status in ('success', 'error')),
  error_type text,
  error_message text,
  data_json jsonb,
  from_cache boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scrape_results_user_created_at
  on public.scrape_results(user_id, created_at desc);

create index if not exists idx_scrape_results_url_updated_at
  on public.scrape_results(url, updated_at desc);

-- Trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_scrape_results_updated_at on public.scrape_results;
create trigger trg_scrape_results_updated_at
before update on public.scrape_results
for each row execute function public.set_updated_at();

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, role)
  values (new.id, 'viewer')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.scrape_results enable row level security;

-- profiles policies
drop policy if exists "Profiles: own read or admin read all" on public.profiles;
create policy "Profiles: own read or admin read all"
on public.profiles
for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Profiles: own update or admin update all" on public.profiles;
create policy "Profiles: own update or admin update all"
on public.profiles
for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Profiles: own insert" on public.profiles;
create policy "Profiles: own insert"
on public.profiles
for insert
with check (auth.uid() = user_id);

-- scrape_results policies
drop policy if exists "Scrape: admin sees all, others own" on public.scrape_results;
create policy "Scrape: admin sees all, others own"
on public.scrape_results
for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Scrape: insert own rows" on public.scrape_results;
create policy "Scrape: insert own rows"
on public.scrape_results
for insert
with check (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Scrape: update own rows or admin" on public.scrape_results;
create policy "Scrape: update own rows or admin"
on public.scrape_results
for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);
