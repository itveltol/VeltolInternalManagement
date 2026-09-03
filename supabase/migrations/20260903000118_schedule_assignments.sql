-- Project-centric scheduling: one row = one worker (profile or team_worker)
-- assigned to one project for a date range. Replaces the team-based
-- team_schedule_entries model (left in place, deprecated, for history).
create table public.schedule_assignments (
  id             bigint generated always as identity primary key,
  project_id     bigint not null references public.projects (id) on delete cascade,
  profile_id     uuid references public.profiles (id) on delete cascade,
  team_worker_id bigint references public.team_workers (id) on delete cascade,
  start_date     date not null,
  end_date       date not null,
  label          text not null default '',
  color          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,

  constraint schedule_assignments_range_valid check (end_date >= start_date),
  constraint schedule_assignments_one_assignee check (
    (profile_id is not null and team_worker_id is null) or
    (profile_id is null and team_worker_id is not null)
  )
);

create trigger schedule_assignments_updated_at
  before update on public.schedule_assignments
  for each row execute function public.set_updated_at();

create index schedule_assignments_project_range_idx
  on public.schedule_assignments (project_id, start_date, end_date);

create index schedule_assignments_profile_range_idx
  on public.schedule_assignments (profile_id, start_date, end_date) where profile_id is not null;

create index schedule_assignments_worker_range_idx
  on public.schedule_assignments (team_worker_id, start_date, end_date) where team_worker_id is not null;

alter table public.schedule_assignments enable row level security;

create policy "schedule_assignments: authenticated select"
  on public.schedule_assignments for select
  to authenticated
  using (true);

create policy "schedule_assignments: admin and pm can insert"
  on public.schedule_assignments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "schedule_assignments: admin and pm can update"
  on public.schedule_assignments for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "schedule_assignments: admin and pm can delete"
  on public.schedule_assignments for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );
