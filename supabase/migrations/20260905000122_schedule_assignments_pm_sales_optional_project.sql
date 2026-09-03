-- Cards can now be assigned a PM and a sales person directly (independent of
-- the linked project's own manager_id/sales_id), and a card no longer
-- requires a project — a free-text label alone is enough. Requires at least
-- one of project_id / label to be present.
alter table public.schedule_assignments
  alter column project_id drop not null,
  add column pm_id uuid references public.profiles (id) on delete set null,
  add column sales_id uuid references public.profiles (id) on delete set null;

-- Deleting a project should orphan its schedule cards (fall back to label-only), not
-- cascade-delete them. Drop and recreate the project_id FK with on delete set null,
-- looking up the actual auto-generated constraint name rather than assuming it.
do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'public.schedule_assignments'::regclass
    and contype = 'f'
    and conkey = (
      select array_agg(attnum) from pg_attribute
      where attrelid = 'public.schedule_assignments'::regclass and attname = 'project_id'
    );

  execute format('alter table public.schedule_assignments drop constraint %I', fk_name);
end $$;

alter table public.schedule_assignments
  add constraint schedule_assignments_project_id_fkey
    foreign key (project_id) references public.projects (id) on delete set null;

-- At least one of project_id / label must be present (label already defaults to '').
alter table public.schedule_assignments
  add constraint schedule_assignments_project_or_label check (
    project_id is not null or label <> ''
  );
