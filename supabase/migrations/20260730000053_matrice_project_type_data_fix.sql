-- Fix the 9 seeded activities.applies_to rows (the 'BESS' line item in phase
-- 8, plus all of phase 10 "Montaj BESS") to use the real project_type values
-- the app writes, instead of the stale Romanian-phrase placeholders. All 9
-- rows carry the identical 3-value array today, so a blanket update is safe.
update public.activities
set applies_to = array['CEF+BESS','BESS','BESS_CEF']::project_type[]
where applies_to is not null;

-- One-time backfill: the auto-N/A trigger only fires on insert/update of
-- projects.project_type, so existing projects won't be corrected until
-- someone re-saves them. Apply the same logic now for every existing
-- project. This intentionally overwrites any manually-set status on cells
-- that are now correctly recognized as not applicable to the project's type
-- — the trigger has never matched correctly before, so this is the one-time
-- correction, not a regression.
insert into public.project_activity_status (project_id, activity_id, status)
select p.id, a.id, 'na'
from public.projects p
join public.activities a on a.applies_to is not null
  and not (p.project_type = any(a.applies_to::text[]))
where p.project_type is not null
on conflict (project_id, activity_id) do update set status = 'na', updated_at = now();
