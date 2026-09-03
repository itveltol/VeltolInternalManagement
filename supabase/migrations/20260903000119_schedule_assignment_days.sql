-- Per-day delegation flag + plus-hours for a schedule_assignments row.
-- Sparse/lazy: a row exists only once someone sets delegated=true and/or
-- plus_hours>0 for that date; missing days default to {false, 0} in the
-- service layer, avoiding write amplification for month-long assignments.
create table public.schedule_assignment_days (
  id             bigint generated always as identity primary key,
  assignment_id  bigint not null references public.schedule_assignments (id) on delete cascade,
  work_date      date not null,
  delegated      boolean not null default false,
  plus_hours     numeric(4, 1) not null default 0 check (plus_hours >= 0),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.profiles (id) on delete set null,

  unique (assignment_id, work_date)
);

create trigger schedule_assignment_days_updated_at
  before update on public.schedule_assignment_days
  for each row execute function public.set_updated_at();

create index schedule_assignment_days_assignment_idx
  on public.schedule_assignment_days (assignment_id);

create index schedule_assignment_days_date_idx
  on public.schedule_assignment_days (work_date);

alter table public.schedule_assignment_days enable row level security;

create policy "schedule_assignment_days: authenticated select"
  on public.schedule_assignment_days for select
  to authenticated
  using (true);

create policy "schedule_assignment_days: admin and pm can insert"
  on public.schedule_assignment_days for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "schedule_assignment_days: admin and pm can update"
  on public.schedule_assignment_days for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "schedule_assignment_days: admin and pm can delete"
  on public.schedule_assignment_days for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );
