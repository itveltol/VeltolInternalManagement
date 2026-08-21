-- fn_recompute_project_progress already reads coalesce(new.project_id,
-- old.project_id) and returns coalesce(new, old), so it's delete-safe — but
-- the trigger was only bound to insert/update. Deleting a Matrice catalog
-- activity cascades into deleting its project_activity_status cells (see
-- activities.id on delete cascade), which is a DELETE and never fired this
-- trigger, leaving progress_pct/status stale until an unrelated cell edit.
drop trigger if exists trg_recompute_project_progress on public.project_activity_status;
create trigger trg_recompute_project_progress
  after insert or update or delete on public.project_activity_status
  for each row execute function public.fn_recompute_project_progress();
