-- Subcontractors are reusable companies; the price/dates of a specific
-- engagement belong to a project<->subcontractor assignment, not the company
-- itself (the same company can work multiple projects over time, each with
-- its own price and schedule). This table is that assignment/history record,
-- modeled on project_checklist_items (project-scoped child table + same RLS
-- shape). is_current + the partial unique index enforce "at most one active
-- assignment per project" while still keeping past assignments as history.
create table public.project_subcontractors (
  id                bigint primary key generated always as identity,
  project_id        bigint not null references public.projects (id) on delete cascade,
  subcontractor_id  bigint not null references public.subcontractors (id) on delete restrict,
  price_eur         numeric,
  price_lei         numeric,
  start_date        date,
  deadline          date,
  notes             text,
  is_current        boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index project_subcontractors_current_idx
  on public.project_subcontractors (project_id) where is_current;

create index project_subcontractors_project_id_idx
  on public.project_subcontractors (project_id);

create index project_subcontractors_subcontractor_id_idx
  on public.project_subcontractors (subcontractor_id);

create trigger project_subcontractors_updated_at
  before update on public.project_subcontractors
  for each row execute function public.set_updated_at();

alter table public.project_subcontractors enable row level security;

create policy "project_subcontractors: authenticated select"
  on public.project_subcontractors for select
  to authenticated
  using (true);

create policy "project_subcontractors: admin and pm can insert"
  on public.project_subcontractors for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "project_subcontractors: admin and pm can update"
  on public.project_subcontractors for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "project_subcontractors: only admin can delete"
  on public.project_subcontractors for delete
  to authenticated
  using (public.is_admin());
