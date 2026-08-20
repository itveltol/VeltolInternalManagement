-- activities had only a read policy (activities_read, using (true)) since it
-- was a near-static, migration-only-edited taxonomy. Now that admins can edit
-- it through the app, add an admin-gated write policy, matching the
-- pas_delete precedent (is_admin(), stricter than the admin-or-PM
-- can_mutate_projects() used for project_activity_status writes) since this
-- catalog affects every project's progress calculation.
create policy "activities_write" on public.activities
  for all to authenticated using (is_admin()) with check (is_admin());
