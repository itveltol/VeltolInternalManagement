# VSCode prompt — Kommunikációs modul, Fázis 4

> Másold be az egészet a VSCode coding agentnek. **Előfeltétel: a Fázis 1–3 kész és mergelve van.**
> Az agent olvassa be a `PLAN-modul-comunicare.md`-t (§3.7, §8) és a `PROMPT-comunicare-faza1.md`-t —
> **annak a „Conventions to follow" szakasza itt változatlanul érvényes**.
>
> **Ez a fázis négy egymástól független darab.** Bármelyik kihagyható vagy elhalasztható anélkül, hogy a
> többi sérülne — a 4. (WhatsApp) kifejezetten **üzleti döntéstől függ**, nem technikai készültségtől.
> Ne kezdj bele a 4-esbe, amíg nincs Official Business Account.

---

Implement **Phase 4 of the Communication module**: Realtime delivery, OneDrive attachments, PWA push, and (conditionally) WhatsApp outbound.

## What Phases 1–3 already delivered (assume present, do not rebuild)

The full `notes` family; `notifications` with every producer; announcements + acknowledgement; email digest + Teams webhook; `activity_events` with triggers, the feed, the timeline, and the four metrics. The bell currently **polls every 60 s**.

---

# Part 1 — Realtime (replaces polling)

**Use Broadcast from the Database, not `postgres_changes`.** Supabase's current guidance is explicit: Broadcast is the recommended method for scalability and security, while `postgres_changes` is simpler but does not scale as well. Verify against `https://supabase.com/docs/guides/realtime/subscribing-to-database-changes` before writing code — this API has moved before.

Implementation:

1. A trigger on `notifications` (insert) calling **`realtime.broadcast_changes()`**, emitting onto a **per-user private topic** (e.g. `user:<profile_id>`). Per-user topics mean a user's socket never receives another user's rows in the first place — security by construction rather than by client-side filtering.
2. An RLS policy on **`realtime.messages`** so a user may only receive their own topic.
3. Client: **private channel** + `supabase.realtime.setAuth()` before subscribing. Refresh auth on token rotation, or the socket silently stops receiving after the JWT expires.
4. **One shared channel for the whole app**, created once in a provider — not one per component. Unsubscribe on unmount and on sign-out.
5. **Keep polling as a fallback**, at a longer interval (e.g. 5 min), active only while the socket is disconnected. Networks on construction sites drop; the bell must degrade, not die. Also refetch on reconnect and on tab re-focus to close the gap where events were missed while offline.

Optionally extend the same mechanism to an open `<NoteThread>` so replies appear live. Scope it to the currently-open thread only — do not subscribe to all notes.

**Acceptance:** a mention appears in the recipient's bell within ~2 s without a reload; a user's socket **never** receives another user's notification (verify with two sessions); killing the socket falls back to polling and recovers on reconnect; signing out tears the channel down; no duplicate notifications after a reconnect.

---

# Part 2 — OneDrive attachments

**Prerequisite, do this first:** the existing `linkProjectFolder` is broken and there is no `FolderProvider` interface or Graph token cache (AUDIT #32). Fix that before building on it — `src/core/microsoft/folderProvider.ts` and `graph.ts`.

```sql
create table public.note_attachments (
  id bigint generated always as identity primary key,
  note_id bigint not null references public.notes(id) on delete cascade,
  file_name text not null,
  drive_item_id text not null,
  web_url text not null,
  size_bytes bigint,
  mime_type text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
```

- **No new Supabase Storage bucket.** Files live in the project's existing OneDrive/SharePoint folder; the row is a *reference*, not a copy. Two copies of a document means two versions of the truth, which is the same class of problem this module exists to solve.
- **Attachments only on project-anchored notes** in this phase. A personal note has no project folder, and inventing a parallel storage location for it is not worth the complexity. Disable the control with a clear explanation rather than failing at upload time.
- RLS: an attachment is readable exactly when its note is readable (reuse `can_read_note` via the parent note). Insert: the note's author or someone who can mutate projects. Delete: uploader or admin.
- Enforce a **file-size limit** and a MIME allowlist server-side. Note that `/api/ai/*` already lacked a size limit once (AUDIT MAGAS-1) — do not repeat the pattern.
- Upload must be resilient: a Graph failure leaves **no** orphan `note_attachments` row, and a successful Graph upload followed by a failed insert is reported clearly rather than silently lost.

**Acceptance:** upload → the file appears in the project's OneDrive folder and as a link on the note; a user who cannot read the note cannot read its attachments; oversized and disallowed types are rejected server-side; Graph being unavailable produces a clear toast and no partial rows; attachments are unavailable (and explained) on personal notes.

---

# Part 3 — PWA push

**Read the platform constraints before designing the UX — they are unusually strict:**

- On **iOS the web app must be added to the home screen**; push does not work in a normal Safari tab. Since the outfield workers are the main beneficiaries, the rollout needs a short "Add to Home Screen" instruction, in Romanian, with screenshots. Without that step the feature silently does nothing for them, which is worse than not shipping it.
- The permission prompt **must be triggered by a user gesture** (a button or checkbox). A prompt on page load is rejected and ignored — and burns the user's one good impression.

Implementation:

1. `public/manifest.json` + icons; a service worker handling `push` and `notificationclick` (deep-link into the app).
2. VAPID keys in env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) documented in `.env.example`; unset = feature cleanly disabled.
3. `push_subscriptions` table: `id, profile_id FK cascade, endpoint text unique, p256dh, auth, user_agent, created_at, last_success_at, failure_count`. **Prune on 410/404** from the push service — dead endpoints otherwise accumulate forever and slow every send.
4. An explicit **opt-in screen** in `/settings`: a button (gesture!), current status, per-device list, and a per-user toggle. Add `profiles.push_enabled`.
5. **Only high-value types push**: `ack_required`, `mention`, `aviz_expiring`. Nothing else. A phone that buzzes for every note gets its notifications switched off within a week, and then the channel is gone permanently.
6. Send from the same place as the other outbound channels (after commit, try/catch, never blocking the user action). Localized via `profiles.locale`.

**Acceptance:** a `mention` reaches an installed PWA on Android and on an iOS home-screen install; permission is never requested without a gesture; a revoked subscription is pruned automatically after a 410; disabling the toggle stops pushes immediately; a push failure never fails the originating action; low-value notification types produce no push.

---

# Part 4 — WhatsApp outbound (CONDITIONAL — confirm before starting)

**Do not start this part without an Official Business Account.** Ask first and stop if the answer is no or unknown.

The constraint that shapes everything (PLAN §8): the Meta **Groups API cannot join or post to the company's existing WhatsApp groups**. It only serves groups the app itself creates, capped at **8 participants**, and requires an OBA. Therefore this part is **1:1 template messages to individual numbers**, not group posting. Do not attempt group integration.

Also required before any code can send: **pre-approved message templates** (needed outside the 24-hour window), explicit **opt-in per person**, and **per-message pricing** — every message has a real cost, so the trigger list must stay tiny.

Implementation:

1. **A provider-agnostic adapter**: `src/features/comms/services/outbound/whatsapp/` with a small interface (`sendTemplate(to, templateName, params)`) and one implementation. Meta Cloud API direct or Twilio — decide based on which account exists; the interface means that decision is reversible.
2. **Opt-in is data, not a checkbox in someone's memory**: `profiles.whatsapp_optin_at timestamptz` and a verified `phone`. No opt-in, no send — enforced in the service, not the UI.
3. **Exactly three triggers**, and no more without a new decision: `ack_required` on a company announcement, `aviz_expiring`, and a `due_soon` that is already overdue.
4. Log every send with cost-relevant metadata (`template`, `to`, `provider_message_id`, `status`, `created_at`) in a `whatsapp_sends` table, so the monthly bill is explainable.
5. Fail-soft like every other outbound channel; a WhatsApp outage must never affect the app.

**Acceptance:** a template message reaches an opted-in number; a person without `whatsapp_optin_at` is **never** contacted; the send log records enough to reconcile the invoice; the three triggers are the only call sites; disabling the env config makes the whole path a clean no-op.

---

## Cross-cutting acceptance criteria

- `npx tsc --noEmit` clean; `npx eslint src` no new errors; `npm test` passes with unit tests for the notification→channel routing rules (which type goes to which channel) and the push payload builder.
- **Every outbound channel is fail-soft and called after commit.** No channel may roll back or fail a user action, and none may be called from a Postgres trigger.
- Env vars unset ⇒ each feature is a clean no-op with no user-visible error, matching the existing Resend/Graph conventions.
- One place decides routing (type → channels). Do not scatter `if (type === ...)` across four services.
- i18n key parity across ro/hu/en for every new string.

## Explicitly OUT of scope

- Inbound anything: replying to a note from an email, a Teams message, or WhatsApp. Round-trip inbound is a separate project with its own identity-matching problems.
- Per-type, per-channel user preference matrices. The toggles are per channel (`email_digest_enabled`, `push_enabled`), not per channel × per type.
- Table partitioning, a second storage backend, and an SMS channel.

---

Work in small commits, stopping and reporting after each. **The four parts are independent — ship them in this order and stop at any boundary:**

1. Realtime: broadcast trigger + `realtime.messages` policy + shared client channel + polling fallback.
2. `FolderProvider` fix + Graph token cache (the prerequisite).
3. `note_attachments` + upload/list/delete on project-anchored notes.
4. PWA shell: manifest, service worker, `push_subscriptions`, opt-in UI.
5. Push sending + routing rules + pruning.
6. WhatsApp adapter + opt-in + the three triggers + send log — **only after confirming an OBA exists**.

Stop after each part and summarize. If Part 4 is not authorized, stop cleanly after step 5 — Phases 1–3 plus parts 1–3 are a complete, coherent system on their own.

## Sources for the two platform constraints

- [Subscribing to Database Changes — Supabase Docs](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) (Broadcast recommended over Postgres Changes)
- [Realtime Authorization — Supabase Docs](https://supabase.com/docs/guides/realtime/authorization)
- [iOS requirements for web push — Pushpad](https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications) (home-screen install + user gesture)
- [WhatsApp Groups API — Meta for Developers](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups) (8-participant cap, OBA, own groups only)
