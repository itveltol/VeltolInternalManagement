-- A person (app user or team worker) may have at most one active
-- (pending/approved) vacation request on any given day, whatever the leave
-- type. Rejected/cancelled rows never block.
--
-- Enforced with a trigger instead of an EXCLUDE constraint so pre-existing
-- overlapping rows can stay: exclusion constraints validate the whole table
-- and have no NOT VALID option. Only new or date/status/subject-changing
-- writes are checked.

create or replace function public.fn_vacation_requests_no_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status not in ('pending', 'approved') then
    return new;
  end if;

  -- Unchanged range/status/subject (e.g. only the reason was edited): skip,
  -- so legacy overlapping rows stay editable.
  if tg_op = 'UPDATE'
     and new.start_date = old.start_date
     and new.end_date = old.end_date
     and new.status = old.status
     and new.user_id is not distinct from old.user_id
     and new.team_worker_id is not distinct from old.team_worker_id then
    return new;
  end if;

  -- Serialize concurrent writes for the same person so two simultaneous
  -- inserts can't both pass the check below.
  perform pg_advisory_xact_lock(
    hashtext(coalesce(new.user_id::text, 'tw:' || new.team_worker_id::text))
  );

  if exists (
    select 1
    from public.vacation_requests r
    where r.id <> new.id
      and r.status in ('pending', 'approved')
      and (
        (new.user_id is not null and r.user_id = new.user_id) or
        (new.team_worker_id is not null and r.team_worker_id = new.team_worker_id)
      )
      and daterange(r.start_date, r.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'vacation_overlap' using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists vacation_requests_no_overlap on public.vacation_requests;
create trigger vacation_requests_no_overlap
  before insert or update of start_date, end_date, status, user_id, team_worker_id
  on public.vacation_requests
  for each row execute function public.fn_vacation_requests_no_overlap();

alter table public.vacation_requests
  add constraint vacation_requests_valid_range check (end_date >= start_date) not valid;
