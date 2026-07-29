-- Subcontractors: outside companies a project can be fully handed off to
-- instead of being executed in-house. Simple flat record — name, contact,
-- price, deadline — mirroring the shape of `clients`.
create table public.subcontractors (
  id             bigint generated always as identity primary key,
  name           text not null,
  contact_person text,
  phone          text,
  price_eur      numeric,
  deadline       date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger subcontractors_updated_at
  before update on public.subcontractors
  for each row execute function public.set_updated_at();

create index if not exists subcontractors_name_idx on public.subcontractors (name);

alter table public.subcontractors enable row level security;

create policy "subcontractors: authenticated select"
  on public.subcontractors for select
  to authenticated
  using (true);

create policy "subcontractors: admin and pm can insert"
  on public.subcontractors for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "subcontractors: admin and pm can update"
  on public.subcontractors for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "subcontractors: only admin can delete"
  on public.subcontractors for delete
  to authenticated
  using (public.is_admin());
