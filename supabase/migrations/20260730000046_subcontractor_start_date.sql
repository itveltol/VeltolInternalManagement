-- Start date for the subcontracted execution window, alongside the existing
-- deadline (end date) — together these drive the project's execution Gantt segment.
alter table public.subcontractors add column start_date date;
