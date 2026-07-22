-- Assigned team for a project: one team per project, editable by the
-- project's own manager or an admin only (enforced in the app layer).
alter table public.projects
  add column team_id bigint references public.teams (id) on delete set null;
