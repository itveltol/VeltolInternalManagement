-- 20260908000131_drop_projects_contract_columns.sql dropped projects.value_eur,
-- but fn_log_project_event() (20260813000082_activity_events_projects_matrice.sql)
-- still diffed new.value_eur/old.value_eur to emit a project.value_changed
-- event. That trigger fires on every UPDATE of `projects`, including the
-- progress_pct/status writes recompute_project_progress() makes on every
-- Matrice cell edit, so it broke the same call path a second time
-- ("record new has no field value_eur").
--
-- Value now lives on `contracts`, not `projects` — there is no
-- project-level value to diff here anymore, so the block is simply removed
-- rather than replaced. A contract.value_changed event, if wanted, belongs
-- on a trigger over `contracts` instead.
create or replace function public.fn_log_project_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.events_suppressed() then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (auth.uid(), 'project.created', new.id, 'projects', new.id,
      jsonb_build_object('entityName', new.name));
    return new;
  end if;

  -- tg_op = 'UPDATE' from here.
  if new.current_phase is distinct from old.current_phase then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (auth.uid(), 'project.phase_changed', new.id, 'projects', new.id,
      jsonb_build_object('entityName', new.name, 'old', old.current_phase, 'new', new.current_phase));
  end if;

  if new.status is distinct from old.status then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (auth.uid(), 'project.status_changed', new.id, 'projects', new.id,
      jsonb_build_object('entityName', new.name, 'old', old.status, 'new', new.status));
  end if;

  if new.deadline is distinct from old.deadline then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (auth.uid(), 'project.deadline_changed', new.id, 'projects', new.id,
      jsonb_build_object('entityName', new.name, 'old', old.deadline, 'new', new.deadline));
  end if;

  return new;
end;
$$;
