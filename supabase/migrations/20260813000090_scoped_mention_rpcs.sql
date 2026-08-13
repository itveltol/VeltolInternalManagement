-- @mentions were effectively non-functional for any non-admin, for two
-- stacked reasons:
--
-- 1. getMentionCandidates() queried `profiles` through the plain
--    session-scoped client. `profiles` RLS only allows a user to read their
--    own row (or every row, if admin) — so a non-admin resolving @handles
--    could only ever match themselves. Verified empirically against the
--    live DB.
-- 2. note_mentions has RLS enabled with a SELECT-only policy (no INSERT
--    policy for `authenticated` exists, despite a comment claiming writes
--    come from a `fn_notify_on_note()` function that does not exist
--    anywhere in these migrations). insertMentions() inserted via the
--    plain session-scoped client and threw a 42501 permission error on
--    every call, silently swallowed by the calling server action's
--    try/catch into a generic error toast — after the note itself had
--    already committed via the separate create_note() RPC.
--
-- Fix: two security definer RPCs, modeled on create_note() (see
-- 20260813000087_create_note_via_rpc.sql) — bypass RLS internally and
-- re-implement authorization explicitly rather than widening table-level
-- policies. Per product decision, mentioning someone must never grant them
-- new access — it should only ever be possible to mention someone who
-- already has access to the note's scope (its project's manager/team, or
-- its team, or anyone for company/private notes). This mirrors
-- can_read_note()'s own project/team branches exactly.

create or replace function public.get_mention_candidates(
  p_visibility public.note_visibility,
  p_project_id bigint,
  p_team_id bigint
)
returns table (id uuid, first_name text, last_name text, email text)
language sql security definer stable set search_path = public as $$
  select p.id, p.first_name, p.last_name, p.email
  from profiles p
  where
    p_visibility in ('company', 'private') or p_visibility is null
    or (
      p_visibility = 'project' and p_project_id is not null and (
        exists (select 1 from projects pr where pr.id = p_project_id and pr.manager_id = p.id)
        or exists (
          select 1 from projects pr
          join team_members tm on tm.team_id = pr.team_id
          where pr.id = p_project_id and tm.user_id = p.id
        )
        or p.role = 'admin'
      )
    )
    or (
      p_visibility = 'team' and p_team_id is not null and (
        exists (select 1 from team_members tm where tm.team_id = p_team_id and tm.user_id = p.id)
        or p.role = 'admin'
      )
    );
$$;

grant execute on function public.get_mention_candidates(public.note_visibility, bigint, bigint) to authenticated;

create or replace function public.insert_note_mentions(
  p_note_id bigint,
  p_profile_ids uuid[]
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_target record;
  v_note record;
begin
  if auth.uid() is null then
    raise exception 'forbidden';
  end if;

  select author_id, parent_id into v_target from notes where id = p_note_id;
  if v_target is null or v_target.author_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  -- A reply's own row carries no anchor at all (notes_reply_has_no_anchor
  -- forces project_id/team_id/is_personal to null on any reply) — its real
  -- scope is the root note's, exactly like can_read_note() resolves it via
  -- coalesce(parent_id, id).
  select visibility, project_id, team_id
    into v_note
    from notes where id = coalesce(v_target.parent_id, p_note_id);

  -- Re-run the exact same scope check as get_mention_candidates, keyed off
  -- the note's own already-set visibility/anchor, so a caller can't bypass
  -- the UI and mention someone outside the note's actual audience —
  -- can_read_note() grants mentioned users unconditional read access, so
  -- this is what stops mentions from being used as an access-escalation
  -- path. Any id outside scope is silently dropped rather than erroring.
  insert into note_mentions (note_id, profile_id)
  select p_note_id, pid
  from unnest(p_profile_ids) as pid
  where
    v_note.visibility in ('company', 'private')
    or (
      v_note.visibility = 'project' and v_note.project_id is not null and (
        exists (select 1 from projects pr where pr.id = v_note.project_id and pr.manager_id = pid)
        or exists (
          select 1 from projects pr
          join team_members tm on tm.team_id = pr.team_id
          where pr.id = v_note.project_id and tm.user_id = pid
        )
        or exists (select 1 from profiles p where p.id = pid and p.role = 'admin')
      )
    )
    or (
      v_note.visibility = 'team' and v_note.team_id is not null and (
        exists (select 1 from team_members tm where tm.team_id = v_note.team_id and tm.user_id = pid)
        or exists (select 1 from profiles p where p.id = pid and p.role = 'admin')
      )
    )
  on conflict (note_id, profile_id) do nothing;
end;
$$;

grant execute on function public.insert_note_mentions(bigint, uuid[]) to authenticated;
