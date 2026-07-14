-- Reset Gantt scheduling data after fixing the BESS_TEMPLATE item_number
-- collision (BESS previously reused numbers 1-14, which already belonged to
-- PV_TEMPLATE, so scheduling one silently scheduled both). Existing
-- scheduling data was recorded under the old, colliding numbers and would
-- not line up with the renumbered template (BESS now 30-43).
--
-- This clears all Gantt scheduling (dates/team) and removes custom tasks
-- (item_number >= 44) project-wide. Checklist progress fields (plan_total,
-- zile, realizat, notes) are left untouched.
update public.project_checklist_items
set start_date = null,
    end_date   = null,
    team_id    = null
where start_date is not null
   or end_date is not null
   or team_id is not null;

delete from public.project_checklist_items
where item_number >= 44;
