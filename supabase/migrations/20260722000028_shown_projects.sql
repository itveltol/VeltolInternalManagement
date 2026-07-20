-- Per-user "add to view" allow-list for the Gantt and Matrice Status pages.
-- At 400+ projects, defaulting to "show everything, hide one at a time"
-- (hidden_projects) rendered the full portfolio on first load and froze the
-- browser tab. This table inverts the model: nothing is shown until the
-- user explicitly picks a project, so the initial grid/chart is empty and
-- cheap to render.
create table public.shown_projects (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  view       public.hidden_project_view not null,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id, view)
);

create index shown_projects_user_view_idx on public.shown_projects (user_id, view);

alter table public.shown_projects enable row level security;

create policy "shown_projects: select own"
  on public.shown_projects for select
  to authenticated
  using (user_id = auth.uid());

create policy "shown_projects: insert own"
  on public.shown_projects for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "shown_projects: delete own"
  on public.shown_projects for delete
  to authenticated
  using (user_id = auth.uid());
