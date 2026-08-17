-- Site roles, budget/timeline, and structure quantities for CEF projects —
-- feeds the checklist's structural plan_total values and a computed labor cost.

create table public.project_execution_data (
  project_id             bigint primary key references public.projects (id) on delete cascade,
  site_responsible       text,
  diriginte_santier      text,
  rte                    text,
  buget_alocat_eur       numeric(12, 2),
  numar_persoane_alocate smallint,
  zile_deadline          smallint,
  zile_reale             smallint,
  updated_at             timestamptz not null default now(),
  updated_by             uuid references auth.users (id)
);

create trigger project_execution_data_updated_at
  before update on public.project_execution_data
  for each row execute function public.set_updated_at();

alter table public.project_execution_data enable row level security;

create policy "execution_data: authenticated select"
  on public.project_execution_data for select
  using (auth.uid() is not null);

create policy "execution_data: mutators insert"
  on public.project_execution_data for insert
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "execution_data: mutators update"
  on public.project_execution_data for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "execution_data: admin delete"
  on public.project_execution_data for delete
  using (is_admin());

create table public.project_structure_config (
  id              bigint primary key generated always as identity,
  project_id      bigint not null references public.projects (id) on delete cascade,
  structure_type  text not null,
  mesa_count      integer not null,
  picior_per_mesa integer,
  stalp_per_mesa  integer,
  grinzi_per_mesa integer,
  pane_per_mesa   integer,
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger project_structure_config_updated_at
  before update on public.project_structure_config
  for each row execute function public.set_updated_at();

alter table public.project_structure_config enable row level security;

create policy "structure_config: authenticated select"
  on public.project_structure_config for select
  using (auth.uid() is not null);

create policy "structure_config: mutators insert"
  on public.project_structure_config for insert
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "structure_config: mutators update"
  on public.project_structure_config for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "structure_config: mutators delete"
  on public.project_structure_config for delete
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create index structure_config_project_id_idx
  on public.project_structure_config (project_id);
