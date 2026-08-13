-- Idempotency tracking for the note-reminders cron (due_soon + stalled
-- ack_required chasing). One row per (note, profile, kind, due_date) marks
-- that a reminder was already emitted, so a cron re-run (or a retry after a
-- partial failure) never double-notifies for the same occurrence.
--
-- due_date is part of the key (not just note_id) so a due_soon reminder that
-- already fired for "today" fires again if the note's due_date is later
-- pushed out and becomes due again.

create table public.note_reminders_sent (
  id         bigint generated always as identity primary key,
  note_id    bigint not null references public.notes (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('due_soon', 'ack_stalled')),
  due_date   date,
  created_at timestamptz not null default now(),
  unique (note_id, profile_id, kind, due_date)
);

alter table public.note_reminders_sent enable row level security;

-- Written only by the cron route via the service-role key — no user-facing
-- policy at all (service-role bypasses RLS regardless, but this documents intent).
create policy "note_reminders_sent: admin select"
  on public.note_reminders_sent for select
  to authenticated
  using (public.is_admin());
