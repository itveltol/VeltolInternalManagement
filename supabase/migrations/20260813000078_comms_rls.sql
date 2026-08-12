-- Communication module (Phase 1) — RLS helpers, policies, notification trigger.

create or replace function public.can_broadcast()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  )
$$;

-- Resolves anchor/visibility from the root note (coalesce(parent_id, id)) so a
-- reply is readable by exactly whoever can read its thread — one source of
-- truth, no denormalized columns to keep in sync.
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
              and (
                p.manager_id = auth.uid()
                or (
                  p.team_id is not null
                  and exists (
                    select 1 from team_members tm
                    where tm.team_id = p.team_id and tm.user_id = auth.uid()
                  )
                )
              )
          )
        )
        or public.is_admin()
      )
  )
$$;

alter table public.notes enable row level security;
alter table public.note_mentions enable row level security;
alter table public.note_receipts enable row level security;
alter table public.note_pins enable row level security;
alter table public.notifications enable row level security;

-- notes ---------------------------------------------------------------

create policy "notes: select readable"
  on public.notes for select
  to authenticated
  using (public.can_read_note(id));

create policy "notes: authenticated insert"
  on public.notes for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (kind <> 'announcement' or visibility <> 'company' or public.can_broadcast())
  );

-- Content edits: author or admin only.
create policy "notes: author or admin update"
  on public.notes for update
  to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- Status alone is opened up wider: anyone who can read the thread may close
-- it, or every question stays open forever when its author is on leave.
create policy "notes: readers can change status"
  on public.notes for update
  to authenticated
  using (public.can_read_note(id))
  with check (public.can_read_note(id));

create policy "notes: author delete within window or admin"
  on public.notes for delete
  to authenticated
  using (
    (author_id = auth.uid() and created_at > now() - interval '15 minutes')
    or public.is_admin()
  );

-- note_mentions ---------------------------------------------------------

create policy "note_mentions: select when note readable"
  on public.note_mentions for select
  to authenticated
  using (public.can_read_note(note_id));

-- No insert/update/delete policy — writes come only from fn_notify_on_note()
-- (security definer) or the service-role key.

-- note_receipts -----------------------------------------------------------

create policy "note_receipts: select own or authored-note or admin"
  on public.note_receipts for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from notes n
      where n.id = note_receipts.note_id and n.author_id = auth.uid()
    )
  );

create policy "note_receipts: insert own row"
  on public.note_receipts for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "note_receipts: update own row"
  on public.note_receipts for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- note_pins -----------------------------------------------------------------

create policy "note_pins: select when note readable"
  on public.note_pins for select
  to authenticated
  using (public.can_read_note(note_id));

create policy "note_pins: insert personal pin for self"
  on public.note_pins for insert
  to authenticated
  with check (profile_id = auth.uid() and pinned_by = auth.uid());

create policy "note_pins: insert context pin when mutator"
  on public.note_pins for insert
  to authenticated
  with check (profile_id is null and public.can_mutate_projects());

create policy "note_pins: delete own personal pin"
  on public.note_pins for delete
  to authenticated
  using (profile_id = auth.uid());

create policy "note_pins: delete context pin when mutator"
  on public.note_pins for delete
  to authenticated
  using (profile_id is null and public.can_mutate_projects());

-- notifications -------------------------------------------------------------

create policy "notifications: select own"
  on public.notifications for select
  to authenticated
  using (profile_id = auth.uid());

create policy "notifications: update own read_at"
  on public.notifications for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- No insert policy at all — writes come only from fn_notify_on_note() or the
-- service-role key.

-- Notification trigger -------------------------------------------------------
--
-- Split across two triggers because the two notification kinds are keyed off
-- different inserts within the same service-layer transaction: the reply
-- notification is knowable the instant the note row exists, but mentions are
-- inserted into note_mentions afterwards (they FK to notes.id) — so `mention`
-- notifications fire off that insert instead of trying to read
-- not-yet-written rows from an `after insert on notes` trigger.

create or replace function public.fn_notify_on_note_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor_name text;
  v_project_name text;
  v_snippet text;
  v_href text;
  v_root_author uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select author_id into v_root_author from notes where id = new.parent_id;
  if v_root_author is null or v_root_author = new.author_id then
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
    v_root_author, 'reply', new.id, new.project_id,
    jsonb_build_object(
      'actorName', v_actor_name, 'projectName', v_project_name,
      'snippet', v_snippet, 'noteKind', new.kind
    ),
    v_href
  );

  return new;
end;
$$;

create trigger notes_notify_reply_after_insert
  after insert on public.notes
  for each row execute function public.fn_notify_on_note_reply();

create or replace function public.fn_notify_on_mention()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_note record;
  v_root_author uuid;
  v_actor_name text;
  v_project_name text;
  v_snippet text;
  v_href text;
begin
  select * into v_note from notes where id = new.note_id;

  -- Never notify someone about their own mention, and never double-notify
  -- the root author when they're also mentioned on their own thread — the
  -- reply trigger (which runs first, on the notes insert) already notified
  -- them.
  if new.profile_id = v_note.author_id then
    return new;
  end if;
  if v_note.parent_id is not null then
    select author_id into v_root_author from notes where id = v_note.parent_id;
    if v_root_author = new.profile_id then
      return new;
    end if;
  end if;

  select trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    into v_actor_name
    from profiles where id = v_note.author_id;

  if v_note.project_id is not null then
    select name into v_project_name from projects where id = v_note.project_id;
  end if;

  v_snippet := left(v_note.body, 140);
  v_href := case
    when v_note.project_id is not null then '/board?note=' || v_note.id || '&project=' || v_note.project_id
    else '/board?note=' || v_note.id
  end;

  insert into notifications (profile_id, type, note_id, project_id, payload, href)
  values (
    new.profile_id, 'mention', v_note.id, v_note.project_id,
    jsonb_build_object(
      'actorName', v_actor_name, 'projectName', v_project_name,
      'snippet', v_snippet, 'noteKind', v_note.kind
    ),
    v_href
  );

  return new;
end;
$$;

create trigger note_mentions_notify_after_insert
  after insert on public.note_mentions
  for each row execute function public.fn_notify_on_mention();
