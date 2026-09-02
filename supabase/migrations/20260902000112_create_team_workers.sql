-- Outfield workers: team members with no login account, tracked for scheduling purposes only
create table public.team_workers (
  id          bigint generated always as identity primary key,
  team_id     bigint not null references public.teams (id) on delete cascade,
  first_name  text not null,
  last_name   text,
  phone       text,
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null
);

create trigger team_workers_updated_at
  before update on public.team_workers
  for each row execute function public.set_updated_at();

create index if not exists team_workers_team_id_idx
  on public.team_workers (team_id);

alter table public.team_workers enable row level security;

create policy "team_workers: authenticated select"
  on public.team_workers for select
  to authenticated
  using (true);

create policy "team_workers: admin and pm can insert"
  on public.team_workers for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "team_workers: admin and pm can update"
  on public.team_workers for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "team_workers: admin and pm can delete"
  on public.team_workers for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );
