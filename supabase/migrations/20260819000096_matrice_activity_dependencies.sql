-- Catalog-level dependency edges between activities: "activity_id cannot be
-- finalizat (for a given project) until depends_on_activity_id is finalizat
-- for that same project". The rule lives on the catalog (applies uniformly
-- to every project); enforcement against a specific project's cell writes is
-- added in the next migration.
create table public.matrice_activity_dependencies (
  activity_id            bigint not null references public.activities(id) on delete cascade,
  depends_on_activity_id bigint not null references public.activities(id) on delete cascade,
  created_at             timestamptz not null default now(),
  primary key (activity_id, depends_on_activity_id),
  check (activity_id <> depends_on_activity_id)
);

create index matrice_activity_dependencies_depends_on_idx
  on public.matrice_activity_dependencies (depends_on_activity_id);

alter table public.matrice_activity_dependencies enable row level security;

create policy "matrice_activity_dependencies_read" on public.matrice_activity_dependencies
  for select to authenticated using (true);

create policy "matrice_activity_dependencies_write" on public.matrice_activity_dependencies
  for all to authenticated using (is_admin()) with check (is_admin());

-- Reject any new/updated edge that would create a dependency cycle: walk
-- everything reachable from the proposed prerequisite (depends_on_activity_id)
-- and check whether the activity being edited (activity_id) is among them —
-- if so, the new edge would close a loop.
create or replace function public.fn_prevent_dependency_cycle()
returns trigger language plpgsql as $$
begin
  if exists (
    with recursive reachable(id) as (
      select new.depends_on_activity_id
      union
      select d.depends_on_activity_id
      from public.matrice_activity_dependencies d
      join reachable r on d.activity_id = r.id
    )
    select 1 from reachable where id = new.activity_id
  ) then
    raise exception 'Dependency cycle detected: activity % cannot depend on %',
      new.activity_id, new.depends_on_activity_id
      using errcode = 'check_violation', hint = 'dependency_cycle';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_dependency_cycle
  before insert or update on public.matrice_activity_dependencies
  for each row execute function public.fn_prevent_dependency_cycle();
