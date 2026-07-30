-- Price and schedule now belong to the project<->subcontractor assignment
-- (project_subcontractors), not the company record itself — already
-- backfilled in the previous migration.
alter table public.subcontractors
  drop column price_eur,
  drop column price_lei,
  drop column start_date,
  drop column deadline;
