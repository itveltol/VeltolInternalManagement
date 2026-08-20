-- fn_log_matrice_event() still read activities.phase_no, dropped by
-- activities_phase_id.sql in favor of phase_id — every project_activity_status
-- write was failing with "column phase_no does not exist". Switch to
-- phase_id and rename the summary field accordingly (nothing in the app
-- reads activity_events.summary->>'phaseNo' today, so this is a safe rename).
create or replace function public.fn_log_matrice_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_activity_name text;
  v_phase_id bigint;
begin
  if public.events_suppressed() then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'neinceput' then
      return new;
    end if;
    select name, phase_id into v_activity_name, v_phase_id
    from activities where id = new.activity_id;

    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (
      coalesce(new.updated_by, auth.uid()), 'matrice.status_changed', new.project_id,
      'project_activity_status', new.activity_id,
      jsonb_build_object(
        'activityName', v_activity_name, 'phaseId', v_phase_id,
        'old', 'neinceput', 'new', new.status
      )
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    select name, phase_id into v_activity_name, v_phase_id
    from activities where id = new.activity_id;

    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (
      coalesce(new.updated_by, auth.uid()), 'matrice.status_changed', new.project_id,
      'project_activity_status', new.activity_id,
      jsonb_build_object(
        'activityName', v_activity_name, 'phaseId', v_phase_id,
        'old', old.status, 'new', new.status
      )
    );
  end if;

  return new;
end;
$$;
