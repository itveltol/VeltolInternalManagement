-- A project either gets executed in-house (tracked via checklist/Gantt/
-- progress) or is handed off entirely to a subcontractor, in which case we
-- only record who they are and the agreed price/deadline.
alter table public.projects
  add column execution_mode text not null default 'internal'
    check (execution_mode in ('internal', 'subcontracted')),
  add column subcontractor_id bigint references public.subcontractors (id) on delete set null;

create index if not exists projects_subcontractor_id_idx on public.projects (subcontractor_id);
