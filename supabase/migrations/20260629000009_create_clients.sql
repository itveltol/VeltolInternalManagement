-- Client type enum
create type public.client_type as enum ('company', 'person');

-- Clients table — supports both legal companies and natural persons (Romanian law)
create table public.clients (
  id             bigint generated always as identity primary key,
  type           public.client_type not null default 'company',
  name           text not null,
  -- Company-specific legal fields
  cui            text,
  j_number       text,
  legal_rep      text,
  -- Person-specific legal fields
  cnp            text,
  id_series      text,
  id_number      text,
  -- Shared fields
  reg_address    text,
  contact_person text,
  email          text,
  phone          text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create index if not exists clients_name_idx on public.clients (name);

alter table public.clients enable row level security;

create policy "clients: authenticated select"
  on public.clients for select
  to authenticated
  using (true);

create policy "clients: admin and pm can insert"
  on public.clients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "clients: admin and pm can update"
  on public.clients for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "clients: only admin can delete"
  on public.clients for delete
  to authenticated
  using (public.is_admin());

-- Add nullable FK from projects to clients
alter table public.projects
  add column if not exists client_id bigint references public.clients (id) on delete set null;

create index if not exists projects_client_id_idx on public.projects (client_id);
