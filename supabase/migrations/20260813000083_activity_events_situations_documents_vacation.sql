-- Communication module (Phase 3) — activity_events triggers for
-- `situations`, `documents`, `vacation_requests`.

-- situations: draft -> final is the only status transition that exists
-- today (see create_situations.sql check constraint), logged as
-- situation.finalized; the row's own creation is situation.created.
create or replace function public.fn_log_situation_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_project_name text;
begin
  if public.events_suppressed() then
    return coalesce(new, old);
  end if;

  select name into v_project_name from projects where id = new.project_id;

  if tg_op = 'INSERT' then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (auth.uid(), 'situation.created', new.project_id, 'situations', new.id,
      jsonb_build_object('entityName', new.name, 'projectName', v_project_name));
    return new;
  end if;

  if new.status is distinct from old.status and new.status = 'final' then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (auth.uid(), 'situation.finalized', new.project_id, 'situations', new.id,
      jsonb_build_object('entityName', new.name, 'projectName', v_project_name));
  end if;

  return new;
end;
$$;

create trigger situations_log_event
  after insert or update on public.situations
  for each row execute function public.fn_log_situation_event();

-- documents: upload only. The table has no expiry concept of its own (aviz
-- expiry lives on project_activity_status.expires_at, already covered by
-- matrice.status_changed) — document.expiry_set / document.expired from the
-- module plan don't correspond to any column that exists on this table, so
-- they are deliberately not implemented rather than invented.
create or replace function public.fn_log_document_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.events_suppressed() then
    return new;
  end if;

  insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
  values (coalesce(new.created_by, auth.uid()), 'document.uploaded', new.project_id, 'documents', new.id,
    jsonb_build_object('entityName', new.name));

  return new;
end;
$$;

create trigger documents_log_event
  after insert on public.documents
  for each row execute function public.fn_log_document_event();

-- vacation_requests: submission is company-level (no project anchor — a
-- vacation request isn't scoped to any single project), approval/rejection
-- likewise. Uses the requester's own name as entityName since there's no
-- project name to anchor on.
create or replace function public.fn_log_vacation_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_requester_name text;
begin
  if public.events_suppressed() then
    return coalesce(new, old);
  end if;

  select trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    into v_requester_name
    from profiles where id = new.user_id;

  if tg_op = 'INSERT' then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (auth.uid(), 'vacation.submitted', null, 'vacation_requests', new.id,
      jsonb_build_object('entityName', v_requester_name, 'old', null, 'new',
        jsonb_build_object('startDate', new.start_date, 'endDate', new.end_date)));
    return new;
  end if;

  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (
      auth.uid(),
      case new.status when 'approved' then 'vacation.approved' else 'vacation.rejected' end,
      null, 'vacation_requests', new.id,
      jsonb_build_object('entityName', v_requester_name, 'old', old.status, 'new', new.status)
    );
  end if;

  return new;
end;
$$;

create trigger vacation_requests_log_event
  after insert or update on public.vacation_requests
  for each row execute function public.fn_log_vacation_event();
