-- Project phase enum (English slugs, translated on the frontend)
create type public.project_phase as enum (
  'proposal',
  'planning',
  'permitting',
  'construction',
  'warranty',
  'closed',
  'cancelled'
);

-- General health status enum
create type public.project_status as enum (
  'on_schedule',
  'delayed',
  'critical',
  'completed',
  'on_hold'
);

-- Priority enum
create type public.project_priority as enum ('low', 'medium', 'high');

-- Projects table
create table public.projects (
  id               bigint primary key generated always as identity,
  name             text not null,
  county           text,
  site_location    text,
  mw_solar         numeric(8, 3),
  mw_bess          numeric(8, 3),
  project_type     text,
  manager_id       uuid references public.profiles (id) on delete set null,
  current_phase    public.project_phase not null default 'proposal',
  progress_pct     integer not null default 0 check (progress_pct between 0 and 100),
  contract_number  text,
  contract_date    date,
  deadline         date,
  value_eur        bigint,
  status           public.project_status not null default 'on_schedule',
  priority         public.project_priority not null default 'medium',
  cu_issued        boolean not null default false,
  atr_issued       boolean not null default false,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Reuse the existing set_updated_at() trigger function from profiles migration
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- RLS
alter table public.projects enable row level security;

-- Security definer helper (mirrors is_admin() from profiles migration)
create or replace function public.can_mutate_projects()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  )
$$;

-- All authenticated users can read projects
create policy "projects: authenticated select"
  on public.projects for select
  using (auth.uid() is not null);

-- Admin + project_manager can insert
create policy "projects: mutators insert"
  on public.projects for insert
  with check (can_mutate_projects());

-- Admin + project_manager can update
create policy "projects: mutators update"
  on public.projects for update
  using (can_mutate_projects());

-- Admin only can delete
create policy "projects: admin delete"
  on public.projects for delete
  using (is_admin());
