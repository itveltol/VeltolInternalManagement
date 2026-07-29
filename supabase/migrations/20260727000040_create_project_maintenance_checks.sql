-- Mentenanță (maintenance) inspection tracking for projects whose
-- contract_type includes 'mentenanta'. Two inspections per year — March and
-- October — each tracked as its own row so the checked state resets
-- naturally every year (a 2026 March row is distinct from a 2027 one).
-- Rows are created lazily (upserted) by the app rather than pre-seeded.
create table public.project_maintenance_checks (
  id         bigint generated always as identity primary key,
  project_id bigint not null references public.projects (id) on delete cascade,
  year       int not null,
  period     text not null check (period in ('march', 'october')),
  checked    boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, year, period)
);

create trigger project_maintenance_checks_updated_at
  before update on public.project_maintenance_checks
  for each row execute function public.set_updated_at();

create index if not exists project_maintenance_checks_project_id_idx
  on public.project_maintenance_checks (project_id);

alter table public.project_maintenance_checks enable row level security;

create policy "project_maintenance_checks: authenticated select"
  on public.project_maintenance_checks for select
  to authenticated
  using (true);

create policy "project_maintenance_checks: admin and pm can upsert"
  on public.project_maintenance_checks for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "project_maintenance_checks: admin and pm can update"
  on public.project_maintenance_checks for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "project_maintenance_checks: only admin can delete"
  on public.project_maintenance_checks for delete
  to authenticated
  using (public.is_admin());
