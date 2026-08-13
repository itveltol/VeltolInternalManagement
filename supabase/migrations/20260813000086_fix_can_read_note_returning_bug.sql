-- Fixes: creating any note failed with "new row violates row-level security
-- policy for table notes" even though the INSERT's own WITH CHECK passed.
--
-- Root cause: can_read_note() self-joined `notes` against `notes` to resolve
-- the root row (`join notes n on n.id = p_note_id`). PostgREST's
-- `.select().single()` (and any INSERT ... RETURNING) re-checks the SELECT
-- policy ("notes: select readable", which calls can_read_note()) against the
-- freshly inserted row as part of the same command. The self-join plan for
-- can_read_note() failed to see that just-inserted row as visible during
-- that re-check, so the function returned false for the row's own author —
-- an RLS/MVCC snapshot quirk of joining the RLS-protected table against
-- itself inside the function backing that same table's own SELECT policy.
--
-- Fix: resolve the root row with a single direct lookup (by id) instead of
-- a self-join. Root and reply share the same table, so "the root" is just
-- `coalesce(n.parent_id, n.id)` — look that id up once, no join needed.
create or replace function public.can_read_note(p_note_id bigint)
returns boolean language plpgsql security definer stable set search_path = public as $$
declare
  v_note record;
  v_root record;
begin
  select id, parent_id into v_note from notes where id = p_note_id;
  if v_note is null then
    return false;
  end if;

  select author_id, visibility, team_id, project_id
    into v_root
    from notes
    where id = coalesce(v_note.parent_id, v_note.id);
  if v_root is null then
    return false;
  end if;

  return
    v_root.author_id = auth.uid()
    or exists (
      select 1 from note_mentions nm
      where nm.note_id = p_note_id and nm.profile_id = auth.uid()
    )
    or (v_root.visibility = 'company' and auth.uid() is not null)
    or (
      v_root.visibility = 'team' and v_root.team_id is not null
      and exists (
        select 1 from team_members tm
        where tm.team_id = v_root.team_id and tm.user_id = auth.uid()
      )
    )
    or (
      v_root.visibility = 'project' and v_root.project_id is not null
      and exists (
        select 1 from projects p
        where p.id = v_root.project_id
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
    or public.is_admin();
end;
$$;
