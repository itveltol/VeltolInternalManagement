-- Replaces the assignable project<->team link with a plain headcount: how
-- many people a project needs. This value now caps the per-checklist-row
-- and execution-data "persons" fields, taking over from the assigned team's
-- member count.
--
-- projects.team_id backed a "project team member" branch in several RLS
-- policies/RPCs from the comms module (can_read_note, resolve_note_audience,
-- get_mention_candidates, insert_note_mentions) and in
-- "activity_events: scoped select" — all of them granted access to whoever
-- was a member of the project's assigned team, alongside the project's own
-- manager. Since a project no longer has an assigned team, that branch is
-- simply removed from each; access for these now derives from being the
-- project's manager or an admin only. Redefine everything that depends on
-- the column before dropping it.

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
              and p.manager_id = auth.uid()
          )
        )
        or public.is_admin()
      )
  )
$$;

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
  ) project_audience
  where project_audience.audience_id <> p_author_id

  union

  select nm.profile_id
  from note_mentions nm
  where p_visibility = 'private' and p_root_note_id is not null
    and nm.note_id = p_root_note_id
    and nm.profile_id <> p_author_id
$$;

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

  select visibility, project_id, team_id
    into v_note
    from notes where id = coalesce(v_target.parent_id, p_note_id);

  insert into note_mentions (note_id, profile_id)
  select p_note_id, pid
  from unnest(p_profile_ids) as pid
  where
    v_note.visibility in ('company', 'private')
    or (
      v_note.visibility = 'project' and v_note.project_id is not null and (
        exists (select 1 from projects pr where pr.id = v_note.project_id and pr.manager_id = pid)
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

drop policy "activity_events: scoped select" on public.activity_events;

create policy "activity_events: scoped select"
  on public.activity_events for select
  to authenticated
  using (
    project_id is null
    or public.is_admin()
    or exists (
      select 1 from projects p
      where p.id = activity_events.project_id
        and p.manager_id = auth.uid()
    )
  );

alter table public.projects
  drop column team_id;

alter table public.projects
  add column people_needed integer;
