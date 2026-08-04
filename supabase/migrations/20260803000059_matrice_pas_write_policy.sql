-- "pas_write" used `for all using (true)`, so any authenticated user could
-- update or delete ANY project_activity_status row, not just rows for
-- projects they're allowed to mutate. Split into per-command policies
-- gated by can_mutate_projects(), mirroring the "projects" table policies.

drop policy if exists "pas_write" on public.project_activity_status;

create policy "pas_insert" on public.project_activity_status
  for insert to authenticated
  with check (can_mutate_projects() and updated_by = auth.uid());

create policy "pas_update" on public.project_activity_status
  for update to authenticated
  using (can_mutate_projects())
  with check (can_mutate_projects() and updated_by = auth.uid());

create policy "pas_delete" on public.project_activity_status
  for delete to authenticated
  using (is_admin());
