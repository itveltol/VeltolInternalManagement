-- Replace activities.phase_no/phase_name (denormalized text duplicated per
-- row) with a phase_id FK into the new matrice_phases table. Since
-- matrice_phases was backfilled with id = old phase_no (previous migration),
-- the FK backfill is a direct 1:1 copy.
alter table public.activities
  add column phase_id bigint references public.matrice_phases(id);

update public.activities set phase_id = phase_no;

alter table public.activities
  alter column phase_id set not null;

alter table public.activities
  drop column phase_no,
  drop column phase_name;

-- Generalized "this activity's cell needs an expiry date" flag, decoupled
-- from is_aviz (which additionally opts an activity into permit-renewal
-- reminders via avizReminderService). is_aviz activities always require an
-- expiry date, so backfill true wherever is_aviz is already true, and keep
-- that implication enforced going forward via a check constraint.
alter table public.activities
  add column expires_required boolean not null default false;

update public.activities set expires_required = true where is_aviz = true;

alter table public.activities
  add constraint activities_aviz_implies_expiry
  check (not is_aviz or expires_required);
