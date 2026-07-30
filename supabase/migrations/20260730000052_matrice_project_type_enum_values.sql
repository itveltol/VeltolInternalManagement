-- The `project_type` enum (used by activities.applies_to) was seeded with
-- Romanian-phrase values ('CEF cu BESS', 'BESS in CEF existent',
-- 'BESS Stand-alone') that never match what the app actually writes to
-- projects.project_type (a plain `text` column fed by the project-type
-- dropdown: 'CEF', 'CEF+BESS', 'BESS', 'BESS_CEF', 'EMS', 'SCADA'). This
-- meant the Matrice auto-N/A trigger never matched a real project.
--
-- Add the real (dropdown) values to the enum here; the follow-up migration
-- corrects the activities.applies_to data and backfills existing projects.
-- Split into its own migration because ALTER TYPE ... ADD VALUE cannot be
-- used in the same transaction that adds it.
alter type project_type add value if not exists 'CEF+BESS';
alter type project_type add value if not exists 'BESS';
alter type project_type add value if not exists 'BESS_CEF';
alter type project_type add value if not exists 'EMS';
alter type project_type add value if not exists 'SCADA';
