-- "Proposal" is no longer a project phase; existing proposal-stage projects
-- move to planning, which also becomes the new column default.
-- Postgres has no direct "drop enum value", so the type is recreated without it.
alter table public.projects
  alter column current_phase drop default;

update public.projects
  set current_phase = 'planning'
  where current_phase = 'proposal';

alter type public.project_phase rename to project_phase_old;

create type public.project_phase as enum (
  'planning',
  'permitting',
  'construction',
  'warranty',
  'closed',
  'cancelled'
);

alter table public.projects
  alter column current_phase type public.project_phase
    using current_phase::text::public.project_phase;

alter table public.projects
  alter column current_phase set default 'planning';

drop type public.project_phase_old;
