create table public.project_checklist_items (
  id            bigint primary key generated always as identity,
  project_id    bigint not null references public.projects (id) on delete cascade,
  item_number   smallint not null check (item_number between 1 and 100),
  realizat      numeric(10, 2),
  notes         text,
  updated_at    timestamptz not null default now(),
  unique (project_id, item_number)
);

create trigger checklist_items_updated_at
  before update on public.project_checklist_items
  for each row execute function public.set_updated_at();

alter table public.project_checklist_items enable row level security;

create policy "checklist: authenticated select"
  on public.project_checklist_items for select
  using (auth.uid() is not null);

create policy "checklist: mutators insert"
  on public.project_checklist_items for insert
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "checklist: mutators update"
  on public.project_checklist_items for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "checklist: admin delete"
  on public.project_checklist_items for delete
  using (is_admin());

create index checklist_items_project_id_idx
  on public.project_checklist_items (project_id);
