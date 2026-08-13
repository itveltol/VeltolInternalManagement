-- Communication module (Phase 3) — activity_events: the system side of the
-- "informatii" feed. Populated only by triggers (added in later migrations
-- of this phase), never by application code, so no entry point can bypass it.

create table public.activity_events (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  verb         text not null,
  project_id   bigint references public.projects (id) on delete cascade,
  -- Loose reference, intentionally NOT a FK. notes.project_id is a strict FK
  -- because a note is live content that must never dangle (deleting a
  -- project must take its notes with it). An event is a log line about
  -- something that already happened — it must survive the deletion of the
  -- row it describes (e.g. a deleted document), or the history lies. Do not
  -- "fix" this into a FK; that would delete history whenever the row it
  -- describes is removed.
  entity_table text,
  entity_id    bigint,
  summary      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index activity_events_created_at_idx on public.activity_events (created_at desc);
create index activity_events_project_created_idx on public.activity_events (project_id, created_at desc);
create index activity_events_actor_created_idx on public.activity_events (actor_id, created_at desc);
create index activity_events_verb_idx on public.activity_events (verb);

alter table public.activity_events enable row level security;

-- Select only — scoped the same way as can_read_note's project branch: an
-- event with a project_id is readable by whoever is involved in that
-- project (manager, team member, or admin); a company-level event
-- (project_id is null) is readable by anyone authenticated.
create policy "activity_events: scoped select"
  on public.activity_events for select
  to authenticated
  using (
    project_id is null
    or public.is_admin()
    or exists (
      select 1 from projects p
      where p.id = activity_events.project_id
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
  );

-- No insert, update or delete policy at all — writes come only from the
-- security-definer triggers added in later migrations of this phase.

-- Session-local flag the event triggers check before writing. Data
-- migrations / backfills must wrap their statements with:
--   set local app.suppress_events = 'on';
-- so a bulk update doesn't flood the feed. Defaults to 'off' when unset.
create or replace function public.events_suppressed()
returns boolean language sql stable as $$
  select coalesce(current_setting('app.suppress_events', true), 'off') = 'on'
$$;
