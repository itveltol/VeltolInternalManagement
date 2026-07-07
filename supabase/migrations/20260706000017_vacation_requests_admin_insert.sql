create policy "vacation: admin insert any"
  on public.vacation_requests for insert
  to authenticated
  with check (is_admin());
