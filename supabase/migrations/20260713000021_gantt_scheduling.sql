-- Gantt scheduling: extend checklist items with dates + team assignment.
-- Custom (non-template) tasks also get a name/phase since they have no
-- entry in the static CHECKLIST_TEMPLATE constant.
alter table public.project_checklist_items
  add column if not exists start_date date,
  add column if not exists end_date   date,
  add column if not exists team_id    bigint references public.teams (id) on delete set null,
  add column if not exists name       text,
  add column if not exists phase      text;

create index if not exists checklist_items_team_id_idx on public.project_checklist_items (team_id);
create index if not exists checklist_items_dates_idx on public.project_checklist_items (project_id, start_date, end_date);
