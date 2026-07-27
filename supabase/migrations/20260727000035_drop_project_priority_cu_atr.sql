-- Priority, CU issued, and ATR issued are no longer tracked on projects.
alter table public.projects
  drop column priority,
  drop column cu_issued,
  drop column atr_issued;

drop type public.project_priority;
