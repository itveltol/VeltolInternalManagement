-- Outfield workers are independent of teams: a team is now just an optional
-- "home team" tag for display/grouping, not ownership. Deleting a team must
-- no longer delete its workers (and transitively their schedule assignments
-- and absence history) — it should just unlink them.

alter table public.team_workers
  drop constraint team_workers_team_id_fkey;

alter table public.team_workers
  alter column team_id drop not null;

alter table public.team_workers
  add constraint team_workers_team_id_fkey
    foreign key (team_id) references public.teams (id) on delete set null;
