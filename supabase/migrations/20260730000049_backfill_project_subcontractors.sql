-- Carry over each currently-subcontracted project's existing subcontractor
-- link and per-engagement price/dates (still on subcontractors at this point)
-- into the new project_subcontractors assignment table, before those columns
-- are dropped from subcontractors in the next migration.
insert into public.project_subcontractors
  (project_id, subcontractor_id, price_eur, price_lei, start_date, deadline, is_current)
select
  p.id,
  p.subcontractor_id,
  s.price_eur,
  s.price_lei,
  s.start_date,
  s.deadline,
  true
from public.projects p
join public.subcontractors s on s.id = p.subcontractor_id
where p.execution_mode = 'subcontracted'
  and p.subcontractor_id is not null;
