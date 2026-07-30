-- Superseded by project_subcontractors: the current assignment for a project
-- is the row where project_id = this project and is_current = true, rather
-- than a direct FK column here (avoids two sources of truth that can drift).
drop index if exists public.projects_subcontractor_id_idx;

alter table public.projects
  drop column subcontractor_id;
