-- Notifies the assignee when a personal task is created with someone else as
-- assignee. Assignment currently only happens at creation time (no
-- reassignment UI/action exists yet), so an `after insert` trigger is
-- sufficient; add an `after update of assignee_id` branch if reassignment is
-- ever introduced.
create or replace function public.fn_notify_on_note_assignee()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor_name text;
  v_project_name text;
  v_snippet text;
  v_href text;
begin
  if new.assignee_id is null or new.assignee_id = new.author_id then
    return new;
  end if;

  select trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    into v_actor_name
    from profiles where id = new.author_id;

  if new.project_id is not null then
    select name into v_project_name from projects where id = new.project_id;
  end if;

  v_snippet := left(new.body, 140);
  v_href := case
    when new.project_id is not null then '/board?note=' || new.id || '&project=' || new.project_id
    else '/board?note=' || new.id
  end;

  insert into notifications (profile_id, type, note_id, project_id, payload, href)
  values (
    new.assignee_id, 'task_assigned', new.id, new.project_id,
    jsonb_build_object(
      'actorName', v_actor_name, 'projectName', v_project_name,
      'snippet', v_snippet, 'noteKind', new.kind
    ),
    v_href
  );

  return new;
end;
$$;

create trigger notes_notify_assignee_after_insert
  after insert on public.notes
  for each row execute function public.fn_notify_on_note_assignee();
