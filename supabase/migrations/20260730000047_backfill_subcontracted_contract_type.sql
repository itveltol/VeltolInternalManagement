-- Previously, saving a subcontracted project silently cleared contract_type
-- to '{}' because the contract-type checkboxes were hidden in the UI for
-- execution_mode = 'subcontracted'. That emptied array disabled every Gantt
-- phase (planning/execution/autorizare) for those projects, since a phase is
-- only editable when contract_type includes its required service. Now that
-- the UI shows the checkboxes for subcontracted projects too, backfill the
-- already-affected rows with the column's own long-standing default so their
-- phases become editable again without requiring a manual re-save.
update public.projects
set contract_type = array['proiectare', 'executie', 'mentenanta']::public.contract_type[]
where execution_mode = 'subcontracted'
  and contract_type = '{}';
