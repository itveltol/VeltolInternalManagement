-- Matrice Status feature
-- Enums
do $$ begin
  create type activity_status as enum
    ('finalizat','in_progres','in_asteptare','blocat','neinceput','na');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type project_type as enum
    ('CEF','CEF cu BESS','BESS in CEF existent','BESS Stand-alone');
exception when duplicate_object then null;
end $$;

-- Project type column (no-op if already present)
alter table public.projects
  add column if not exists project_type project_type;

-- Activity catalog (seeded once via seed-activities.sql)
create table if not exists public.activities (
  id               bigint generated always as identity primary key,
  phase_no         int  not null,
  phase_name       text not null,
  name             text not null,
  sort_order       int  not null,
  is_section_header boolean not null default false,
  applies_to       project_type[]   -- null = all types
);

-- Sparse cell store: missing row = neinceput
create table if not exists public.project_activity_status (
  project_id   bigint not null references public.projects(id) on delete cascade,
  activity_id  bigint not null references public.activities(id) on delete cascade,
  status       activity_status not null default 'neinceput',
  note         text,
  updated_by   uuid references auth.users(id),
  updated_at   timestamptz not null default now(),
  primary key (project_id, activity_id)
);
create index if not exists project_activity_status_activity_idx
  on public.project_activity_status (activity_id);

-- Progress view: per-activity completion across all projects
create or replace view public.v_activity_progress as
select activity_id,
       count(*) filter (where status = 'finalizat')::numeric
         / nullif(count(*) filter (where status <> 'na'), 0) as pct
from public.project_activity_status
group by activity_id;

-- Auto-N/A trigger: when project_type is set or changed, upsert 'na'
-- for every activity whose applies_to excludes the new type
create or replace function public.fn_auto_na_on_type_change()
returns trigger language plpgsql security definer as $$
begin
  if new.project_type is null then
    return new;
  end if;

  insert into public.project_activity_status (project_id, activity_id, status)
  select new.id, a.id, 'na'
  from public.activities a
  where a.applies_to is not null
    and not (new.project_type::text = any(a.applies_to::text[]))
  on conflict (project_id, activity_id)
    do update set status = 'na', updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_auto_na_on_type_change on public.projects;
create trigger trg_auto_na_on_type_change
  after insert or update of project_type on public.projects
  for each row execute function public.fn_auto_na_on_type_change();

-- RLS
alter table public.activities enable row level security;
alter table public.project_activity_status enable row level security;

drop policy if exists "activities_read" on public.activities;
create policy "activities_read" on public.activities
  for select to authenticated using (true);

drop policy if exists "pas_read" on public.project_activity_status;
create policy "pas_read" on public.project_activity_status
  for select to authenticated using (true);

drop policy if exists "pas_write" on public.project_activity_status;
create policy "pas_write" on public.project_activity_status
  for all to authenticated
  using (true)
  with check (updated_by = auth.uid());
