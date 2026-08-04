-- The EUR/RON display conversion must be pinned to the rate on the day a
-- project/assignment was created, not recomputed against "today's" rate on
-- every read (which would make old records' converted amounts drift over
-- time). `conversion_rate` is the EUR->RON rate captured once at insert and
-- never touched again, even if the amount/currency is edited later.
alter table public.projects
  add column conversion_rate numeric;

alter table public.project_subcontractors
  add column conversion_rate numeric;
