-- Weekly team schedule: per-team, per-day work assignments plus a per-team weekly note
create table public.team_schedule_entries (
  id          bigint generated always as identity primary key,
  team_id     bigint not null references public.teams (id) on delete cascade,
  work_date   date not null,
  project_id  bigint references public.projects (id) on delete set null,
  label       text not null default '',
  color       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null
);

create trigger team_schedule_entries_updated_at
  before update on public.team_schedule_entries
  for each row execute function public.set_updated_at();

create index if not exists team_schedule_entries_team_date_idx
  on public.team_schedule_entries (team_id, work_date);

create index if not exists team_schedule_entries_project_id_idx
  on public.team_schedule_entries (project_id);

-- One free-text note per team per ISO week (Monday date)
create table public.team_schedule_notes (
  id          bigint generated always as identity primary key,
  team_id     bigint not null references public.teams (id) on delete cascade,
  week_start  date not null,
  note        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (team_id, week_start)
);

create trigger team_schedule_notes_updated_at
  before update on public.team_schedule_notes
  for each row execute function public.set_updated_at();

alter table public.team_schedule_entries enable row level security;
alter table public.team_schedule_notes enable row level security;

create policy "team_schedule_entries: authenticated select"
  on public.team_schedule_entries for select
  to authenticated
  using (true);

create policy "team_schedule_entries: admin and pm can insert"
  on public.team_schedule_entries for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "team_schedule_entries: admin and pm can update"
  on public.team_schedule_entries for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "team_schedule_entries: admin and pm can delete"
  on public.team_schedule_entries for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "team_schedule_notes: authenticated select"
  on public.team_schedule_notes for select
  to authenticated
  using (true);

create policy "team_schedule_notes: admin and pm can insert"
  on public.team_schedule_notes for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "team_schedule_notes: admin and pm can update"
  on public.team_schedule_notes for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "team_schedule_notes: admin and pm can delete"
  on public.team_schedule_notes for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );
