-- Narrows fn_derive_matrice_from_checklist (20260722000030) from an
-- always-overwrite three-way derivation (neinceput/in_progres/finalizat) to
-- a one-way "auto-complete only" rule: reaching 100% on a mapped checklist
-- item still marks the matching Matrice cell finalizat, but nothing below
-- 100% touches Matrice at all anymore. This lets a Matrice cell be freely
-- hand-edited afterwards (including back down) without the trigger fighting
-- or reverting it the next time the checklist item changes.
--
-- checklist_activity_map and the trigger binding itself (trg_derive_matrice_
-- from_checklist, same fire conditions) are unchanged — only the function
-- body is replaced. fn_recompute_project_progress is unaffected: it reacts
-- generically to any project_activity_status change regardless of source.
create or replace function public.fn_derive_matrice_from_checklist()
returns trigger language plpgsql security definer as $$
declare
  mapped_activity_id bigint;
  pct numeric;
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

  if pct < 100 then
    return new;
  end if;

  insert into public.project_activity_status (project_id, activity_id, status, updated_by)
  values (new.project_id, mapped_activity_id, 'finalizat', null)
  on conflict (project_id, activity_id)
    do update set status = 'finalizat', updated_by = null, updated_at = now();

  return new;
end;
$$;
