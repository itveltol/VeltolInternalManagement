-- Scope project visibility by role: admins see all projects, everyone else
-- only sees projects where they are the assigned manager. Replaces the
-- previous fully-open "any authenticated user" select policy.
drop policy "projects: authenticated select" on public.projects;

create policy "projects: scoped select"
  on public.projects for select
  using (is_admin() or manager_id = auth.uid());
