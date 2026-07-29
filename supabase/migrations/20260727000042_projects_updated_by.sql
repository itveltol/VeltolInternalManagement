-- Tracks WHO last modified a project row, parallel to the existing
-- `updated_at` (auto-stamped by the set_updated_at trigger). Set explicitly
-- by application code on direct edits (edit dialog, team assignment, phase
-- dates, folder link) — not by a trigger, mirroring project_activity_status.
-- Deliberately left untouched by fn_recompute_project_progress(), so it does
-- not get bumped by downstream Matrice/checklist-driven progress_pct/status
-- recomputes that aren't a human editing the project itself.
--
-- References public.profiles (not auth.users) so PostgREST can embed it
-- directly as `updated_by_user:profiles!updated_by(...)`, the same way
-- manager_id does — a FK straight to auth.users can't be traversed by
-- PostgREST's schema-cache-based embed resolution.
alter table public.projects
  drop constraint if exists projects_updated_by_fkey;

alter table public.projects
  add column if not exists updated_by uuid;

alter table public.projects
  add constraint projects_updated_by_fkey foreign key (updated_by) references public.profiles(id);
