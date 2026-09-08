-- Introduces a first-class contracts table: a project can have multiple
-- contracts over time (e.g. a proiectare+executie contract signed now, a
-- separate racordare contract signed months later), each with its own
-- contract_number/date/value/currency/vat_rate/contract_type[]. Previously a
-- project itself WAS the contract, 1:1 (see the now-superseded comment on
-- 20260811000074_contract_billing.sql) — that was a known, deliberately
-- accepted limitation, not an oversight.
--
-- This migration is purely additive: it creates `contracts`, backfills one
-- row per existing project (verbatim copy of that project's current
-- contract_number/date/value_eur/value_lei/currency/conversion_rate/
-- vat_rate/contract_type), and leaves every existing `projects` column and
-- all app code untouched. The app cutover to actually read/write `contracts`
-- instead of `projects.contract_*` ships as a separate, later change; the old
-- columns are dropped only after that cutover is confirmed live everywhere.
create table public.contracts (
  id                bigint primary key generated always as identity,
  project_id        bigint not null references public.projects (id) on delete cascade,
  contract_number   text,
  contract_date     date,
  value_eur         bigint,
  value_lei         bigint,
  currency          text not null default 'EUR' check (currency in ('EUR', 'RON')),
  conversion_rate   numeric,
  vat_rate          numeric not null default 21 check (vat_rate >= 0 and vat_rate <= 100),
  contract_type     public.contract_type[] not null default array[]::public.contract_type[],
  notes             text,
  updated_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index contracts_project_id_idx on public.contracts (project_id);

-- Mirrors projects.value_eur_equiv (20260907000126_project_value_eur_equiv_column.sql),
-- scoped to the contract that actually owns the value.
alter table public.contracts
  add column value_eur_equiv numeric generated always as (
    coalesce(
      value_eur,
      case
        when conversion_rate is not null and conversion_rate <> 0
          then value_lei / conversion_rate
        else null
      end
    )
  ) stored;

create trigger contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

alter table public.contracts enable row level security;

-- Same visibility shape as projects itself (contracts are project data, not
-- separately-scoped financial data like project_budget_lines/situations) —
-- preserves today's existing broad visibility into project.value_eur etc.
-- rather than narrowing it; can_mutate_projects()/is_admin() already exist
-- (20260623000002_create_projects.sql / 20260622000001_create_profiles.sql).
create policy "contracts: authenticated select"
  on public.contracts for select
  to authenticated
  using (auth.uid() is not null);

create policy "contracts: mutators insert"
  on public.contracts for insert
  to authenticated
  with check (public.can_mutate_projects());

create policy "contracts: mutators update"
  on public.contracts for update
  to authenticated
  using (public.can_mutate_projects());

create policy "contracts: admin delete"
  on public.contracts for delete
  to authenticated
  using (public.is_admin());

-- Backfill: exactly one contracts row per existing project, copying every
-- contract fact verbatim off projects. Safe to run unguarded (no on conflict
-- needed) since this is a one-shot backfill in a migration that runs exactly
-- once per environment.
insert into public.contracts (
  project_id, contract_number, contract_date, value_eur, value_lei,
  currency, conversion_rate, vat_rate, contract_type
)
select
  id, contract_number, contract_date, value_eur, value_lei,
  currency, conversion_rate, vat_rate, contract_type
from public.projects;

-- Enforces "within one project, a given contract_type value can be claimed
-- by at most one contract at a time." Postgres has no native "array
-- elements unique across sibling rows" constraint, so this normalizes each
-- contract's claimed types into one row per (contract, type), kept in sync
-- by trigger, with the actual exclusivity enforced by a plain unique index —
-- the same declarative-constraint-over-trigger-loop pattern already used by
-- matrice_phases_sort_order_key (20260819000094_matrice_phases_table.sql).
create table public.contract_claimed_types (
  contract_id    bigint not null references public.contracts (id) on delete cascade,
  project_id     bigint not null references public.projects (id) on delete cascade,
  contract_type  public.contract_type not null,
  primary key (contract_id, contract_type)
);

create unique index contract_claimed_types_exclusive_idx
  on public.contract_claimed_types (project_id, contract_type);

alter table public.contract_claimed_types enable row level security;

create policy "contract_claimed_types: authenticated select"
  on public.contract_claimed_types for select
  to authenticated
  using (auth.uid() is not null);

-- No direct insert/update/delete policy for authenticated users: this table
-- is only ever written by fn_sync_contract_claimed_types() below (security
-- definer), driven off contracts.contract_type — never edited directly.

create or replace function public.fn_sync_contract_claimed_types()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from contract_claimed_types where contract_id = old.id;
    return old;
  end if;

  delete from contract_claimed_types where contract_id = new.id;
  insert into contract_claimed_types (contract_id, project_id, contract_type)
  select new.id, new.project_id, unnest(new.contract_type);

  return new;
end;
$$;

create trigger contracts_sync_claimed_types
  after insert or update of contract_type, project_id or delete
  on public.contracts
  for each row execute function public.fn_sync_contract_claimed_types();

-- Populate contract_claimed_types for the contracts just backfilled above
-- (the insert trigger only fires for rows inserted after trigger creation,
-- so run the sync once explicitly for the existing backfilled rows).
insert into public.contract_claimed_types (contract_id, project_id, contract_type)
select id, project_id, unnest(contract_type)
from public.contracts;
