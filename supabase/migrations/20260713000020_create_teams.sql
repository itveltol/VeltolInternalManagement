-- Teams table — groups of members, later assignable to projects/locations
create table public.teams (
  id          bigint generated always as identity primary key,
  name        text not null,
  description text,
  lead_id     uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create index if not exists teams_name_idx on public.teams (name);

-- Team membership join table
create table public.team_members (
  team_id  bigint not null references public.teams (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists team_members_user_id_idx on public.team_members (user_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "teams: authenticated select"
  on public.teams for select
  to authenticated
  using (true);

create policy "teams: admin and pm can insert"
  on public.teams for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "teams: admin and pm can update"
  on public.teams for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "teams: only admin can delete"
  on public.teams for delete
  to authenticated
  using (public.is_admin());

create policy "team_members: authenticated select"
  on public.team_members for select
  to authenticated
  using (true);

create policy "team_members: admin and pm can insert"
  on public.team_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "team_members: admin and pm can delete"
  on public.team_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );
