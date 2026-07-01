create type public.document_linked_type as enum (
  'project',
  'client',
  'matrice_cell',
  'checklist_item'
);

create table public.documents (
  id           bigint generated always as identity primary key,
  name         text not null,
  url          text not null,
  linked_type  public.document_linked_type not null,
  -- project/client: stores integer id as text ("42")
  -- matrice_cell: "projectId:activityId" composite key
  -- checklist_item: checklist_item record id as text
  linked_id    text not null,
  -- denormalised FK so per-project queries are a simple .eq('project_id', id)
  -- set on ALL document types including matrice_cell and checklist_item docs
  project_id   bigint references public.projects(id) on delete cascade,
  created_by   uuid not null references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index documents_project_id_idx  on public.documents (project_id);
create index documents_linked_type_idx on public.documents (linked_type, linked_id);
create index documents_created_at_idx  on public.documents (created_at desc);

alter table public.documents enable row level security;

create policy "documents: authenticated select"
  on public.documents for select
  to authenticated
  using (true);

create policy "documents: mutators insert"
  on public.documents for insert
  to authenticated
  with check (can_mutate_projects());

create policy "documents: creator or admin delete"
  on public.documents for delete
  to authenticated
  using (created_by = auth.uid() or is_admin());
