-- Move schedule_assignments from a single profile_id/team_worker_id column
-- pair to a one-to-many "assignees" relationship: one assignment (project +
-- date range + label + color) can now have multiple people on it, shown
-- together as one card grouped under their shared team's row (or a "Custom"
-- row when they don't share exactly one real team).
create table public.schedule_assignment_members (
  id             bigint generated always as identity primary key,
  assignment_id  bigint not null references public.schedule_assignments (id) on delete cascade,
  profile_id     uuid references public.profiles (id) on delete cascade,
  team_worker_id bigint references public.team_workers (id) on delete cascade,
  created_at     timestamptz not null default now(),

  constraint schedule_assignment_members_one_subject check (
    (profile_id is not null and team_worker_id is null) or
    (profile_id is null and team_worker_id is not null)
  ),
  unique (assignment_id, profile_id),
  unique (assignment_id, team_worker_id)
);

create index schedule_assignment_members_assignment_idx
  on public.schedule_assignment_members (assignment_id);

create index schedule_assignment_members_profile_idx
  on public.schedule_assignment_members (profile_id) where profile_id is not null;

create index schedule_assignment_members_worker_idx
  on public.schedule_assignment_members (team_worker_id) where team_worker_id is not null;

alter table public.schedule_assignment_members enable row level security;

create policy "schedule_assignment_members: authenticated select"
  on public.schedule_assignment_members for select
  to authenticated
  using (true);

create policy "schedule_assignment_members: admin and pm can insert"
  on public.schedule_assignment_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "schedule_assignment_members: admin and pm can update"
  on public.schedule_assignment_members for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "schedule_assignment_members: admin and pm can delete"
  on public.schedule_assignment_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

-- Backfill: one membership row per existing assignment's current assignee.
insert into public.schedule_assignment_members (assignment_id, profile_id, team_worker_id)
select id, profile_id, team_worker_id
from public.schedule_assignments;

alter table public.schedule_assignments
  drop constraint if exists schedule_assignments_one_assignee,
  drop column profile_id,
  drop column team_worker_id;
