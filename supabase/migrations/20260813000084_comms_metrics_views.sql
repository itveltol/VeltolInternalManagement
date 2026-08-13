-- Communication module (Phase 3) — the four metrics from the module plan
-- (§9): ack rate, stale questions, silent projects, decisions/month.
--
-- Deliberately NOT security definer: security_invoker = true on every view
-- below, and the underlying helper functions run as the caller (no
-- `security definer`), so they execute under the calling user's own RLS,
-- not an elevated one. A viewer must not learn the portfolio's
-- communication state through a metrics view any more than through a
-- metrics card reading via the service-role client. The gate on who may
-- see the *strip* lives in the TS layer (canBroadcast()); the view/
-- function itself only ever returns what the caller's row-level policies
-- already allow them to see (their own projects' notes/receipts, or
-- everything if admin).
--
-- Each metric has a parameterized `*_as_of(p_period_end)` function so the
-- TS layer can compute the previous period with the identical predicate
-- (never inventing a delta from a different definition), and a plain view
-- — required by the module plan's "four SQL views" — that is a thin
-- `as_of(now())` wrapper, so ad-hoc querying/fixtures can hit the view
-- directly without knowing about the parameterized function underneath.

create or replace function public.v_comms_ack_rate_as_of(p_period_end timestamptz)
returns table (acknowledged_within_24h numeric, total_receipts numeric)
language sql stable as $$
  select
    count(*) filter (
      where r.acknowledged_at is not null
        and r.acknowledged_at <= n.created_at + interval '24 hours'
    )::numeric as acknowledged_within_24h,
    count(*)::numeric as total_receipts
  from note_receipts r
  join notes n on n.id = r.note_id
  where n.requires_ack = true
    and n.parent_id is null
    and n.created_at >= p_period_end - interval '30 days'
    and n.created_at < p_period_end
$$;

-- Ack rate, last 30 days: share of ack-requiring root notes' receipts
-- acknowledged within 24h of the note's own creation (its "publication").
-- One row per note_receipts row, so a note with 5 unconfirmed recipients
-- counts as 5 denominator rows, not 1 — matching "share of receipts", not
-- "share of announcements".
create or replace view public.v_comms_ack_rate
with (security_invoker = true) as
select * from public.v_comms_ack_rate_as_of(now());

create or replace function public.v_comms_stale_questions_as_of(p_period_end timestamptz)
returns table (stale_count bigint)
language sql stable as $$
  select count(*)::bigint
  from notes
  where kind in ('question', 'risk')
    and status = 'open'
    and parent_id is null
    and created_at < p_period_end - interval '7 days'
$$;

-- Open questions/risks older than 7 days — should trend down; if it
-- grows, the system is accumulating, not resolving.
create or replace view public.v_comms_stale_questions
with (security_invoker = true) as
select * from public.v_comms_stale_questions_as_of(now());

create or replace function public.v_comms_silent_projects_as_of(p_period_end timestamptz)
returns table (silent_count bigint)
language sql stable as $$
  select count(*)::bigint
  from projects p
  where p.current_phase not in ('closed', 'cancelled')
    and not exists (
      select 1 from notes n
      where n.project_id = p.id
        and n.created_at >= p_period_end - interval '30 days'
        and n.created_at < p_period_end
    )
$$;

-- Active projects (current_phase not closed/cancelled) with zero notes in
-- the trailing 30 days.
create or replace view public.v_comms_silent_projects
with (security_invoker = true) as
select * from public.v_comms_silent_projects_as_of(now());

create or replace function public.v_comms_decisions_as_of(p_period_end timestamptz)
returns table (decision_count bigint)
language sql stable as $$
  select count(*)::bigint
  from notes
  where kind = 'decision'
    and parent_id is null
    and created_at >= date_trunc('month', p_period_end)
    and created_at < p_period_end
$$;

-- Decisions recorded in the current calendar month (as of now()).
create or replace view public.v_comms_decisions
with (security_invoker = true) as
select * from public.v_comms_decisions_as_of(now());
