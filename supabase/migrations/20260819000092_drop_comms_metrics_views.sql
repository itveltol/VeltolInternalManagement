-- Remove the communication metrics dashboard strip (ack rate, stale
-- questions, silent projects, decisions/month) — feature removed, no
-- longer surfaced anywhere in the app.

drop view if exists public.v_comms_ack_rate;
drop view if exists public.v_comms_stale_questions;
drop view if exists public.v_comms_silent_projects;
drop view if exists public.v_comms_decisions;

drop function if exists public.v_comms_ack_rate_as_of(timestamptz);
drop function if exists public.v_comms_stale_questions_as_of(timestamptz);
drop function if exists public.v_comms_silent_projects_as_of(timestamptz);
drop function if exists public.v_comms_decisions_as_of(timestamptz);
