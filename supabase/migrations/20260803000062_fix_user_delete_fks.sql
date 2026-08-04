-- Three FK problems block deleting a user (auth.admin.deleteUser cascades to
-- profiles, which trips these):

-- documents.created_by: NOT NULL + ON DELETE SET NULL is self-contradictory
-- — the SET NULL action can never satisfy the NOT NULL constraint, so
-- deleting any user who ever created a document hard-fails. Drop NOT NULL
-- so the existing SET NULL action can actually apply.
alter table public.documents
  alter column created_by drop not null;

-- projects.updated_by: no ON DELETE action (defaults to RESTRICT), blocking
-- deletion of any user who ever edited a project directly.
alter table public.projects
  drop constraint if exists projects_updated_by_fkey;
alter table public.projects
  add constraint projects_updated_by_fkey
    foreign key (updated_by) references public.profiles(id) on delete set null;

-- project_activity_status.updated_by: no ON DELETE action, blocking deletion
-- of any user who ever edited a Matrice cell.
alter table public.project_activity_status
  drop constraint if exists project_activity_status_updated_by_fkey;
alter table public.project_activity_status
  add constraint project_activity_status_updated_by_fkey
    foreign key (updated_by) references auth.users(id) on delete set null;
