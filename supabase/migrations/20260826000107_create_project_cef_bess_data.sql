-- Technical intake data for CEF and BESS scopes of work, shown as separate
-- "Date intrare CEF" / "Date intrare BESS" sections on the project detail
-- page — independent per project since a project can be both CEF and BESS.

create table public.project_cef_data (
  project_id       bigint primary key references public.projects (id) on delete cascade,
  putere_instalata numeric(10, 3),
  putere_debitata  numeric(10, 3),
  tip_panou        text,
  tip_invertor     text,
  tip_structura    text,
  tip_gard         text,
  ridicare_topo    text,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users (id)
);

create trigger project_cef_data_updated_at
  before update on public.project_cef_data
  for each row execute function public.set_updated_at();

alter table public.project_cef_data enable row level security;

create policy "cef_data: authenticated select"
  on public.project_cef_data for select
  using (auth.uid() is not null);

create policy "cef_data: mutators insert"
  on public.project_cef_data for insert
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "cef_data: mutators update"
  on public.project_cef_data for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "cef_data: admin delete"
  on public.project_cef_data for delete
  using (is_admin());

create table public.project_bess_data (
  project_id          bigint primary key references public.projects (id) on delete cascade,
  putere_instalata    numeric(10, 3),
  putere_descarcare   numeric(10, 3),
  incarcare_din_retea boolean,
  tip_bess            text,
  tip_pcs             text,
  ridicare_topo       text,
  detalii_trafo       text,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users (id)
);

create trigger project_bess_data_updated_at
  before update on public.project_bess_data
  for each row execute function public.set_updated_at();

alter table public.project_bess_data enable row level security;

create policy "bess_data: authenticated select"
  on public.project_bess_data for select
  using (auth.uid() is not null);

create policy "bess_data: mutators insert"
  on public.project_bess_data for insert
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "bess_data: mutators update"
  on public.project_bess_data for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "bess_data: admin delete"
  on public.project_bess_data for delete
  using (is_admin());
