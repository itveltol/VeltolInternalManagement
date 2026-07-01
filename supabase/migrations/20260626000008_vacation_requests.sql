-- Vacation Requests feature

do $$ begin
  create type vacation_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.vacation_requests (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  start_date   date not null,
  end_date     date not null,
  reason       text,
  status       vacation_status not null default 'pending',
  approved_by  uuid references public.profiles(id) on delete set null,
  approved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists vacation_requests_user_idx on public.vacation_requests (user_id);
create index if not exists vacation_requests_status_idx on public.vacation_requests (status);

-- updated_at trigger (same pattern as other tables)
create or replace function public.fn_vacation_requests_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vacation_requests_updated_at on public.vacation_requests;
create trigger trg_vacation_requests_updated_at
  before update on public.vacation_requests
  for each row execute function public.fn_vacation_requests_updated_at();

-- RLS
alter table public.vacation_requests enable row level security;

-- Users see their own requests + all approved requests (for team visibility)
drop policy if exists "vacation: select own or approved" on public.vacation_requests;
create policy "vacation: select own or approved"
  on public.vacation_requests for select
  to authenticated
  using (user_id = auth.uid() or status = 'approved');

-- Admins see everything
drop policy if exists "vacation: admin select all" on public.vacation_requests;
create policy "vacation: admin select all"
  on public.vacation_requests for select
  to authenticated
  using (is_admin());

-- Users insert for themselves only
drop policy if exists "vacation: insert own" on public.vacation_requests;
create policy "vacation: insert own"
  on public.vacation_requests for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can update their own pending requests (edit or cancel)
drop policy if exists "vacation: update own pending" on public.vacation_requests;
create policy "vacation: update own pending"
  on public.vacation_requests for update
  to authenticated
  using (user_id = auth.uid() and status = 'pending');

-- Admins can update any row (approve/reject)
drop policy if exists "vacation: admin update all" on public.vacation_requests;
create policy "vacation: admin update all"
  on public.vacation_requests for update
  to authenticated
  using (is_admin());

-- Admins can delete any row
drop policy if exists "vacation: admin delete" on public.vacation_requests;
create policy "vacation: admin delete"
  on public.vacation_requests for delete
  to authenticated
  using (is_admin());
