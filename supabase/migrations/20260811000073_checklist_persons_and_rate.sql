-- Add per-task staffing fields (persons allocated, units per person per day),
-- and retire the unused per-item team/scheduling columns in favor of a single
-- project-level team (projects.team_id).

alter table public.project_checklist_items
  add column if not exists persons_allocated smallint,
  add column if not exists units_per_person_day integer;

drop index if exists checklist_items_team_id_idx;
drop index if exists checklist_items_dates_idx;

alter table public.project_checklist_items
  drop column if exists team_id,
  drop column if exists start_date,
  drop column if exists end_date;
