-- Material/equipment suppliers (furnizori), distinct from subcontractors
-- (labor) because the role and reporting are different — see
-- PLAN-modul-financiar.md section 3.3. Structured like `clients`/
-- `subcontractors`: plain CRUD reference data, no project assignment table
-- of its own in this phase.
create table public.suppliers (
  id              bigint primary key generated always as identity,
  name            text not null,
  cui             text,
  reg_com         text,
  contact_person  text,
  email           text,
  phone           text,
  address         text,
  iban            text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.suppliers enable row level security;

create policy "suppliers: authenticated select"
  on public.suppliers for select
  to authenticated
  using (true);

create policy "suppliers: admin and pm can insert"
  on public.suppliers for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "suppliers: admin and pm can update"
  on public.suppliers for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "suppliers: only admin can delete"
  on public.suppliers for delete
  to authenticated
  using (public.is_admin());
