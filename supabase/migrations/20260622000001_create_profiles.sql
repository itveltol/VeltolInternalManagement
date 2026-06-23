-- Create app role enum
create type public.app_role as enum (
  'admin',
  'project_manager',
  'site_engineer',
  'finance',
  'viewer'
);

-- Profiles table — one row per auth.users entry
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  first_name  text,
  last_name   text,
  phone       text,
  avatar_url  text,
  role        public.app_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (except role — admin update policy covers role changes)
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Security definer helper to avoid RLS self-join recursion
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

-- Admins can read all profiles
create policy "profiles: admin select all"
  on public.profiles for select
  using (is_admin());

-- Admins can update any profile (including role changes)
create policy "profiles: admin update all"
  on public.profiles for update
  using (is_admin());

-- Admins can delete any profile
create policy "profiles: admin delete"
  on public.profiles for delete
  using (is_admin());
