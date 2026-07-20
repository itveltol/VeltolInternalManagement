-- Per-user "hide from view" preference for the Gantt and Matrice Status
-- pages. Replaces the previous localStorage-only implementation, which
-- could appear to reset when navigating between pages (state tied to a
-- single browser instead of the account) — this persists server-side and
-- follows the user across devices/browsers.
create type public.hidden_project_view as enum ('gantt', 'matrice');

create table public.hidden_projects (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  view       public.hidden_project_view not null,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id, view)
);

create index hidden_projects_user_view_idx on public.hidden_projects (user_id, view);

alter table public.hidden_projects enable row level security;

create policy "hidden_projects: select own"
  on public.hidden_projects for select
  to authenticated
  using (user_id = auth.uid());

create policy "hidden_projects: insert own"
  on public.hidden_projects for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "hidden_projects: delete own"
  on public.hidden_projects for delete
  to authenticated
  using (user_id = auth.uid());
