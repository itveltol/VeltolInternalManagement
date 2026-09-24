-- Per-person, per-year vacation allowances and manual adjustments.
-- Subjects follow the vacation_requests dual-kind convention: exactly one
-- of user_id (app user) / team_worker_id (no-login outfield worker) is set.
--
-- A year without an allowance row inherits the latest earlier year's
-- base_days (falling back to ANNUAL_VACATION_DAYS in app code), so admins
-- only need to write a row when the allowance changes.

create table public.vacation_allowances (
  id              bigint generated always as identity primary key,
  user_id         uuid references public.profiles (id) on delete cascade,
  team_worker_id  bigint references public.team_workers (id) on delete cascade,
  year            int not null check (year between 2000 and 2100),
  base_days       numeric(5,1) not null check (base_days >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint vacation_allowances_one_subject check (
    (user_id is not null and team_worker_id is null) or
    (user_id is null and team_worker_id is not null)
  )
);

create unique index vacation_allowances_user_year_idx
  on public.vacation_allowances (user_id, year) where user_id is not null;
create unique index vacation_allowances_team_worker_year_idx
  on public.vacation_allowances (team_worker_id, year) where team_worker_id is not null;

create trigger vacation_allowances_updated_at
  before update on public.vacation_allowances
  for each row execute function public.set_updated_at();

alter table public.vacation_allowances enable row level security;

create policy "vacation_allowances: select own or admin"
  on public.vacation_allowances for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "vacation_allowances: admin insert"
  on public.vacation_allowances for insert
  to authenticated
  with check (public.is_admin());

create policy "vacation_allowances: admin update"
  on public.vacation_allowances for update
  to authenticated
  using (public.is_admin());

create policy "vacation_allowances: admin delete"
  on public.vacation_allowances for delete
  to authenticated
  using (public.is_admin());

-- Signed day corrections on top of the allowance (e.g. +2 overtime
-- compensation, -1 correction), always with a note for the audit trail.
create table public.vacation_adjustments (
  id              bigint generated always as identity primary key,
  user_id         uuid references public.profiles (id) on delete cascade,
  team_worker_id  bigint references public.team_workers (id) on delete cascade,
  year            int not null check (year between 2000 and 2100),
  days            numeric(5,1) not null check (days <> 0),
  note            text not null check (length(trim(note)) > 0),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint vacation_adjustments_one_subject check (
    (user_id is not null and team_worker_id is null) or
    (user_id is null and team_worker_id is not null)
  )
);

create index vacation_adjustments_user_idx
  on public.vacation_adjustments (user_id, year) where user_id is not null;
create index vacation_adjustments_team_worker_idx
  on public.vacation_adjustments (team_worker_id, year) where team_worker_id is not null;

alter table public.vacation_adjustments enable row level security;

create policy "vacation_adjustments: select own or admin"
  on public.vacation_adjustments for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "vacation_adjustments: admin insert"
  on public.vacation_adjustments for insert
  to authenticated
  with check (public.is_admin());

create policy "vacation_adjustments: admin delete"
  on public.vacation_adjustments for delete
  to authenticated
  using (public.is_admin());
