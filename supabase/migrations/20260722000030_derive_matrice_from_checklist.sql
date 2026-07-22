-- Derive a mapped Matrice cell's status from checklist progress, so entering
-- progress once (in the richer, quantity/day-based checklist) keeps the
-- coarser Matrice grid in sync without a second manual edit. A DB trigger is
-- used (mirroring fn_auto_na_on_type_change in 20260624000006_matrice_status.sql)
-- rather than an application-level call, because project_checklist_items is
-- written from multiple independent code paths (checklistService, and
-- potentially future bulk-import/admin flows) that would otherwise each need
-- to remember to recompute this.
create or replace function public.fn_derive_matrice_from_checklist()
returns trigger language plpgsql security definer as $$
declare
  mapped_activity_id bigint;
  pct numeric;
  derived_status public.activity_status;
begin
  select activity_id into mapped_activity_id
  from public.checklist_activity_map
  where item_number = new.item_number;

  if mapped_activity_id is null then
    return new;
  end if;

  if new.realizat is null or new.plan_total is null or new.plan_total = 0 then
    pct := 0;
  else
    pct := (new.realizat::numeric / new.plan_total) * 100;
  end if;

  if pct <= 0 then
    derived_status := 'neinceput';
  elsif pct >= 100 then
    derived_status := 'finalizat';
  else
    derived_status := 'in_progres';
  end if;

  -- updated_by = null is the "system-derived" sentinel, distinguishing this
  -- write from a human edit via the Matrice grid (which always sets a real
  -- user id) for any future audit/history UI.
  insert into public.project_activity_status (project_id, activity_id, status, updated_by)
  values (new.project_id, mapped_activity_id, derived_status, null)
  on conflict (project_id, activity_id)
    do update set status = excluded.status, updated_by = null, updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_derive_matrice_from_checklist on public.project_checklist_items;
create trigger trg_derive_matrice_from_checklist
  after insert or update of realizat, plan_total on public.project_checklist_items
  for each row execute function public.fn_derive_matrice_from_checklist();
