-- Refocus comms around tasks: drop the unused "risk" kind, rename the base
-- "note" kind to "task", and let a private (is_personal) task be assigned
-- directly to a person with no project — a manager can hand someone a task
-- with just a description, no project reference required.

-- 1. Fold existing risk rows into the base kind before the rename so no data
-- is lost (risk had no dedicated behavior of its own — it was just a kind).
update public.notes set kind = 'note' where kind = 'risk';

-- 2. Postgres can't drop/rename an enum value in place — recreate the type,
-- same precedent as 20260727000036_drop_project_phase_proposal.sql.
-- create_note() references the old type in its signature, so it must be
-- dropped before the type rename, and recreated afterwards (below). The
-- "authenticated insert" policy's with-check also depends on the kind
-- column, so it has to be dropped and recreated around the type swap too.
drop function if exists public.create_note(
  public.note_kind, text, text, text, public.note_visibility, bigint, date,
  boolean, date, boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint
);

drop policy if exists "notes: authenticated insert" on public.notes;

alter table public.notes alter column kind drop default;

alter type public.note_kind rename to note_kind_old;

create type public.note_kind as enum ('task', 'announcement', 'question', 'decision');

alter table public.notes
  alter column kind type public.note_kind
  using (case when kind::text = 'note' then 'task' else kind::text end)::public.note_kind;

alter table public.notes alter column kind set default 'task';

drop type public.note_kind_old;

create policy "notes: authenticated insert"
  on public.notes for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (kind <> 'announcement' or visibility <> 'company' or public.can_broadcast())
  );

-- 3. A task can be assigned directly to a person, mirroring author_id's FK
-- shape. Scoped to personal tasks only (see constraint below) — an
-- assignee is how a private, project-less task gets handed to someone;
-- project/team-scoped items keep using mentions.
alter table public.notes
  add column assignee_id uuid references public.profiles (id) on delete set null;

alter table public.notes
  add constraint notes_assignee_requires_personal
  check (assignee_id is null or is_personal);

-- 4. can_read_note() had no branch for private notes at all — a private
-- note was readable only by its author, an explicit mention, or company-wide
-- visibility. Without this, an assignee could never see a task assigned to
-- them.
create or replace function public.can_read_note(p_note_id bigint)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from notes root
    join notes n on n.id = p_note_id
    where root.id = coalesce(n.parent_id, n.id)
      and (
        root.author_id = auth.uid()
        or root.assignee_id = auth.uid()
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

-- 5. create_note() RPC: recreate with the new kind type and the new
-- assignee param (dropped above, before the type rename).
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
  p_assignee_id uuid
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
    situation_id, client_id, subcontractor_id, supplier_id, document_id, team_id,
    assignee_id
  ) values (
    auth.uid(), p_kind, p_title, p_body, p_color, p_visibility, p_parent_id, p_due_date,
    p_requires_ack, p_ack_deadline, p_is_personal, p_project_id, p_activity_id,
    p_situation_id, p_client_id, p_subcontractor_id, p_supplier_id, p_document_id, p_team_id,
    p_assignee_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_note(
  public.note_kind, text, text, text, public.note_visibility, bigint, date,
  boolean, date, boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, uuid
) to authenticated;
