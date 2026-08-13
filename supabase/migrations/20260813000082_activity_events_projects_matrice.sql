-- Communication module (Phase 3) — activity_events triggers for `projects`
-- and `project_activity_status`. Both compare old/new and return early on
-- no real change: project_activity_status alone is ~95 rows per project, so
-- an update-with-no-change must produce nothing, or the feed drowns itself.

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

  if new.value_eur is distinct from old.value_eur then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (auth.uid(), 'project.value_changed', new.id, 'projects', new.id,
      jsonb_build_object('entityName', new.name, 'old', old.value_eur, 'new', new.value_eur));
  end if;

  return new;
end;
$$;

create trigger projects_log_event
  after insert or update on public.projects
  for each row execute function public.fn_log_project_event();

-- project_activity_status: sparse cell store, no primary key of its own
-- (composite project_id + activity_id). entity_id has no single-column
-- value to carry, so it stores activity_id and project_id is already the
-- FK column — entity_table documents which cell, not a separate identity.
create or replace function public.fn_log_matrice_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_activity_name text;
  v_phase_no int;
begin
  if public.events_suppressed() then
    return coalesce(new, old);
  end if;

  -- The UI writes cells via upsert (onConflict: project_id,activity_id), so
  -- the very first status ever recorded for a sparse cell arrives as an
  -- INSERT, not an UPDATE — tg_op distinguishes an outright new cell (no
  -- `old` row to diff against) from a change to an existing one.
  if tg_op = 'INSERT' then
    if new.status = 'neinceput' then
      return new;
    end if;
    select name, phase_no into v_activity_name, v_phase_no
    from activities where id = new.activity_id;

    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (
      coalesce(new.updated_by, auth.uid()), 'matrice.status_changed', new.project_id,
      'project_activity_status', new.activity_id,
      jsonb_build_object(
        'activityName', v_activity_name, 'phaseNo', v_phase_no,
        'old', 'neinceput', 'new', new.status
      )
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    select name, phase_no into v_activity_name, v_phase_no
    from activities where id = new.activity_id;

    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (
      coalesce(new.updated_by, auth.uid()), 'matrice.status_changed', new.project_id,
      'project_activity_status', new.activity_id,
      jsonb_build_object(
        'activityName', v_activity_name, 'phaseNo', v_phase_no,
        'old', old.status, 'new', new.status
      )
    );
  end if;

  return new;
end;
$$;

create trigger project_activity_status_log_event
  after insert or update on public.project_activity_status
  for each row execute function public.fn_log_matrice_event();

-- fn_auto_na_on_type_change bulk-writes 'na' into every excluded activity's
-- cell whenever a project's type is set/changed — a system cascade, not a
-- human editing one cell, and would otherwise spam the feed with dozens of
-- matrice.status_changed rows per project_type change. Suppress just this
-- cascade's own writes; it still runs inside the same transaction as the
-- projects update, so project.* events for that row are unaffected.
create or replace function public.fn_auto_na_on_type_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.project_type is null then
    return new;
  end if;

  perform set_config('app.suppress_events', 'on', true);

  insert into public.project_activity_status (project_id, activity_id, status)
  select new.id, a.id, 'na'
  from public.activities a
  where a.applies_to is not null
    and not (new.project_type::text = any(a.applies_to::text[]))
  on conflict (project_id, activity_id)
    do update set status = 'na', updated_at = now();

  perform set_config('app.suppress_events', 'off', true);

  return new;
end;
$$;
