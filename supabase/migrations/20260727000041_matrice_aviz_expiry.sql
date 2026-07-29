-- Avize (permits/notices) are periodic documents: once obtained ("finalizat"
-- in the Matrice grid) they are only valid for a period and must be renewed.
-- This adds an is_aviz flag on the activity catalog (so the UI/reminders know
-- which rows need an expiry date) and an expires_at date on the per-project
-- status row (parallel to the existing `note` column).
alter table public.activities
  add column if not exists is_aviz boolean not null default false;

alter table public.project_activity_status
  add column if not exists expires_at date;

-- Backfill: only the phase-4 environmental/utility permits are periodic
-- renewals. Excludes 'Aviz Tehnic de Racordare - ATR' (phase 1), 'Avizare PT'
-- (phase 2) and 'Avizare Racord' (phase 3) — those are one-time design/
-- connection approval milestones, not renewable permits.
update public.activities
set is_aviz = true
where phase_no = 4
  and name in (
    'Aviz MEDIU',
    'Avize amplasament operatori rețele (DEER)',
    'Aviz Tehnic Racordare DEER',
    'Aviz Transgaz',
    'Aviz Sănătatea Populației',
    'Aviz Romgaz',
    'Avizul Statului Major General'
  );
