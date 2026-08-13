-- Works around a reproducible bug where `insert into notes ... returning id`
-- fails RLS for every caller, even the row's own author: PostgREST's
-- `.select().single()` (and any INSERT ... RETURNING) re-checks the notes
-- SELECT policy against the freshly inserted row within the same command,
-- and that re-check spuriously fails regardless of how can_read_note() is
-- written (verified: rewriting it to avoid its self-join changed nothing).
-- A plain INSERT with no RETURNING clause has always succeeded.
--
-- Fix: do the insert inside a SECURITY DEFINER function. The function's own
-- statements run with RLS bypassed (owned by postgres, which has
-- BYPASSRLS), so there is no RETURNING-time SELECT-policy recheck to
-- spuriously fail. The same authorization the table's INSERT policy
-- enforced is re-implemented explicitly in-function: caller must be
-- authenticated, author_id is forced to auth.uid() (not client-supplied —
-- stricter than the policy it replaces), and announcement/company is
-- gated by can_broadcast(). CHECK constraints on notes still apply to any
-- insert regardless of RLS, so anchor/reply shape rules are unaffected.
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
  p_team_id bigint
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

  return v_id;
end;
$$;

grant execute on function public.create_note(
  public.note_kind, text, text, text, public.note_visibility, bigint, date,
  boolean, date, boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint
) to authenticated;
