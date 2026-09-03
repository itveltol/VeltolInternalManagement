-- Extend vacation/absence tracking to team_workers (no-login outfield
-- workers), mirroring the dual-kind convention used by schedule_assignments
-- (profile_id/team_worker_id, exactly one set).
alter table public.vacation_requests
  alter column user_id drop not null,
  add column team_worker_id bigint references public.team_workers (id) on delete cascade,
  add constraint vacation_requests_one_subject check (
    (user_id is not null and team_worker_id is null) or
    (user_id is null and team_worker_id is not null)
  );

create index if not exists vacation_requests_team_worker_idx
  on public.vacation_requests (team_worker_id) where team_worker_id is not null;

-- team_workers have no auth identity, so there's no self-service submitter —
-- a PM/admin logs the absence directly (see logWorkerAbsenceAction), always
-- inserted as already-approved. The existing "select own or approved" policy
-- still covers reads correctly (status = 'approved' half already grants
-- read access; user_id = auth.uid() is vacuously false for worker rows).
create policy "vacation: admin and pm can insert for team_worker"
  on public.vacation_requests for insert
  to authenticated
  with check (
    team_worker_id is not null
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "vacation: admin and pm can update team_worker rows"
  on public.vacation_requests for update
  to authenticated
  using (
    team_worker_id is not null
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );
