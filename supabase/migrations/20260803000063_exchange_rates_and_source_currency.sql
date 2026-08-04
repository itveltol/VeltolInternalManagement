-- Daily EUR/RON reference rate, cached from BNR (Banca Nationala a Romaniei)
-- so we don't hit their feed on every read. One row per calendar day the
-- rate was fetched; "today's rate" is just the latest row.
create table public.exchange_rates (
  id          bigint primary key generated always as identity,
  rate_date   date not null unique,
  eur_ron     numeric not null,
  fetched_at  timestamptz not null default now()
);

alter table public.exchange_rates enable row level security;

create policy "exchange_rates: authenticated select"
  on public.exchange_rates for select
  to authenticated
  using (true);

-- Rates are only ever written by the cron/service role, never from the
-- client, so no insert/update policy is needed for regular users.

-- Projects and subcontractor assignments store both value_eur/value_lei
-- (or price_eur/price_lei), but until now those were independent manual
-- entries. `currency` marks which one is the source of truth the user
-- actually typed in; the other becomes a live BNR-rate conversion for
-- display rather than a second manual field. Existing rows are backfilled
-- to EUR since that was always the first/primary field on both tables.
alter table public.projects
  add column currency text not null default 'EUR' check (currency in ('EUR', 'RON'));

alter table public.project_subcontractors
  add column currency text not null default 'EUR' check (currency in ('EUR', 'RON'));
