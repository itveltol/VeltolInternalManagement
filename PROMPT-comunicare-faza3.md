# VSCode prompt — Kommunikációs modul, Fázis 3

> Másold be az egészet a VSCode coding agentnek. **Előfeltétel: a Fázis 1 és 2 kész és mergelve van.**
> Az agent olvassa be a `PLAN-modul-comunicare.md`-t (§3.6, §6.3, §9) és a `PROMPT-comunicare-faza1.md`-t —
> **annak a „Conventions to follow" szakasza itt változatlanul érvényes**.
>
> Ez a fázis a vezetői kérés harmadik szavát („**informatii**") teljesíti be: nem csak amit *írtak*, hanem amit a
> rendszerben *tettek* is látszik, egy időrendben.

---

Implement **Phase 3 of the Communication module**: the system activity feed, the per-project timeline, and the four communication metrics.

## What Phases 1–2 already delivered (assume present, do not rebuild)

The `notes` family with RLS and search; `notifications` with all producers; announcements with acknowledgement and the unconfirmed list; the email digest and Teams webhook; `/board`, `/announcements`, the bell.

What is still missing: the app knows *that* a project's phase changed, but nobody finds out unless they open that project. This phase closes that.

## Context / decisions (already made — do not re-ask)

- Events are written by **Postgres triggers**, never by application code. A trigger cannot be bypassed by a new entry point, a script, or a future feature that forgets to log.
- Events store **`verb` keys + a `summary jsonb`**, never pre-rendered sentences. The feed row is localized at render time, exactly like `notifications` in Phase 1.
- **12-month retention** from day one, not "later".
- Metrics are for `admin` and `project_manager` only.

---

## 1. `activity_events` — and a deliberate asymmetry

```sql
create table public.activity_events (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  verb        text not null,
  project_id  bigint references public.projects(id) on delete cascade,
  entity_table text,           -- loose reference, intentionally NOT a FK
  entity_id    bigint,
  summary     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
```

**Why loose `entity_table` / `entity_id` here, when `notes` uses strict nullable FKs?** Because the two tables have opposite jobs. A note is *live content* that must never dangle — deleting a project must take its notes with it. An event is a *log line* about something that already happened; it must survive the deletion of the row it describes, or the history lies. Add this as a SQL comment, so the next reader does not "fix" the inconsistency.

`project_id` **is** a real FK with `on delete cascade`, because the feed is a working tool for live projects, not a compliance audit trail. If a real audit trail is ever needed, that is a separate append-only table with different rules — do not conflate them.

Indexes: `(created_at desc)`, `(project_id, created_at desc)`, `(actor_id, created_at desc)`, `(verb)`.

**RLS:** select for authenticated, but **scoped** — an event with a `project_id` is readable only by someone who could read that project (reuse the same involvement logic as `can_read_note`'s `project` branch: `manager_id`, project `team_id`, or admin). Events with no `project_id` are company-level and readable by all authenticated users. **No insert, update or delete policy at all** — writes come only from the security-definer triggers.

## 2. Triggers — five sources, stable verb keys

| Table | Verbs |
|---|---|
| `projects` | `project.phase_changed`, `project.status_changed`, `project.deadline_changed`, `project.value_changed`, `project.created` |
| `project_activity_status` | `matrice.status_changed` |
| `situations` | `situation.created`, `situation.finalized` |
| `documents` | `document.uploaded`, `document.expiry_set`, `document.expired` |
| `vacation_requests` | `vacation.submitted`, `vacation.approved`, `vacation.rejected` |

`summary` holds the render inputs and nothing else: `{ old, new, entityName, activityName, phaseNo }` as applicable. Verb strings are **stable API** — they become i18n keys (`comms.feed.verb.project_phase_changed`) and must not be renamed casually.

`actor_id` comes from `auth.uid()`. When a trigger fires from a cron or a service-role context there is no `auth.uid()` — store `null` and render it as "Sistem". Handle this explicitly; do not let it throw.

**Noise control — this determines whether the feed is used or muted:**

- Emit **only on a real change**: compare old/new and return early when equal. `project_activity_status` alone is ~95 rows per project; an update-with-no-change must produce nothing.
- Do not emit for bulk/backfill migrations. Guard with a session flag (`set local app.suppress_events = 'on'`) that the triggers respect, and use it in any data-migration script.
- The **UI** collapses consecutive events by the same actor on the same project within a 30-minute window into one grouped row ("Ana a actualizat 7 activități") that expands on click. Implement the grouping in a pure, unit-tested service function, not inline in the component.

## 3. Retention

Extend the existing `note-reminders` cron (or add `src/app/api/cron/comms-retention/route.ts`, daily): delete `activity_events` older than 12 months. Make the window a constant, not a literal buried in SQL. **Never** auto-delete from `notes` — human-written content is kept indefinitely; only the machine-generated log is pruned. Log how many rows were removed.

## 4. Project timeline

On the project detail **"Comunicare"** tab, above the existing threads: a merged chronological stream of `activity_events` **and** `notes` for that project. One visual language, two sources, clearly distinguishable (system events muted and iconographic; human notes full-weight and clickable into the thread).

- Filter chips: "Tot" / "Doar oameni" / "Doar sistem".
- **Server-side pagination** with `.range()` — do not fetch the whole history and slice client-side. The repo has a known habit of client-side pagination (AUDIT #22); do not add to it.

## 5. Global feed

A new tab or route (`/feed`, reachable under the COMUNICARE nav group). Same merged stream across all readable projects, with filters: project, actor, verb group, date range, human/system. Server-side paginated, keyboard navigable, usable at 375px.

## 6. The four metrics

Four SQL views, then one compact metrics strip visible to `admin` / `project_manager` (on `/board`, and mirrored as a dashboard card):

| View | Meaning | Target |
|---|---|---|
| `v_comms_ack_rate` | share of ack-requiring receipts acknowledged within 24 h of publication, last 30 days | **> 80%** — the headline number |
| `v_comms_stale_questions` | count of `kind in ('question','risk')` with `status = 'open'` and `created_at < now() - interval '7 days'` | trending down |
| `v_comms_silent_projects` | active projects with **zero** notes in the last 30 days | trending down — a silent project is a shadow channel, not peace |
| `v_comms_decisions` | count of `kind = 'decision'` per month | trending up |

Show each with its trend versus the previous period, and **label what it means**, not just the number. A bare percentage teaches nobody what to do.

**Two warnings, both from real defects in this repo:**

1. The dashboard currently reads through a **service-role client that bypasses RLS** (AUDIT MAGAS-3). Do **not** put these metrics on that path — a `viewer` must not learn the portfolio's communication state through a metrics card. Compute them under the caller's session, and gate the strip on `canBroadcast(role)` from `src/core/auth/permissions.ts`.
2. Do not invent deltas. If a previous-period figure cannot be computed yet, show "—", not a fabricated percentage. The dashboard already lost credibility once by displaying hardcoded deltas as real (AUDIT #3/#12); do not repeat it here.

## Acceptance criteria

- `npx tsc --noEmit` clean; `npx eslint src` no new errors; `npm test` passes, including unit tests for the 30-minute event grouping and for each metric's calculation against a fixture.
- An update that changes nothing produces **zero** events (verified for `projects` and `project_activity_status`).
- A migration run with `app.suppress_events = 'on'` produces zero events.
- A cron-context trigger produces an event with `actor_id = null` and renders as "Sistem" without throwing.
- Deleting a project removes its events; deleting a *document* leaves its event rows intact (the loose-reference guarantee).
- **RLS:** a PM sees feed events only for projects they are involved in; a `viewer` sees no project-scoped events they should not; nobody can insert into `activity_events`.
- Feed and timeline paginate **server-side** — verify the network payload does not grow with total history.
- The metrics strip is invisible to `viewer` / `site_engineer` / `outfield_worker`, and computes correctly against seeded fixture data.
- Retention deletes only `activity_events`, never `notes`, and logs the count.
- Feed and timeline usable at 375px with no horizontal page scroll; all verb strings present in ro/hu/en with full key parity.

## Explicitly OUT of scope (do NOT build now)

- Supabase Realtime, OneDrive attachments, PWA push, WhatsApp — **Phase 4**.
- A general audit trail / change-history feature (different requirements, different table).
- Adding events for tables not listed in §2 (finance, teams, clients) — deliberately deferred until the feed proves useful.
- Table partitioning. Retention plus the indexes above is sufficient at this data volume; revisit only if measurement says otherwise.

---

Work in small commits, stopping and reporting after each:

1. Migration: `activity_events` + indexes + RLS + the `suppress_events` guard.
2. Triggers for `projects` and `project_activity_status`, with change-detection and no-op suppression.
3. Triggers for `situations`, `documents`, `vacation_requests`.
4. Pure services: event grouping + feed merge, with unit tests. i18n verb keys in all three locales.
5. Project timeline on the Comunicare tab, server-side paginated.
6. Global `/feed` with filters.
7. The four metric views + the gated metrics strip + dashboard card.
8. Retention cron.

Stop after step 8 and summarize. Do not start Phase 4.
