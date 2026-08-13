-- Communication module (Phase 1) — schema, constraints, indexes.
-- RLS policies and the notification trigger are added in the next migration.

create type public.note_kind as enum ('note', 'announcement', 'question', 'decision', 'risk');
create type public.note_visibility as enum ('private', 'team', 'project', 'company');
create type public.note_status as enum ('open', 'resolved', 'archived');
create type public.notification_type as enum (
  'mention', 'reply', 'ack_required', 'due_soon',
  'aviz_expiring', 'maintenance_due', 'vacation_request', 'system'
);

create table public.notes (
  id            bigint generated always as identity primary key,
  kind          public.note_kind not null default 'note',
  title         text,
  body          text not null,
  color         text check (color in ('accent', 'green', 'orange', 'red', 'primary')),
  author_id     uuid references public.profiles (id) on delete set null,
  visibility    public.note_visibility not null default 'project',
  status        public.note_status not null default 'open',
  parent_id     bigint references public.notes (id) on delete cascade,
  due_date      date,
  requires_ack  boolean not null default false,
  ack_deadline  date,
  is_personal   boolean not null default false,

  -- Anchors — a root note has exactly one, or is explicitly personal.
  project_id       bigint references public.projects (id) on delete cascade,
  activity_id      bigint references public.activities (id) on delete cascade,
  situation_id     bigint references public.situations (id) on delete cascade,
  client_id        bigint references public.clients (id) on delete cascade,
  subcontractor_id bigint references public.subcontractors (id) on delete cascade,
  supplier_id      bigint references public.suppliers (id) on delete cascade,
  document_id      bigint references public.documents (id) on delete cascade,
  team_id          bigint references public.teams (id) on delete cascade,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint notes_activity_needs_project
    check (activity_id is null or project_id is not null),

  constraint notes_reply_has_no_anchor
    check (parent_id is null or (
      is_personal = false and project_id is null and activity_id is null
      and situation_id is null and client_id is null and subcontractor_id is null
      and supplier_id is null and document_id is null and team_id is null
    )),

  constraint notes_root_is_addressed
    check (parent_id is not null or (
      ( case when project_id       is not null then 1 else 0 end
      + case when situation_id     is not null then 1 else 0 end
      + case when client_id        is not null then 1 else 0 end
      + case when subcontractor_id is not null then 1 else 0 end
      + case when supplier_id      is not null then 1 else 0 end
      + case when document_id      is not null then 1 else 0 end
      + case when team_id          is not null then 1 else 0 end
      ) = case when is_personal then 0 else 1 end
    ))
);

create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create index notes_project_created_idx on public.notes (project_id, created_at desc);
create index notes_activity_idx on public.notes (activity_id);
create index notes_parent_idx on public.notes (parent_id);
create index notes_author_idx on public.notes (author_id);
create index notes_status_idx on public.notes (status);
create index notes_search_idx on public.notes
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || body));

create table public.note_mentions (
  id         bigint generated always as identity primary key,
  note_id    bigint not null references public.notes (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (note_id, profile_id)
);

create table public.note_receipts (
  note_id          bigint not null references public.notes (id) on delete cascade,
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  seen_at          timestamptz,
  acknowledged_at  timestamptz,
  created_at       timestamptz not null default now(),
  primary key (note_id, profile_id)
);

create table public.note_pins (
  id         bigint generated always as identity primary key,
  note_id    bigint not null references public.notes (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  pinned_by  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- profile_id set = personal pin (my board); profile_id null = context pin (project header, everyone).
-- unique(note_id, profile_id) doesn't constrain NULLs, so enforce both shapes with partial indexes.
create unique index note_pins_personal_uniq on public.note_pins (note_id, profile_id) where profile_id is not null;
create unique index note_pins_context_uniq on public.note_pins (note_id) where profile_id is null;

create table public.notifications (
  id         bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type       public.notification_type not null,
  note_id    bigint references public.notes (id) on delete cascade,
  project_id bigint references public.projects (id) on delete cascade,
  payload    jsonb not null default '{}',
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_unread_idx on public.notifications (profile_id, read_at, created_at desc);
