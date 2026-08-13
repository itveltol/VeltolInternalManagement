-- Contract centralizer (situations module reshape): a project *is* a
-- contract here (contract_number/contract_date already live on projects).
-- Multi-contract projects (e.g. separate proiectare + execuție contracts on
-- one site) are a known, accepted limitation — not modeled with a separate
-- contracts table. See centralizerService.ts.

-- VAT is configurable per contract; every money value already in the schema
-- (projects.value_*, situations.amount_*_snapshot, project_budget_lines)
-- stays net. vat_rate is only ever used to gross up figures for display in
-- the centralizer — see grossOf() in centralizerService.ts. Default 21 is
-- the current Romanian standard rate; 0 must stay allowed for reverse
-- charge / export contracts.
alter table public.projects
  add column vat_rate numeric not null default 21 check (vat_rate >= 0 and vat_rate <= 100);

-- Facturat / încasat are the two manually-maintained figures from the
-- Excel centralizer (yellow cells). Everything else in the centralizer row
-- is derived from projects + situations + this table. One row per contract
-- (= per project); a project with no figures entered yet simply has no row
-- here (treat as 0/0), so the app upserts on conflict (project_id) rather
-- than requiring a row to exist up front.
create table public.project_billing (
  id              bigint primary key generated always as identity,
  project_id      bigint not null unique references public.projects (id) on delete cascade,
  invoiced_net    numeric not null default 0,
  collected_net   numeric not null default 0,
  currency        text not null default 'EUR' check (currency in ('EUR', 'RON')),
  conversion_rate numeric,
  notes           text,
  updated_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger project_billing_updated_at
  before update on public.project_billing
  for each row execute function public.set_updated_at();

alter table public.project_billing enable row level security;

-- can_manage_finance()/can_read_project_financials() already exist as of
-- 20260805000067_create_project_budget_lines.sql (financial module phase 1).

create policy "project_billing: scoped select"
  on public.project_billing for select
  to authenticated
  using (public.can_read_project_financials(project_id));

create policy "project_billing: finance can insert"
  on public.project_billing for insert
  to authenticated
  with check (public.can_manage_finance());

create policy "project_billing: finance can update"
  on public.project_billing for update
  to authenticated
  using (public.can_manage_finance());

create policy "project_billing: only admin can delete"
  on public.project_billing for delete
  to authenticated
  using (public.is_admin());

-- AUDIT-2026-08.md:191 — situations rolled up into a financial view now
-- (Valoare executată), so its select policy needs the same project-scoping
-- as project_budget_lines/project_billing instead of the blanket
-- `using (true)` it had when it was just a checklist-billing worksheet.
drop policy "situations: authenticated select" on public.situations;

create policy "situations: scoped select"
  on public.situations for select
  to authenticated
  using (public.can_read_project_financials(project_id));
