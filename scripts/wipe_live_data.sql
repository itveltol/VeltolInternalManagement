-- ============================================================================
-- LIVE DATABASE DATA WIPE — ref: amitdoyqczbfdyawuxwm (.env.production)
-- ============================================================================
-- Empties all transactional/business-data tables while KEEPING:
--   - schema (tables, columns, policies, triggers, functions)
--   - profiles / auth.users (all accounts stay intact)
--   - catalog/reference tables: activities, matrice_phases,
--     matrice_activity_dependencies, cost_categories, holidays
--
-- Run this in the Supabase SQL Editor for the LIVE project only.
-- Double-check the project selector top-left says the LIVE project
-- (amitdoyqczbfdyawuxwm), NOT staging (sxwqjjvmkaibcwaichfp), before running.
--
-- TRUNCATE ... RESTART IDENTITY CASCADE:
--   - RESTART IDENTITY resets bigint/serial id sequences back to 1
--   - CASCADE follows FKs to any dependent rows in the same statement's
--     table list (safe here since all listed tables are being wiped together)
-- ============================================================================

begin;

truncate table
  public.activity_events,
  public.note_reminders_sent,
  public.note_receipts,
  public.note_pins,
  public.note_mentions,
  public.notes,
  public.notifications,
  public.team_schedule_notes,
  public.team_schedule_entries,
  public.team_members,
  public.teams,
  public.situations,
  public.project_subcontractors,
  public.subcontractors,
  public.project_budget_lines,
  public.project_billing,
  public.suppliers,
  public.exchange_rates,
  public.project_maintenance_checks,
  public.project_execution_data,
  public.project_structure_config,
  public.project_cef_data,
  public.project_bess_data,
  public.project_activity_status,
  public.checklist_activity_map,
  public.checklist_daily_log,
  public.project_checklist_items,
  public.documents,
  public.vacation_requests,
  public.hidden_projects,
  public.shown_projects,
  public.clients,
  public.projects
  restart identity cascade;

commit;

-- ============================================================================
-- Sanity check: everything above should show 0 rows, catalog tables should not.
-- ============================================================================
select 'projects' t, count(*) from public.projects
union all select 'documents', count(*) from public.documents
union all select 'situations', count(*) from public.situations
union all select 'clients', count(*) from public.clients
union all select 'notes', count(*) from public.notes
union all select 'profiles (kept)', count(*) from public.profiles
union all select 'activities (kept)', count(*) from public.activities
union all select 'matrice_phases (kept)', count(*) from public.matrice_phases
union all select 'holidays (kept)', count(*) from public.holidays
union all select 'cost_categories (kept)', count(*) from public.cost_categories;
