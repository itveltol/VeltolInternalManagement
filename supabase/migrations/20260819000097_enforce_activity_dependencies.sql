-- Server-side enforcement: a project_activity_status row cannot be set to
-- 'finalizat' while any of its catalog-defined prerequisites (from
-- matrice_activity_dependencies) is not itself 'finalizat' for the same
-- project. A missing project_activity_status row for a prerequisite counts
-- as unmet, matching the existing "missing row = neinceput" convention used
-- throughout the Matrice feature.
--
-- This is a BEFORE trigger, so it always runs ahead of the existing AFTER
-- trigger trg_recompute_project_progress regardless of creation order or
-- trigger name — the write is rejected before progress ever recomputes.
create or replace function public.fn_enforce_activity_dependencies()
returns trigger language plpgsql security definer as $$
declare
  unmet_count int;
begin
  if new.status is distinct from 'finalizat' then
    return new;
  end if;

  select count(*) into unmet_count
  from public.matrice_activity_dependencies dep
  where dep.activity_id = new.activity_id
    and not exists (
      select 1 from public.project_activity_status pas
      where pas.project_id = new.project_id
        and pas.activity_id = dep.depends_on_activity_id
        and pas.status = 'finalizat'
    );

  if unmet_count > 0 then
    raise exception 'Cannot mark activity % as finalizat for project %: % prerequisite(s) not yet finalizat',
      new.activity_id, new.project_id, unmet_count
      using errcode = 'check_violation', hint = 'unmet_dependency';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_activity_dependencies
  before insert or update of status on public.project_activity_status
  for each row execute function public.fn_enforce_activity_dependencies();
