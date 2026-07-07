-- Official holidays (admin-managed, excluded from vacation working-day counts)

create table if not exists public.holidays (
  id           bigint generated always as identity primary key,
  date         date not null unique,
  name         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists holidays_date_idx on public.holidays (date);

-- RLS
alter table public.holidays enable row level security;

-- All authenticated users can read holidays (needed to compute day counts/balances)
drop policy if exists "holidays: select all" on public.holidays;
create policy "holidays: select all"
  on public.holidays for select
  to authenticated
  using (true);

-- Admins manage holidays
drop policy if exists "holidays: admin insert" on public.holidays;
create policy "holidays: admin insert"
  on public.holidays for insert
  to authenticated
  with check (is_admin());

drop policy if exists "holidays: admin update" on public.holidays;
create policy "holidays: admin update"
  on public.holidays for update
  to authenticated
  using (is_admin());

drop policy if exists "holidays: admin delete" on public.holidays;
create policy "holidays: admin delete"
  on public.holidays for delete
  to authenticated
  using (is_admin());
