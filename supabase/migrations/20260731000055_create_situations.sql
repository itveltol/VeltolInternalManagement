-- A "situation" (Romanian construction industry term for a payment
-- application / draw request) is a project-scoped, priced snapshot of a
-- subset of checklist items, used to bill a client for work completed so
-- far. Draft situations recompute live from current checklist progress;
-- finalizing a situation freezes its line amounts and % complete so later
-- checklist changes can't silently rewrite a document that's already been
-- sent/invoiced (see situation_items.pct_snapshot / amount_*_snapshot).
create table public.situations (
  id            bigint primary key generated always as identity,
  project_id    bigint not null references public.projects (id) on delete cascade,
  name          text not null,
  status        text not null default 'draft' check (status in ('draft', 'final')),
  finalized_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index situations_project_id_idx on public.situations (project_id);

create trigger situations_updated_at
  before update on public.situations
  for each row execute function public.set_updated_at();

alter table public.situations enable row level security;

create policy "situations: authenticated select"
  on public.situations for select
  to authenticated
  using (true);

create policy "situations: admin and pm can insert"
  on public.situations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "situations: admin and pm can update"
  on public.situations for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "situations: only admin can delete"
  on public.situations for delete
  to authenticated
  using (public.is_admin());

-- Line items: one row per checklist item included in a given situation.
-- price_eur/price_lei are entered manually (same convention as
-- project_subcontractors.price_eur/price_lei — no currency conversion, both
-- are independent nullable amounts). The snapshot columns stay null for the
-- lifetime of a draft situation (amounts are computed live from the current
-- checklist state at render time — see situationService.ts) and are
-- populated exactly once, at finalize time, after which they never change
-- even if the underlying checklist item's realizat/plan_total keeps moving.
create table public.situation_items (
  id                   bigint primary key generated always as identity,
  situation_id         bigint not null references public.situations (id) on delete cascade,
  checklist_item_id    bigint not null references public.project_checklist_items (id) on delete restrict,
  price_eur            numeric,
  price_lei            numeric,
  pct_snapshot         numeric,
  amount_eur_snapshot  numeric,
  amount_lei_snapshot  numeric,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (situation_id, checklist_item_id)
);

create index situation_items_situation_id_idx on public.situation_items (situation_id);
create index situation_items_checklist_item_id_idx on public.situation_items (checklist_item_id);

create trigger situation_items_updated_at
  before update on public.situation_items
  for each row execute function public.set_updated_at();

alter table public.situation_items enable row level security;

create policy "situation_items: authenticated select"
  on public.situation_items for select
  to authenticated
  using (true);

create policy "situation_items: admin and pm can insert"
  on public.situation_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "situation_items: admin and pm can update"
  on public.situation_items for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "situation_items: only admin can delete"
  on public.situation_items for delete
  to authenticated
  using (public.is_admin());
