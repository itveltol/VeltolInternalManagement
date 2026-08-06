-- Financial-module RLS helpers. `finance` has existed as a role value since
-- profiles were created but has been behaviorally inert until now — this is
-- where it gets real capability. Security-definer + stable, same shape as
-- `is_admin()`, to avoid RLS self-join recursion on `profiles`.
create or replace function public.can_manage_finance()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'finance')
  )
$$;

-- Financial data is project-scoped and sensitive: a project manager should
-- only see their own projects' numbers, not the whole portfolio's. Admin and
-- finance see everything. This is intentionally NOT `using (true)` — see
-- PLAN-modul-financiar.md section 5.
create or replace function public.can_read_project_financials(p_project_id bigint)
returns boolean language sql security definer stable set search_path = public as $$
  select
    public.can_manage_finance()
    or exists (
      select 1 from projects
      where id = p_project_id and manager_id = auth.uid()
    )
$$;

-- The deviz (planned budget/cost baseline) for a project, grouped by cost
-- category. This is the "Buget" figure in the margin model — see plan
-- section 2. currency/conversion_rate follow the same pinned-at-insert
-- convention as projects.value_* (see 20260803000063/64): conversion_rate is
-- captured once from exchange_rates and never recomputed against a later
-- day's rate, so historical lines don't silently drift.
create table public.project_budget_lines (
  id                 bigint primary key generated always as identity,
  project_id         bigint not null references public.projects (id) on delete cascade,
  cost_category_id   bigint not null references public.cost_categories (id),
  phase_no           int,
  description        text not null,
  qty                numeric not null,
  unit               text not null,
  unit_price         numeric not null,
  currency           text not null default 'EUR' check (currency in ('EUR', 'RON')),
  conversion_rate    numeric,
  amount             numeric not null,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index project_budget_lines_project_id_idx on public.project_budget_lines (project_id);
create index project_budget_lines_cost_category_id_idx on public.project_budget_lines (cost_category_id);

create trigger project_budget_lines_updated_at
  before update on public.project_budget_lines
  for each row execute function public.set_updated_at();

alter table public.project_budget_lines enable row level security;

create policy "project_budget_lines: scoped select"
  on public.project_budget_lines for select
  to authenticated
  using (public.can_read_project_financials(project_id));

create policy "project_budget_lines: admin and pm can insert"
  on public.project_budget_lines for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "project_budget_lines: admin and pm can update"
  on public.project_budget_lines for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "project_budget_lines: only admin can delete"
  on public.project_budget_lines for delete
  to authenticated
  using (public.is_admin());
