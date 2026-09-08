-- Phase 3 of the multi-contract migration: drops the contract facts that
-- lived directly on `projects` (contract_number, contract_date, value_eur,
-- value_lei, currency, conversion_rate, vat_rate, contract_type,
-- value_eur_equiv), now that:
--   1. `contracts` exists and every project has been backfilled with one
--      contract row (20260908000127_create_contracts.sql),
--   2. the app layer reads/writes these facts exclusively through
--      `contracts` (supabaseProjectsClient's attachContracts() passthrough,
--      the projects/actions.ts create/update split, the situations/
--      centralizer contract-scoped rework, and the dashboard/search/cron
--      call sites that used to query these columns directly off `projects`).
--
-- Only run this once the app deploy carrying that Phase 2 code has been live
-- for a full deploy cycle on every environment this migration applies to —
-- dropping these columns before that code is live would 500 any
-- not-yet-updated request that still reads them.
-- value_eur_equiv is a generated column derived from value_eur/value_lei
-- (20260907000126_project_value_eur_equiv_column.sql) — it must be dropped
-- explicitly before its source columns, since a single multi-column ALTER
-- TABLE does not implicitly order drops by dependency.
alter table public.projects
  drop column value_eur_equiv;

alter table public.projects
  drop column contract_number,
  drop column contract_date,
  drop column value_eur,
  drop column value_lei,
  drop column currency,
  drop column conversion_rate,
  drop column vat_rate,
  drop column contract_type;
