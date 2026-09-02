-- ============================================================================
-- SEED: Aviz reminder sample data (dashboard "Aviz Reminders" card)
-- Populates project_activity_status rows with status='finalizat' + expires_at
-- for the 6 is_aviz activities, spread across real projects.
-- Mix: overdue, due-soon (<60 days, matches AVIZ_LOOKAHEAD_DAYS), and not-due-yet
-- so the dashboard shows a realistic spread. Run against STAGING only.
-- ============================================================================

begin;

insert into public.project_activity_status (project_id, activity_id, status, expires_at) values
  -- Overdue (already expired)
  (1, 12, 'finalizat', '2026-07-15'),
  (2, 15, 'finalizat', '2026-08-01'),
  (3, 20, 'finalizat', '2026-08-20'),
  (4, 21, 'finalizat', '2026-06-30'),
  (5, 22, 'finalizat', '2026-08-10'),

  -- Due soon (within 60-day lookahead from 2026-08-31)
  (6, 12, 'finalizat', '2026-09-05'),
  (7, 15, 'finalizat', '2026-09-15'),
  (8, 20, 'finalizat', '2026-09-30'),
  (9, 21, 'finalizat', '2026-10-10'),
  (10, 22, 'finalizat', '2026-10-20'),
  (11, 23, 'finalizat', '2026-10-25'),
  (12, 12, 'finalizat', '2026-10-28'),

  -- Not due yet (beyond 60-day lookahead)
  (13, 15, 'finalizat', '2027-01-15'),
  (14, 20, 'finalizat', '2027-02-01'),
  (16, 21, 'finalizat', '2027-03-10'),
  (17, 22, 'finalizat', '2027-04-01'),
  (18, 23, 'finalizat', '2027-05-15'),
  (19, 12, 'finalizat', '2027-06-01')
on conflict (project_id, activity_id) do update
  set status = excluded.status,
      expires_at = excluded.expires_at;

commit;

-- Sanity check
select p.name as project_name, a.name as activity_name, pas.expires_at
from public.project_activity_status pas
join public.projects p on p.id = pas.project_id
join public.activities a on a.id = pas.activity_id
where a.is_aviz = true and pas.status = 'finalizat' and pas.expires_at is not null
order by pas.expires_at;
