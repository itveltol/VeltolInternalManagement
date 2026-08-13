-- Communication module (Phase 2) — audience resolution, ack receipt
-- materialization, ack_required notifications, email digest preference.

alter table public.profiles
  add column email_digest_enabled boolean not null default true;

-- Tracks the rate limit for "Trimite memento" (once per 24h per note).
alter table public.notes
  add column last_reminder_at timestamptz;

-- Resolves who *owes* an acknowledgement (or simply "is the audience") for a
-- given visibility scope, minus the author. Shared by note_audience() (an
-- already-published root note) and note_audience_preview() (the composer,
-- before the note exists) so the two can never drift apart.
--
-- profiles has no "deactivated" flag today, so `company` visibility resolves
-- to every profile row that exists at evaluation time. If such a flag is
-- added later, exclude it here.
create or replace function public.resolve_note_audience(
  p_author_id uuid, p_visibility public.note_visibility,
  p_project_id bigint, p_team_id bigint, p_root_note_id bigint
)
returns setof uuid language sql security definer stable set search_path = public as $$
  select p.id
  from profiles p
  where p_visibility = 'company'
    and p.id <> p_author_id

  union

  select tm.user_id
  from team_members tm
  where p_visibility = 'team' and p_team_id is not null
    and tm.team_id = p_team_id
    and tm.user_id <> p_author_id

  union

  select audience_id from (
    select pr.manager_id as audience_id
    from projects pr
    where p_visibility = 'project' and p_project_id is not null
      and pr.id = p_project_id
      and pr.manager_id is not null

    union

    select tm.user_id as audience_id
    from projects pr
    join team_members tm on tm.team_id = pr.team_id
    where p_visibility = 'project' and p_project_id is not null
      and pr.id = p_project_id
      and pr.team_id is not null
  ) project_audience
  where project_audience.audience_id <> p_author_id

  union

  select nm.profile_id
  from note_mentions nm
  where p_visibility = 'private' and p_root_note_id is not null
    and nm.note_id = p_root_note_id
    and nm.profile_id <> p_author_id
$$;

-- Audience of an already-published root note.
create or replace function public.note_audience(p_note_id bigint)
returns setof uuid language sql security definer stable set search_path = public as $$
  select public.resolve_note_audience(n.author_id, n.visibility, n.project_id, n.team_id, n.id)
  from notes n
  where n.id = p_note_id and n.parent_id is null
$$;

-- Live preview for the composer, before the note is created. Evaluated as
-- the calling user (not security definer over arbitrary author) — the
-- caller previews their own about-to-be-published announcement, always as
-- author_id = auth.uid(). Private-visibility preview is intentionally not
-- supported (no note/mentions exist yet to resolve against) and returns no rows.
create or replace function public.note_audience_preview(
  p_visibility public.note_visibility, p_project_id bigint, p_team_id bigint
)
returns setof uuid language sql security definer stable set search_path = public as $$
  select public.resolve_note_audience(auth.uid(), p_visibility, p_project_id, p_team_id, null)
$$;

-- Materializes the audience (and one ack_required notification each) at
-- publish time, for root notes that require acknowledgement.
--
-- This is a deliberate snapshot, not a live view: someone hired next month
-- does not owe an acknowledgement on last month's announcement, and "who
-- hasn't acknowledged" becomes a trivial `where acknowledged_at is null`
-- against these rows instead of a moving set-difference against a changing
-- audience. It also means note_audience() only needs to be evaluated once,
-- at insert time, rather than on every read.
create or replace function public.fn_materialize_ack_audience()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor_name text;
  v_project_name text;
  v_snippet text;
  v_href text;
  v_member uuid;
begin
  if new.parent_id is not null or new.requires_ack is not true then
    return new;
  end if;

  select trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    into v_actor_name
    from profiles where id = new.author_id;

  if new.project_id is not null then
    select name into v_project_name from projects where id = new.project_id;
  end if;

  v_snippet := left(new.body, 140);
  v_href := '/announcements/' || new.id;

  for v_member in select * from public.note_audience(new.id) loop
    insert into note_receipts (note_id, profile_id, seen_at, acknowledged_at)
    values (new.id, v_member, null, null)
    on conflict (note_id, profile_id) do nothing;

    insert into notifications (profile_id, type, note_id, project_id, payload, href)
    values (
      v_member, 'ack_required', new.id, new.project_id,
      jsonb_build_object(
        'actorName', v_actor_name, 'projectName', v_project_name,
        'snippet', v_snippet, 'noteKind', new.kind
      ),
      v_href
    );
  end loop;

  return new;
end;
$$;

create trigger notes_materialize_ack_audience_after_insert
  after insert on public.notes
  for each row execute function public.fn_materialize_ack_audience();

-- "Trimite memento" — re-notifies everyone still unconfirmed on a
-- requires_ack announcement. Rate-limited to once per 24h per note, enforced
-- here (not just in the UI) since this is reachable as a direct RPC call.
-- Only the note's author or an admin may trigger it — mirrors the "who can
-- see the ack table" rule.
create or replace function public.send_ack_reminder(p_note_id bigint)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_note record;
  v_actor_name text;
  v_project_name text;
  v_snippet text;
  v_href text;
  v_member uuid;
  v_count integer := 0;
begin
  select * into v_note from notes where id = p_note_id and parent_id is null;
  if v_note is null or v_note.requires_ack is not true then
    raise exception 'not_an_announcement';
  end if;

  if v_note.author_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if v_note.last_reminder_at is not null and v_note.last_reminder_at > now() - interval '24 hours' then
    raise exception 'rate_limited';
  end if;

  select trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    into v_actor_name
    from profiles where id = v_note.author_id;

  if v_note.project_id is not null then
    select name into v_project_name from projects where id = v_note.project_id;
  end if;

  v_snippet := left(v_note.body, 140);
  v_href := '/announcements/' || v_note.id;

  for v_member in
    select profile_id from note_receipts
    where note_id = p_note_id and acknowledged_at is null
  loop
    insert into notifications (profile_id, type, note_id, project_id, payload, href)
    values (
      v_member, 'ack_required', v_note.id, v_note.project_id,
      jsonb_build_object(
        'actorName', v_actor_name, 'projectName', v_project_name,
        'snippet', v_snippet, 'noteKind', v_note.kind
      ),
      v_href
    );
    v_count := v_count + 1;
  end loop;

  update notes set last_reminder_at = now() where id = p_note_id;

  return v_count;
end;
$$;
