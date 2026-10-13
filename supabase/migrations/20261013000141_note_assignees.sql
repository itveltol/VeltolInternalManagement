-- Move personal tasks from a single notes.assignee_id column to a
-- many-to-many note_assignees table: one task can now be handed to several
-- people. Each assignee gets read + status access (can_read_note), the
-- task_assigned notification, and the task in their "For me" band.
--
-- Assignees stay limited to personal notes (previously the
-- notes_assignee_requires_personal check); that rule now lives in
-- create_note(), the only writer of note_assignees.

create table public.note_assignees (
  note_id    bigint not null references public.notes (id) on delete cascade,
  profile_id uuid   not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, profile_id)
);

create index note_assignees_profile_idx on public.note_assignees (profile_id);

alter table public.note_assignees enable row level security;

-- Writes only happen through the security definer create_note(), so no
-- insert/update/delete policies.
create policy "note_assignees: readers select"
  on public.note_assignees for select
  to authenticated
  using (public.can_read_note(note_id));

-- Backfill: one row per existing single assignee.
insert into public.note_assignees (note_id, profile_id)
select id, assignee_id
from public.notes
where assignee_id is not null;

-- can_read_note: same as 20260906000124, with the assignee branch reading
-- note_assignees instead of the dropped column.
create or replace function public.can_read_note(p_note_id bigint)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from notes root
    join notes n on n.id = p_note_id
    where root.id = coalesce(n.parent_id, n.id)
      and (
        root.author_id = auth.uid()
        or exists (
          select 1 from note_assignees na
          where na.note_id = root.id and na.profile_id = auth.uid()
        )
        or exists (
          select 1 from note_mentions nm
          where nm.note_id = p_note_id and nm.profile_id = auth.uid()
        )
        or (root.visibility = 'company' and auth.uid() is not null)
        or (
          root.visibility = 'team' and root.team_id is not null
          and exists (
            select 1 from team_members tm
            where tm.team_id = root.team_id and tm.user_id = auth.uid()
          )
        )
        or (
          root.visibility = 'project' and root.project_id is not null
          and exists (
            select 1 from projects p
            where p.id = root.project_id
              and p.manager_id = auth.uid()
          )
        )
        or public.is_admin()
      )
  )
$$;

-- Notification: fire once per assignee row instead of once per note, so
-- every assignee (except the author) gets their own task_assigned.
drop trigger if exists notes_notify_assignee_after_insert on public.notes;
drop function if exists public.fn_notify_on_note_assignee();

create or replace function public.fn_notify_on_note_assignee_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_note notes%rowtype;
  v_actor_name text;
  v_project_name text;
  v_href text;
begin
  select * into v_note from notes where id = new.note_id;

  if v_note.id is null or new.profile_id = v_note.author_id then
    return new;
  end if;

  select trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    into v_actor_name
    from profiles where id = v_note.author_id;

  if v_note.project_id is not null then
    select name into v_project_name from projects where id = v_note.project_id;
  end if;

  v_href := case
    when v_note.project_id is not null then '/board?note=' || v_note.id || '&project=' || v_note.project_id
    else '/board?note=' || v_note.id
  end;

  insert into notifications (profile_id, type, note_id, project_id, payload, href)
  values (
    new.profile_id, 'task_assigned', v_note.id, v_note.project_id,
    jsonb_build_object(
      'actorName', v_actor_name, 'projectName', v_project_name,
      'snippet', left(v_note.body, 140), 'noteKind', v_note.kind
    ),
    v_href
  );

  return new;
end;
$$;

create trigger note_assignees_notify_after_insert
  after insert on public.note_assignees
  for each row execute function public.fn_notify_on_note_assignee_insert();

-- create_note(): swap the single p_assignee_id for p_assignee_ids.
drop function if exists public.create_note(
  public.note_kind, text, text, text, public.note_visibility, bigint, date,
  boolean, date, boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, uuid
);

create or replace function public.create_note(
  p_kind public.note_kind,
  p_title text,
  p_body text,
  p_color text,
  p_visibility public.note_visibility,
  p_parent_id bigint,
  p_due_date date,
  p_requires_ack boolean,
  p_ack_deadline date,
  p_is_personal boolean,
  p_project_id bigint,
  p_activity_id bigint,
  p_situation_id bigint,
  p_client_id bigint,
  p_subcontractor_id bigint,
  p_supplier_id bigint,
  p_document_id bigint,
  p_team_id bigint,
  p_assignee_ids uuid[]
)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception 'forbidden';
  end if;

  if p_kind = 'announcement' and p_visibility = 'company' and not public.can_broadcast() then
    raise exception 'forbidden';
  end if;

  if coalesce(cardinality(p_assignee_ids), 0) > 0 and not p_is_personal then
    raise exception 'invalid';
  end if;

  insert into notes (
    author_id, kind, title, body, color, visibility, parent_id, due_date,
    requires_ack, ack_deadline, is_personal, project_id, activity_id,
    situation_id, client_id, subcontractor_id, supplier_id, document_id, team_id
  ) values (
    auth.uid(), p_kind, p_title, p_body, p_color, p_visibility, p_parent_id, p_due_date,
    p_requires_ack, p_ack_deadline, p_is_personal, p_project_id, p_activity_id,
    p_situation_id, p_client_id, p_subcontractor_id, p_supplier_id, p_document_id, p_team_id
  )
  returning id into v_id;

  insert into note_assignees (note_id, profile_id)
  select distinct v_id, a
  from unnest(coalesce(p_assignee_ids, '{}'::uuid[])) as a
  where a is not null;

  return v_id;
end;
$$;

grant execute on function public.create_note(
  public.note_kind, text, text, text, public.note_visibility, bigint, date,
  boolean, date, boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, uuid[]
) to authenticated;

alter table public.notes
  drop constraint if exists notes_assignee_requires_personal,
  drop column assignee_id;
