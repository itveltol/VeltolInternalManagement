-- Sales person on a project, mirroring manager_id's shape exactly.
alter table public.projects
  add column sales_id uuid references public.profiles (id) on delete set null;

create index if not exists projects_sales_id_idx on public.projects (sales_id);
