# VSCode prompt — Kommunikációs modul, Fázis 0 + 1

> Másold be az egészet a VSCode coding agentnek (Copilot / Claude Code). Önálló, de a repóban lévő
> `PLAN-modul-comunicare.md`-re hivatkozik — az agent olvassa be azt is. A `DIAGRAM-modul-comunicare.html`
> ugyanennek a vizuális összefoglalója, nem kötelező olvasmány.
>
> **Két eltérés a PLAN-tól, szándékosan** (a PLAN §10 ennyiben pontosítva): a `notifications` tábla **Fázis 1-ben**
> jön létre (csak mention/reply eseményekkel), hogy a harangot ne kelljen kétszer megírni; és az értesítés
> **nem tárol lefordított szöveget** — `type` + `payload jsonb`-ből renderel a UI next-intl-lel.

---

Implement **Phase 0 + Phase 1 of the Communication module** for this project management app. The full design lives in `PLAN-modul-comunicare.md` in the repo root — read it first: §1 (diagnosis), §3 (data model), §5 (RLS), §6 (screens), §10 (phasing). This task is **Phase 0 + Phase 1 only**.

## Context / decisions (already made — do not re-ask)

- The module is **contextual notes + a personal aggregation surface**, not a standalone sticky-note wall. Every root note is either anchored to a business entity **or** explicitly marked personal — enforced by a DB `check`, not by UI discipline. This is the single most important requirement in the whole task.
- **The bell is the only inbox.** No email, no Teams, no WhatsApp in this phase.
- **Announcements + read-acknowledgement are Phase 2.** Create the `requires_ack` / `ack_deadline` columns and the `acknowledged_at` column now (schema-forward), but build **no** announcement UI and **no** ack flow yet.
- WhatsApp stays the team's informal channel. Nothing in this phase talks to it. (The official Groups API cannot post to their existing groups — see PLAN §8. Do not attempt it.)
- Romanian is the primary content language; UI strings go through i18n in all three locales.
- Follow existing codebase conventions exactly (see below). Strict `tsc`, RLS-first Supabase, feature-slice architecture.

## Verify before you start

Confirm these against the repo rather than trusting this prompt:

1. The **next free migration number** (latest at time of writing: `20260812000075_reorder_documentare_receptie.sql`, so the next is `20260813000076`).
2. These SQL helpers already exist and should be **reused, not redefined**: `public.set_updated_at()`, `public.is_admin()`, `public.can_mutate_projects()`.
3. `public.app_role` enum values: `admin`, `project_manager`, `site_engineer`, `finance`, `viewer`, `outfield_worker`.
4. `src/shared/utils/parseFormData.ts` (zod form parsing) and `src/core/supabase/session.ts` (`requireAuth`, `requireMutator`) exist.
5. `projects.team_id` and `projects.manager_id` exist — the project-visibility rule depends on both.

---

# Phase 0 — prerequisites (~half a day, do these first)

1. **`profiles.locale`** — add `locale text not null default 'ro'` with `check (locale in ('ro','hu','en'))`. Not used for in-app rendering (that goes through next-intl), but Phase 2's server-rendered email digest needs it and it is trivial to add now.
2. **`src/core/auth/permissions.ts`** — new file. TS-side role predicates: `isAdmin(role)`, `canMutateProjects(role)`, `canBroadcast(role)` (= admin | project_manager). Use it in all new code in this task. **Do not** refactor the ~19 existing inline role checks in this task — that is a separate cleanup.
3. **`src/shared/components/layout/topbar.tsx`** — the Bell button currently has **no `onClick`** and a hardcoded always-visible dot (`bg-[var(--v-warning)]`). Remove the fake dot. The button becomes the trigger for the real notification dropdown built in step 5 below.

# Phase 1 — scope

## 1. Migration: schema, RLS, notification trigger

One migration file (or a small numbered set) under `supabase/migrations/`. Every table: `enable row level security`, a `set_updated_at` trigger where it has `updated_at`, and explicit policies.

### Enums

```sql
create type public.note_kind as enum ('note','announcement','question','decision','risk');
create type public.note_visibility as enum ('private','team','project','company');
create type public.note_status as enum ('open','resolved','archived');
create type public.notification_type as enum (
  'mention','reply','ack_required','due_soon',
  'aviz_expiring','maintenance_due','vacation_request','system'
);
```

Create the full `notification_type` set now even though Phase 1 only emits `mention` and `reply` — adding enum values later is a migration each time.

### `notes`

Columns: `id bigint generated always as identity pk`, `kind note_kind not null default 'note'`, `title text`, `body text not null`, `color text` (nullable; **only** design-token names — `accent` | `green` | `orange` | `red` | `primary` — validate with a `check`, no free hex), `author_id uuid references profiles(id) on delete set null`, `visibility note_visibility not null default 'project'`, `status note_status not null default 'open'`, `parent_id bigint references notes(id) on delete cascade`, `due_date date`, `requires_ack boolean not null default false`, `ack_deadline date`, `is_personal boolean not null default false`, timestamps.

Anchor columns, all nullable FKs: `project_id` → projects (`on delete cascade`), `activity_id` → activities (`on delete cascade`), `situation_id`, `client_id`, `subcontractor_id`, `supplier_id`, `document_id`, `team_id` (each `on delete cascade`).

**The three constraints that make this module work — get these exactly right:**

```sql
-- (a) activity_id only qualifies a project anchor, never stands alone
constraint notes_activity_needs_project
  check (activity_id is null or project_id is not null),

-- (b) a REPLY carries no anchor of its own — it inherits the root's
constraint notes_reply_has_no_anchor
  check (parent_id is null or (
    is_personal = false and project_id is null and activity_id is null
    and situation_id is null and client_id is null and subcontractor_id is null
    and supplier_id is null and document_id is null and team_id is null
  )),

-- (c) a ROOT note has EXACTLY ONE anchor, or is explicitly personal — never neither
constraint notes_root_is_addressed
  check (parent_id is not null or (
    ( case when project_id      is not null then 1 else 0 end
    + case when situation_id    is not null then 1 else 0 end
    + case when client_id       is not null then 1 else 0 end
    + case when subcontractor_id is not null then 1 else 0 end
    + case when supplier_id     is not null then 1 else 0 end
    + case when document_id     is not null then 1 else 0 end
    + case when team_id         is not null then 1 else 0 end
    ) = case when is_personal then 0 else 1 end
  ))
```

Constraint (c) is deliberately stricter than "all-null means personal": a forgotten anchor must **fail loudly**, not silently become a private note. `is_personal` has to be set on purpose.

Indexes: `(project_id, created_at desc)`, `(activity_id)`, `(parent_id)`, `(author_id)`, `(status)` and a `gin` index on `to_tsvector('simple', coalesce(title,'') || ' ' || body)` for the search integration.

**Trigger — replies inherit the root's visibility:** `before insert on notes`, if `parent_id is not null`, copy `visibility` (and `project_id`/`team_id` into local variables used by the read policy, or simply resolve them in the policy via the parent — pick one and document it). Simplest correct approach: copy `visibility`, `project_id` and `team_id` from the root into the reply row **for policy evaluation purposes only**, and treat them as read-only derived values excluded from constraint (b). If that collides with (b), instead have `can_read_note` walk to the root via `coalesce(parent_id, id)`. **Choose the walk-to-root version if in doubt** — it keeps one source of truth.

### `note_mentions`

`id`, `note_id` → notes `on delete cascade`, `profile_id` → profiles `on delete cascade`, `created_at`. `unique (note_id, profile_id)`.

### `note_receipts`

`note_id` + `profile_id` composite PK, `seen_at timestamptz`, `acknowledged_at timestamptz`, `created_at`. Both FKs `on delete cascade`.

### `note_pins`

`id`, `note_id` → notes `on delete cascade`, `profile_id` → profiles `on delete cascade` **nullable**, `pinned_by` → profiles `on delete set null`, `created_at`.

`profile_id` set = personal pin (shows on my board). `profile_id` null = context pin (shows on the project header for everyone). Enforce uniqueness across both shapes with a **partial unique index pair**, since `unique(note_id, profile_id)` does not constrain NULLs:

```sql
create unique index note_pins_personal_uniq on note_pins (note_id, profile_id) where profile_id is not null;
create unique index note_pins_context_uniq  on note_pins (note_id)             where profile_id is null;
```

### `notifications`

`id`, `profile_id` → profiles `on delete cascade`, `type notification_type not null`, `note_id` → notes `on delete cascade` nullable, `project_id` → projects `on delete cascade` nullable, `payload jsonb not null default '{}'`, `href text`, `read_at timestamptz`, `created_at`.

**No stored `title`/`body`.** The UI renders from `type` + `payload` with next-intl, so a notification is correct in whatever language the reader has selected — including retroactively, if they switch. `payload` holds the render inputs only: `{actorName, projectName, snippet, noteKind}`.

Index: `(profile_id, read_at, created_at desc)`.

### RLS

**Read helper — pass the row's columns in, do not re-select the row** (avoids both a second lookup per row and any recursion risk):

```sql
create or replace function public.can_read_note(
  p_note_id bigint, p_author uuid, p_visibility public.note_visibility,
  p_project_id bigint, p_team_id bigint
) returns boolean language sql security definer stable set search_path = public as $$
  ...
$$;
```

True when **any** of:

1. `p_author = auth.uid()` — my own note, always.
2. a `note_mentions` row exists for `(p_note_id, auth.uid())` — being mentioned grants access **even to a `private` note**.
3. `p_visibility = 'company'` and the caller is authenticated.
4. `p_visibility = 'team'` and `p_team_id` = the caller's `profiles.team_id`.
5. `p_visibility = 'project'` and the caller is involved in `p_project_id`: the project's `manager_id = auth.uid()`, **or** the project's `team_id` = the caller's `profiles.team_id`.
6. `public.is_admin()`.

For replies, resolve the anchor/visibility from the root (`coalesce(parent_id, id)`) as decided above.

**Also add `public.can_broadcast()`** = `role in ('admin','project_manager')`, mirroring the existing `can_mutate_projects()` style. It is used by one policy in this phase (company-wide `announcement` insert) and by the whole Phase 2 announcement flow.

Policies — follow the existing naming style (`"notes: authenticated select"`, `to authenticated`):

- `notes` **select**: `can_read_note(...)` on the row's columns. **Never `using (true)`** — the two past critical RLS bugs in this repo both came from a policy being more permissive than intended.
- `notes` **insert**: authenticated, `with check (author_id = auth.uid() and (kind <> 'announcement' or visibility <> 'company' or public.can_broadcast()))`. `author_id` is stamped server-side, never taken from the client.
- `notes` **update**: `author_id = auth.uid()` for content fields, **or** `is_admin()`. Additionally: **anyone who can read the thread may set `status`** — otherwise every question stays open forever when its author is on leave. Implement as a second, narrower update policy or a dedicated `resolve_note(id)` server action gated in SQL; document which.
- `notes` **delete**: `author_id = auth.uid() and created_at > now() - interval '15 minutes'`, or `is_admin()`. After the window it is `archived`, not deleted.
- `note_mentions` select: readable when the parent note is readable. Insert: **trigger/service only** — no user-facing insert policy.
- `note_receipts`: insert/update **only own row** (`profile_id = auth.uid()`). Select: own rows, **plus** all rows of notes I authored, plus admin — this is what makes the Phase 2 "who acknowledged" list possible.
- `note_pins`: insert/delete personal pins for self only; context pins (`profile_id is null`) gated on `can_mutate_projects()`. Select: when the note is readable.
- `notifications`: select/update (`read_at` only) `profile_id = auth.uid()`. **No insert policy at all** — writes come exclusively from the trigger below or the service-role key.

### Notification trigger

`fn_notify_on_note()`, `after insert on notes`, `security definer`:

- one `notifications` row per `note_mentions` entry → `type = 'mention'`
- if `parent_id is not null` → one row for the root note's `author_id` → `type = 'reply'`, **skipped when it is the same person** (never notify someone about their own reply, and never double-notify someone already mentioned)
- populate `payload` with actor display name, project name (when anchored to a project), and a body snippet (~140 chars)
- populate `href` pointing at the correct deep link

## 2. Feature slice

```
src/features/comms/
  api/types.ts                 CommsApiClient interface
  api/supabaseCommsClient.ts   factory (supabase) => client
  services/mentions.ts         pure: parse @handles from body → profile ids
  services/notes.ts            pure: thread assembly, grouping, unread counts
  types.ts
  components/NoteThread.tsx    ← ONE component, six mount points
  components/NoteCard.tsx
  components/NoteComposer.tsx
  components/ForMeBand.tsx
  components/BoardGrid.tsx
  components/NotificationBell.tsx
```

Server actions go in the **route segment** (`src/app/[locale]/(app)/board/actions.ts`), matching how `clients`, `projects`, `situations` do it today. Critically: **nothing under `src/features/` may import from `src/app/`** — that reverse dependency already exists in 52 files and must not grow.

`services/mentions.ts` and `services/notes.ts` must be **pure and unit-tested** with vitest (`npm test`) — mention parsing (including edge cases: `@` in an email address, duplicate mentions, unknown handle, mention of self) and thread assembly.

## 3. Surfaces

1. **`/board` — "Panoul meu"** (`src/app/[locale]/(app)/board/page.tsx` + `loading.tsx`):
   - **"Pentru mine" band at the top**: unread mentions · notes with `due_date` today or tomorrow · open questions addressed to me. When the band is empty it says so, plainly — an empty band is the goal state, not an error state.
   - **Card grid** below: personal pins first, then recent readable notes. Each card shows its **anchor** as a label (`PROIECT · <name>` / `MATRICE · <activity>` / `PERSONAL`), the `kind` badge, author, reply count.
   - Filters: `kind`, project, author, unread-only, open-only.
   - **Composer**: the anchor selector is the **first** field and cannot be left unset — "Personal" is an explicit choice, not the fallback.
2. **Project detail → new "Comunicare" tab**: context pins at the top, then the thread list with `kind` filtering. Follow how the existing project tabs are built.
3. **Matrice cell → "Discuție"**: keep the existing single-line `project_activity_status.note` exactly as it is. Add a thread opener that mounts `<NoteThread>` with `{ projectId, activityId }`. While in `MatriceCell.tsx`, fix the paperclip touch target from ~16px to ≥32px.
4. **Bell dropdown** in `topbar.tsx`: unread count badge, grouped by Today / This week / Older, type icon per row, deep link on click, "mark all read". **Poll every 60 s** with a client-side Supabase query (RLS applies). No Realtime in this phase. Pause polling when the tab is hidden (`document.visibilityState`).
5. **Global search**: register notes in `src/features/search/` so the existing Ctrl+K dialog returns them, using the `gin` index. Show the anchor in each result row. **Do not skip this** — unsearchability is the specific WhatsApp failure this module exists to fix.
6. **Nav**: new group in `NavContent.tsx`:
   ```
   COMUNICARE
     · Panoul meu   /board   (MessageSquare or StickyNote from lucide-react)
   ```
   Do **not** add an Anunțuri item yet (Phase 2).

## Conventions to follow (match existing code)

- **Migrations:** `supabase/migrations/YYYYMMDDNNNNNN_name.sql`, next sequential number. `enable row level security` on every table, `set_updated_at` trigger, explicit policies, policy names in the existing `"table: description"` style.
- **Architecture:** feature-slice as above; `api/types.ts` interface + `api/supabaseCommsClient.ts` factory + pure `services/*` + `components/*`, mirroring `src/features/matrice/` and `src/features/situations/`.
- **Validation:** `zod` + the existing `parseFormData(schema, formData)` helper in **every** mutating server action.
- **Auth:** `requireAuth()` / `requireMutator()` from `src/core/supabase/session.ts`; role predicates from the new `src/core/auth/permissions.ts`. No inline `role in (...)` in new TS code.
- **Feedback:** `sonner` toasts on every action result, success and error, matching `MatriceShell` / `ProjectsTable`. The `Toaster` is already mounted in `AppShellClient.tsx`.
- **Loading:** a `loading.tsx` skeleton for the new `/board` segment, matching the existing per-route skeletons.
- **i18n:** new `comms` namespace in `messages/ro.json`, `hu.json`, `en.json` with **perfect key parity** — the repo currently has zero drift; do not introduce any. Romanian is authoritative; translate hu/en.
- **Formatting:** no new hardcoded `"hu-HU"` / `"ro-RO"` locale strings. Use locale-aware formatting driven by the active locale.
- **Types:** no generated Supabase types in this repo — hand-write feature types in `types.ts` matching the migration. Avoid `as unknown as` where a real type works.
- **Design:** dark **and** light theme both exist (`ThemeSwitcher` is in the topbar), so `DESIGN-SYSTEM.md`'s "dark mode only" line is stale. Verify card colors and status colors in **both** themes. Use existing tokens only — introduce no new colors.
- **Mobile:** `/board` is **mobile-first** — single-column card list at 375px, touch targets ≥44px, full-screen composer on phones. Put **no** information in a `title=` attribute; it never appears on touch. The outfield worker is the person this module most needs to hear from.
- **Accessibility:** real `<button>` elements, visible `focus-visible` rings, `aria-label` on every icon-only control, keyboard-operable cards.

## Acceptance criteria

- `npx tsc --noEmit` clean.
- `npx eslint src` introduces no new errors.
- `npm test` passes, including new unit tests for `services/mentions.ts` and `services/notes.ts`.
- Migration applies cleanly on the current schema.
- **Constraint proof:** inserting a root note with no anchor and `is_personal = false` **fails**; a root note with two anchors **fails**; a reply carrying its own anchor **fails**.
- **RLS proof** (test with real users of each role, not just by reading the SQL):
  - a `viewer` cannot read another user's `private` note;
  - a user **mentioned** in a `private` note **can** read it;
  - a PM sees `project`-visibility notes for their own projects and **not** for others';
  - no authenticated user can `insert` into `notifications` directly;
  - a user cannot write another user's `note_receipts` row.
- A `@mention` produces exactly one `notifications` row for the mentioned user and **zero** for the author.
- The bell shows a correct unread count, marks read, and deep-links to the anchored entity.
- Ctrl+K returns notes with their anchor shown.
- `/board` is usable at 375px width with no horizontal page scroll.
- i18n key parity intact across ro/hu/en.

## Explicitly OUT of scope (do NOT build now)

- Announcements page, the acknowledgement flow, the "who acknowledged / who didn't" list, reminder sending. **Phase 2** — the columns exist, the UI does not.
- `activity_events` / the system activity feed / project timeline. **Phase 3.**
- Supabase Realtime (polling only), OneDrive attachments, PWA push. **Phase 4.**
- Email digest, Teams webhook, WhatsApp — any outbound channel at all. **Phase 2–4.**
- Rewiring `/api/cron/aviz-reminders` and `/api/cron/maintenance-reminders` into `notifications`. **Phase 2** (the schema already supports it — leave the crons alone).
- Refactoring the existing ~19 inline role checks, the 52 `features → app` imports, or migrating `project_activity_status.note` into `notes`. Separate cleanups.

---

Work in small commits, and **stop and report after each one**:

1. Phase 0: `profiles.locale`, `core/auth/permissions.ts`, topbar bell de-decoyed.
2. Migration: enums + tables + constraints + indexes.
3. Migration: `can_read_note()`, `can_broadcast()`, all policies, `fn_notify_on_note()` — with the RLS proofs from the acceptance criteria run and pasted into the commit message.
4. Feature slice: api client, pure services + their unit tests.
5. `<NoteThread>` + composer, mounted on the project "Comunicare" tab and the matrice cell.
6. `/board` (Pentru mine + card grid + filters), bell dropdown, search integration, nav group, i18n.

Stop after step 6 and summarize. Do not start Phase 2.
