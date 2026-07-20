-- Portfolio Gantt: estimated start/end dates per project for the 3 rollup
-- phases derived from Matrice Status (planning = phase_no 1-7, execution =
-- 8-10, autorizare = 11-12). Progress fill is computed client-side from
-- matrice activity status; only the estimated schedule is persisted here.
alter table public.projects
  add column if not exists planning_start_date   date,
  add column if not exists planning_end_date     date,
  add column if not exists execution_start_date  date,
  add column if not exists execution_end_date    date,
  add column if not exists autorizare_start_date date,
  add column if not exists autorizare_end_date   date;
