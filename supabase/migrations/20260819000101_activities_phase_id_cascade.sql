-- activities.phase_id had no ON DELETE behavior (defaults to RESTRICT), but
-- the admin catalog UI's delete-phase confirmation explicitly warns "this
-- phase has N activities — they will be deleted too" (PhaseEditor.tsx) and
-- deletePhase() just issues a plain delete expecting that to happen. Without
-- cascade, deleting a non-empty phase fails with a raw FK violation instead.
alter table public.activities
  drop constraint activities_phase_id_fkey,
  add constraint activities_phase_id_fkey
    foreign key (phase_id) references public.matrice_phases(id) on delete cascade;
