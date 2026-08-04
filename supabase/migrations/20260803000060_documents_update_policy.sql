-- documents had select/insert/delete policies but no UPDATE policy, so RLS
-- silently denied every update (0 rows matched, no error) — a no-op write
-- that looked like it succeeded to any caller not checking rows returned.

create policy "documents: mutators update"
  on public.documents for update
  to authenticated
  using (can_mutate_projects())
  with check (can_mutate_projects());
