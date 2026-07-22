-- Lets a user pin progress_pct and/or status to a manually-chosen value so
-- the upcoming auto-recompute trigger (see fn_recompute_project_progress)
-- doesn't silently overwrite it. Two independent flags, not one shared flag,
-- since a user may want to force one field without freezing the other.
alter table public.projects
  add column if not exists progress_pct_manual boolean not null default false,
  add column if not exists status_manual boolean not null default false;
