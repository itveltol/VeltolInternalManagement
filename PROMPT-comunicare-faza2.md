# VSCode prompt — Kommunikációs modul, Fázis 2

> Másold be az egészet a VSCode coding agentnek. **Előfeltétel: a Fázis 1 kész és mergelve van.**
> Az agent olvassa be a `PLAN-modul-comunicare.md`-t (§3.5, §5, §6.4, §8, §10) és a
> `PROMPT-comunicare-faza1.md`-t — **annak a „Conventions to follow" szakasza itt változatlanul érvényes**,
> nem ismételjük meg.
>
> **Ez a fázis oldja meg a vezetői problémát.** A Fázis 1 rendezettséget adott; itt lesz *mérhető*, ki tud miről.

---

Implement **Phase 2 of the Communication module**: announcements with read-acknowledgement, the remaining system notification producers, and the first two outbound channels.

## What Phase 1 already delivered (assume present, do not rebuild)

`notes` / `note_mentions` / `note_receipts` / `note_pins` / `notifications` tables with RLS; `can_read_note()`, `can_broadcast()`; `fn_notify_on_note()` emitting `mention` + `reply`; `/board` with the "Pentru mine" band; `<NoteThread>` on the project tab and the matrice cell; the bell dropdown with 60 s polling; notes in global search; `profiles.locale`; `src/core/auth/permissions.ts`.

The `requires_ack`, `ack_deadline` and `note_receipts.acknowledged_at` columns **already exist and are unused**. This phase gives them behaviour.

## Context / decisions (already made — do not re-ask)

- Only `admin` and `project_manager` may publish a company-wide announcement (`can_broadcast()`). If everyone can, the announcement loses its weight and people learn to ignore it within three weeks.
- `kind = 'announcement'` defaults to `requires_ack = true`. Every other kind defaults to false.
- Outbound channels in this phase: **email digest (Resend)** and **Microsoft Teams webhook**. **No WhatsApp** — the official Groups API cannot post to the company's existing groups (PLAN §8). Do not attempt it.
- Still **no Realtime** — polling stays. Realtime is Phase 4.

---

## 1. Audience resolution — the missing piece

"Who hasn't acknowledged" is unanswerable without knowing who *should*. Add:

```sql
create or replace function public.note_audience(p_note_id bigint)
returns setof uuid language sql security definer stable set search_path = public as $$ ... $$;
```

Resolution by the note's `visibility`:

- `company` → every profile **except** the author. Exclude deactivated users if the schema has such a flag; if it does not, use all profiles and note it.
- `team` → members of `team_id`, minus the author.
- `project` → the project's `manager_id` + members of the project's `team_id`, minus the author.
- `private` → only the mentioned users (`note_mentions`), minus the author.

**Materialize the audience at publish time.** In `fn_notify_on_note()` (extend it), when `requires_ack = true` and `parent_id is null`, insert a `note_receipts` row (`seen_at` null, `acknowledged_at` null) for every `note_audience()` member, plus one `notifications` row of `type = 'ack_required'`.

Snapshotting matters: someone hired next month does not owe an acknowledgement on last month's announcement, and "who hasn't" becomes a trivial `where acknowledged_at is null` instead of a live set-difference against a moving audience. Document this choice in a SQL comment.

## 2. Announcements UI

**`/announcements`** (`src/app/[locale]/(app)/announcements/page.tsx` + `loading.tsx` + `actions.ts`):

- **List**: newest first, showing `kind` badge, author, publish date, `ack_deadline`, and — for the author/admin — an at-a-glance ack ratio (`12/18`). For a normal reader, an unmistakable "needs your confirmation" state on rows they owe.
- **Detail**: the body, then either
  - **the acknowledge button** ("Am citit și am înțeles") if I owe one and haven't given it — a single, deliberate click; **not** triggered by scrolling or viewing;
  - or **the acknowledgement table** if I am the author or an admin: two lists, *confirmat* (with timestamp) and *neconfirmat* (names), the unconfirmed list visually dominant. Sort unconfirmed first — the missing names are the point of the screen.
- **"Trimite memento"** button on the unconfirmed list: emits a fresh `ack_required` notification (and email/Teams per §5) to everyone still missing. Rate-limit to once per 24 h per note; show when the last reminder went out.
- **Composer**: gated on `can_broadcast()`. Fields: title, body, `visibility`, `ack_deadline`, and a **live audience preview** ("Va fi trimis către 18 persoane") computed from `note_audience()` before publishing. Nobody should discover the blast radius after the fact.

`acknowledge(noteId)` server action: `update note_receipts set acknowledged_at = now() where note_id = $1 and profile_id = auth.uid() and acknowledged_at is null`. **Idempotent** — a second click must not move the timestamp. Also set `seen_at` if still null.

Add the nav item now:

```
COMUNICARE
  · Panoul meu   /board
  · Anunțuri     /announcements   (Megaphone from lucide-react)
```

Show an unread/unacknowledged count badge on the nav item.

## 3. Remaining notification producers

1. **`due_soon`** — new cron route `src/app/api/cron/note-reminders/route.ts`: notes with `due_date` = today or tomorrow and `status = 'open'` → one `due_soon` notification to the author and every mentioned user. Idempotent: never emit twice for the same `(note_id, profile_id, due_date)` — enforce with a partial unique index or a `sent_for` marker.
2. **`ack_required` reminder** — same cron: `requires_ack` notes past `ack_deadline` with unconfirmed receipts → re-notify the stragglers **and** the author (the author needs to know it is stalling).
3. **Rewire the two existing crons** — `src/app/api/cron/aviz-reminders/route.ts` and `.../maintenance-reminders/route.ts`: keep the existing email, and **additionally** insert `notifications` rows (`aviz_expiring`, `maintenance_due`) for the project's manager plus admins. This is what makes the bell the single inbox.

**While you are in those cron files, fix two known defects** (AUDIT MAGAS-5 and #26):

- They **fail open** when `CRON_SECRET` is unset — make them **fail closed** (refuse to run, return 500, log loudly). An unauthenticated cron endpoint on a production deployment is not acceptable.
- The emails are hardcoded English and can report `sent` when nothing was sent. Localize per recipient `profiles.locale` (see §4) and only report success on an actual provider success.

## 4. Email digest

**`src/app/api/cron/comms-digest/route.ts`**, daily (add to `vercel.json` alongside the existing cron entries).

- Per user: unread notifications since the last digest, grouped by type; unacknowledged announcements past or nearing deadline first; notes due today.
- **Skip users with nothing to report.** An empty digest is the fastest way to train people to filter your emails.
- **Localized** via `getTranslations({ locale })` from `next-intl/server` using each recipient's `profiles.locale` — do not hardcode strings in the route.
- Add `profiles.email_digest_enabled boolean not null default true`. Surface the toggle on the existing `/settings` page. (That route exists but has never been reachable — while you are there, add it to the nav, AUDIT #5/#16.)
- Resend is already configured; when `RESEND_API_KEY` is unset the route must be a clean no-op, matching the existing maintenance-reminder behaviour.
- Every email links back into the app; no action is possible from the email itself.

## 5. Teams outbound

- `TEAMS_WEBHOOK_URL` in `.env.example` (+ the two other env files' documentation). Unset = feature disabled, silently and cleanly.
- `src/features/comms/services/outbound/teams.ts` — posts an Adaptive Card: title, author, project, snippet, deep link. Pure formatting + a thin fetch; unit-test the payload builder.
- **Only two triggers**: a published `announcement`, and `aviz_expiring`. Nothing else. A channel that receives every note becomes a channel nobody reads.
- **Architecture rule — this one matters:** outbound HTTP is called from the **server action or the cron route, after the transaction commits** — never from a Postgres trigger (Postgres cannot make HTTP calls without extensions, and a failing webhook must never roll back a saved note). Wrap in try/catch, log failures, **never** surface a webhook error as a failed user action.
- The Teams **app-only Graph channel-post permission is narrow**; the webhook (or a Power Automate flow) is the practical route. Verify against the tenant before assuming Graph works, and do not spend time on Graph if the webhook succeeds.

## Acceptance criteria

- `npx tsc --noEmit` clean; `npx eslint src` no new errors; `npm test` passes with new unit tests for `note_audience` shapes, the digest grouping logic, and the Teams payload builder.
- **Audience correctness**, tested per visibility: `company` excludes the author; `team` covers exactly that team; `project` = manager + project team; `private` = mentioned only.
- Publishing an ack-requiring announcement to 18 people creates **18** `note_receipts` rows and **18** `ack_required` notifications, and **zero** for the author.
- A user hired **after** publication owes no acknowledgement.
- `acknowledge()` is idempotent — a second call does not change `acknowledged_at`.
- A `viewer` **cannot** publish a company announcement (blocked in RLS, not just hidden in the UI).
- A non-author, non-admin **cannot** read other people's `note_receipts` rows for a note they did not write.
- Both cron routes **refuse to run** when `CRON_SECRET` is unset.
- The digest is correctly localized for a `ro`, a `hu` and an `en` user, skips users with nothing, and skips users who disabled it.
- A failing/unreachable Teams webhook does **not** fail the underlying user action, and does not roll back the note.
- Reminder sending is rate-limited to once per 24 h per note.
- i18n key parity intact across ro/hu/en.

## Explicitly OUT of scope (do NOT build now)

- `activity_events`, the activity feed, the project timeline, the communication metrics — **Phase 3**.
- Supabase Realtime, OneDrive attachments, PWA push, WhatsApp — **Phase 4**.
- Any per-user notification granularity beyond the single `email_digest_enabled` toggle.
- Refactoring the existing inline role checks or the `features → app` imports.

---

Work in small commits, stopping and reporting after each:

1. `note_audience()` + extended `fn_notify_on_note()` + receipt materialization + migration (`profiles.email_digest_enabled`).
2. `/announcements` list + detail + acknowledge action + nav item + i18n.
3. Acknowledgement table, unconfirmed list, rate-limited reminder sending.
4. `note-reminders` cron (`due_soon` + ack chasing) with idempotency.
5. Rewiring the two existing crons into `notifications` + the fail-closed and localization fixes.
6. Email digest cron + `/settings` toggle + `/settings` in the nav.
7. Teams outbound service, wired to announcements and `aviz_expiring` only.

Stop after step 7 and summarize. Do not start Phase 3.
